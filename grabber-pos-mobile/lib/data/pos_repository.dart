import 'package:supabase_flutter/supabase_flutter.dart';
import 'models/product.dart';
import 'models/sale.dart';
import 'models/cart.dart';
import 'offline_queue.dart';

class CatalogPage {
  final List<Product> items;
  final int total;
  final List<({String name, int count})> categories;
  const CatalogPage(this.items, this.total, this.categories);
}

/// Result of attempting to post a sale: either it reached the server, or it
/// was safely queued for later sync.
class SaleResult {
  final Sale? sale;
  final bool queuedOffline;
  const SaleResult({this.sale, required this.queuedOffline});
}

class PosRepository {
  PosRepository(this._db, this._queue);

  final SupabaseClient _db;
  final OfflineQueue _queue;
  String? _branchId;

  Future<String> _branch() async {
    if (_branchId != null) return _branchId!;
    final row = await _db
        .from('branches')
        .select('id')
        .eq('is_active', true)
        .order('created_at')
        .limit(1)
        .maybeSingle();
    if (row == null) throw StateError('No branch for this account');
    return _branchId = row['id'] as String;
  }

  Future<CatalogPage> catalog({
    String? search,
    String? category,
    int page = 1,
    int pageSize = 60,
  }) async {
    final branch = await _branch();
    final data =
        await _db.rpc(
              'catalog',
              params: {
                'p_branch': branch,
                'p_search': search,
                'p_category': category,
                'p_page': page,
                'p_page_size': pageSize,
              },
            )
            as Map<String, dynamic>;

    final items = (data['items'] as List)
        .map((e) => Product.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    final cats = (data['categories'] as List)
        .map(
          (e) =>
              (name: e['name'] as String, count: (e['count'] as num).toInt()),
        )
        .toList();
    return CatalogPage(items, (data['total'] as num).toInt(), cats);
  }

  Future<Product?> productByBarcode(String code) async {
    final branch = await _branch();
    final data = await _db.rpc(
      'product_by_barcode',
      params: {'p_branch': branch, 'p_code': code},
    );
    if (data == null) return null;
    return Product.fromJson((data as Map).cast<String, dynamic>());
  }

  /// Post a sale. On any network error the sale is persisted to the offline
  /// queue and reported as queued — the cashier is never blocked.
  Future<SaleResult> createSale({
    required List<CartLine> lines,
    required String paymentMethod,
    double? cashReceived,
    required String clientUuid,
  }) async {
    final branch = await _branch();
    final payload = {
      'branch_id': branch,
      'client_uuid': clientUuid,
      'payment_method': paymentMethod,
      'cash_received': cashReceived,
      'lines': lines
          .map(
            (l) => {
              'product_id': l.product.id,
              'quantity': l.quantity,
              'discount': l.discount,
            },
          )
          .toList(),
    };

    try {
      final data = await _db.rpc('create_sale', params: {'payload': payload});
      return SaleResult(
        sale: Sale.fromJson((data as Map).cast<String, dynamic>()),
        queuedOffline: false,
      );
    } on PostgrestException {
      // A real business-rule rejection (stock/discount/cash) — surface it.
      rethrow;
    } catch (_) {
      // Network/transport failure — queue and let the syncer retry.
      await _queue.enqueue(
        QueuedSale(
          clientUuid: clientUuid,
          payload: payload,
          queuedAt: DateTime.now(),
        ),
      );
      return const SaleResult(queuedOffline: true);
    }
  }

  /// Flush queued offline sales. Idempotent server-side, so safe to call often.
  Future<int> syncOfflineSales() async {
    final pending = await _queue.all();
    var synced = 0;
    for (final item in pending) {
      try {
        await _db.rpc('create_sale', params: {'payload': item.payload});
        await _queue.remove(item.clientUuid);
        synced++;
      } on PostgrestException {
        // Permanent rejection — drop it so the queue can't wedge forever.
        await _queue.remove(item.clientUuid);
      } catch (_) {
        break; // Still offline; stop and retry later.
      }
    }
    return synced;
  }

  Future<List<Sale>> recentSales({int limit = 50}) async {
    final rows = await _db
        .from('sales')
        .select(
          'id, receipt_no, created_at, total, change_due, payment_method, sale_lines(name, unit_price, quantity, discount, line_total)',
        )
        .order('created_at', ascending: false)
        .limit(limit);
    return (rows as List)
        .map((e) => Sale.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }
}
