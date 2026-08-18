import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// A sale that was created on the device and still needs to reach Supabase.
/// Each carries a stable [clientUuid] so re-sending after a crash or timeout
/// can never double-post (the server RPC is idempotent on that key).
class QueuedSale {
  final String clientUuid;
  final Map<String, dynamic> payload;
  final DateTime queuedAt;

  QueuedSale({
    required this.clientUuid,
    required this.payload,
    required this.queuedAt,
  });

  Map<String, dynamic> toJson() => {
    'clientUuid': clientUuid,
    'payload': payload,
    'queuedAt': queuedAt.toIso8601String(),
  };

  factory QueuedSale.fromJson(Map<String, dynamic> j) => QueuedSale(
    clientUuid: j['clientUuid'] as String,
    payload: (j['payload'] as Map).cast<String, dynamic>(),
    queuedAt: DateTime.parse(j['queuedAt'] as String),
  );
}

/// Durable FIFO queue backed by shared_preferences. Survives app restarts.
class OfflineQueue {
  static const _key = 'grabber_pos_offline_sales';

  Future<List<QueuedSale>> all() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return [];
    final list = jsonDecode(raw) as List;
    return list
        .map((e) => QueuedSale.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
  }

  Future<void> _save(List<QueuedSale> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _key,
      jsonEncode(items.map((e) => e.toJson()).toList()),
    );
  }

  Future<void> enqueue(QueuedSale sale) async {
    final items = await all();
    items.add(sale);
    await _save(items);
  }

  Future<void> remove(String clientUuid) async {
    final items = await all();
    items.removeWhere((s) => s.clientUuid == clientUuid);
    await _save(items);
  }

  Future<int> get length async => (await all()).length;
}
