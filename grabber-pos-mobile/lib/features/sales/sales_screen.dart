import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/money.dart';
import '../../core/theme.dart';
import '../../data/models/sale.dart';
import '../../state/providers.dart';

final _recentSalesProvider = FutureProvider.autoDispose<List<Sale>>(
  (ref) => ref.read(repositoryProvider).recentSales(),
);

class SalesScreen extends ConsumerWidget {
  const SalesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sales = ref.watch(_recentSalesProvider);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.surface1,
        title: const Text('Sales'),
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(_recentSalesProvider),
        child: sales.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Could not load sales:\n$e',
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
          data: (list) => list.isEmpty
              ? const Center(child: Text('No sales yet'))
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) => _SaleTile(sale: list[i]),
                ),
        ),
      ),
    );
  }
}

class _SaleTile extends StatelessWidget {
  const _SaleTile({required this.sale});
  final Sale sale;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.line),
      ),
      child: ExpansionTile(
        shape: const Border(),
        title: Text(
          sale.receiptNo,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          '${formatDateTime(sale.createdAt)} · ${sale.paymentMethod} · ${sale.lines.length} lines',
          style: const TextStyle(color: AppTheme.textDim, fontSize: 12),
        ),
        trailing: Text(
          formatMoney(sale.total),
          style: const TextStyle(
            color: AppTheme.accent,
            fontWeight: FontWeight.w600,
          ),
        ),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        children: [
          for (final l in sale.lines)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      '${l.quantity} × ${l.name}',
                      style: const TextStyle(color: AppTheme.textDim),
                    ),
                  ),
                  Text(formatMoney(l.lineTotal)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
