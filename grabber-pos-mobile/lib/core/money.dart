import 'package:intl/intl.dart';

final _lkr = NumberFormat.currency(
  locale: 'en_LK',
  symbol: 'Rs ',
  decimalDigits: 2,
);

String formatMoney(num amount) => _lkr.format(amount);

String formatDateTime(DateTime dt) =>
    DateFormat('dd MMM, HH:mm').format(dt.toLocal());
