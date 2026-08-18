import 'product.dart';

class CartLine {
  final Product product;
  final int quantity;
  final double discount;

  const CartLine({
    required this.product,
    required this.quantity,
    required this.discount,
  });

  double get unitPrice => product.salePrice;
  double get lineTotal => (unitPrice - discount) * quantity;

  CartLine copyWith({int? quantity, double? discount}) => CartLine(
    product: product,
    quantity: quantity ?? this.quantity,
    discount: discount ?? this.discount,
  );
}

class CartTotals {
  final double subtotal;
  final double discountTotal;
  final double total;
  const CartTotals(this.subtotal, this.discountTotal, this.total);

  factory CartTotals.of(List<CartLine> lines) {
    var sub = 0.0, disc = 0.0;
    for (final l in lines) {
      sub += l.unitPrice * l.quantity;
      disc += l.discount * l.quantity;
    }
    return CartTotals(sub, disc, sub - disc);
  }
}
