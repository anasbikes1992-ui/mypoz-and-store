class SaleLine {
  final String name;
  final double unitPrice;
  final num quantity;
  final double discount;
  final double lineTotal;

  const SaleLine({
    required this.name,
    required this.unitPrice,
    required this.quantity,
    required this.discount,
    required this.lineTotal,
  });

  factory SaleLine.fromJson(Map<String, dynamic> j) => SaleLine(
    name: j['name'] as String,
    unitPrice: (j['unit_price'] as num).toDouble(),
    quantity: j['quantity'] as num,
    discount: (j['discount'] as num).toDouble(),
    lineTotal: (j['line_total'] as num).toDouble(),
  );
}

class Sale {
  final String id;
  final String receiptNo;
  final DateTime createdAt;
  final double total;
  final double? changeDue;
  final String paymentMethod;
  final List<SaleLine> lines;

  const Sale({
    required this.id,
    required this.receiptNo,
    required this.createdAt,
    required this.total,
    required this.changeDue,
    required this.paymentMethod,
    required this.lines,
  });

  factory Sale.fromJson(Map<String, dynamic> j) => Sale(
    id: j['id'] as String,
    receiptNo: (j['receipt_no'] ?? j['id']) as String,
    createdAt: DateTime.parse(j['created_at'] as String),
    total: (j['total'] as num).toDouble(),
    changeDue: (j['change_due'] as num?)?.toDouble(),
    paymentMethod: j['payment_method'] as String,
    lines: (j['lines'] as List? ?? j['sale_lines'] as List? ?? [])
        .map((e) => SaleLine.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}
