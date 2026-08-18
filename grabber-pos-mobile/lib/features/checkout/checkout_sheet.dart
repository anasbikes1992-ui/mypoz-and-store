import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../../core/money.dart';
import '../../core/theme.dart';
import '../../data/pos_repository.dart';
import '../../state/cart_controller.dart';
import '../../state/providers.dart';

Future<void> showCheckoutSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppTheme.surface1,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => const _CheckoutSheet(),
  );
}

class _CheckoutSheet extends ConsumerStatefulWidget {
  const _CheckoutSheet();

  @override
  ConsumerState<_CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends ConsumerState<_CheckoutSheet> {
  static const _methods = ['cash', 'card', 'wholesale'];
  String _method = 'cash';
  final _cashCtrl = TextEditingController();
  bool _pending = false;
  String? _error;

  @override
  void dispose() {
    _cashCtrl.dispose();
    super.dispose();
  }

  Future<void> _confirm() async {
    final lines = ref.read(cartProvider);
    final totals = ref.read(cartTotalsProvider);
    final cash = double.tryParse(_cashCtrl.text) ?? 0;

    if (_method == 'cash' && cash < totals.total) {
      setState(() => _error = 'Cash received is less than the total');
      return;
    }

    setState(() {
      _pending = true;
      _error = null;
    });

    try {
      final result = await ref
          .read(repositoryProvider)
          .createSale(
            lines: lines,
            paymentMethod: _method,
            cashReceived: _method == 'cash' ? cash : null,
            clientUuid: const Uuid().v4(),
          );
      ref.read(cartProvider.notifier).clear();
      if (!mounted) return;
      Navigator.pop(context);
      _showResult(result, cash - totals.total);
    } on PostgrestException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  void _showResult(SaleResult result, double change) {
    final messenger = ScaffoldMessenger.of(context);
    if (result.queuedOffline) {
      messenger.showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.warn,
          content: Text(
            'Offline — sale saved and will sync automatically',
            style: TextStyle(color: Colors.black),
          ),
        ),
      );
    } else {
      messenger.showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.accent,
          content: Text(
            'Sale ${result.sale?.receiptNo ?? ''} complete'
            '${_method == 'cash' && change > 0 ? ' · change ${formatMoney(change)}' : ''}',
            style: const TextStyle(color: AppTheme.accentInk),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final totals = ref.watch(cartTotalsProvider);
    final cash = double.tryParse(_cashCtrl.text) ?? 0;
    final change = cash - totals.total;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Take payment',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            formatMoney(totals.total),
            style: const TextStyle(
              fontSize: 30,
              fontWeight: FontWeight.bold,
              color: AppTheme.accent,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              for (final m in _methods)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: OutlinedButton(
                      onPressed: () => setState(() => _method = m),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: _method == m
                            ? AppTheme.accent.withValues(alpha: 0.12)
                            : null,
                        side: BorderSide(
                          color: _method == m ? AppTheme.accent : AppTheme.line,
                        ),
                      ),
                      child: Text(
                        m[0].toUpperCase() + m.substring(1),
                        style: TextStyle(
                          color: _method == m
                              ? AppTheme.accent
                              : AppTheme.textDim,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
          if (_method == 'cash') ...[
            const SizedBox(height: 16),
            TextField(
              controller: _cashCtrl,
              keyboardType: TextInputType.number,
              autofocus: true,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Cash received'),
            ),
            const SizedBox(height: 8),
            Text(
              'Change: ${formatMoney(change > 0 ? change : 0)}',
              style: TextStyle(
                color: change < 0 ? AppTheme.danger : AppTheme.textDim,
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppTheme.danger)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _pending || (_method == 'cash' && change < 0)
                ? null
                : _confirm,
            child: Text(_pending ? 'Processing…' : 'Confirm sale'),
          ),
        ],
      ),
    );
  }
}
