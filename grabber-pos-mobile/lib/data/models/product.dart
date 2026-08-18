class Product {
  final String id;
  final String name;
  final String? nameLocal;
  final List<String> barcodes;
  final String? brand;
  final double costPrice;
  final double salePrice;
  final double? wholesalePrice;
  final double maxDiscount;
  final double singleDiscount;
  final num quantity;
  final String category;
  final String? expireDate;
  final int warrantyMonths;
  final String? supplier;

  const Product({
    required this.id,
    required this.name,
    this.nameLocal,
    required this.barcodes,
    this.brand,
    required this.costPrice,
    required this.salePrice,
    this.wholesalePrice,
    required this.maxDiscount,
    required this.singleDiscount,
    required this.quantity,
    required this.category,
    this.expireDate,
    required this.warrantyMonths,
    this.supplier,
  });

  factory Product.fromJson(Map<String, dynamic> j) => Product(
    id: j['id'] as String,
    name: j['name'] as String,
    nameLocal: j['nameLocal'] as String?,
    barcodes: (j['barcodes'] as List?)?.cast<String>() ?? const [],
    brand: j['brand'] as String?,
    costPrice: _d(j['costPrice']),
    salePrice: _d(j['salePrice']),
    wholesalePrice: j['wholesalePrice'] == null
        ? null
        : _d(j['wholesalePrice']),
    maxDiscount: _d(j['maxDiscount']),
    singleDiscount: _d(j['singleDiscount']),
    quantity: (j['quantity'] as num?) ?? 0,
    category: j['category'] as String? ?? 'Uncategorized',
    expireDate: j['expireDate'] as String?,
    warrantyMonths: (j['warrantyMonths'] as num?)?.toInt() ?? 0,
    supplier: j['supplier'] as String?,
  );

  static double _d(dynamic v) => (v as num?)?.toDouble() ?? 0;
}
