import 'package:flutter_test/flutter_test.dart';
import 'package:grabber_pos_mobile/data/models/cart.dart';
import 'package:grabber_pos_mobile/data/models/product.dart';

Product _product({
  String id = 'P1',
  double salePrice = 100,
  double maxDiscount = 0,
}) {
  return Product(
    id: id,
    name: 'Test $id',
    barcodes: const [],
    costPrice: 50,
    salePrice: salePrice,
    maxDiscount: maxDiscount,
    singleDiscount: 0,
    quantity: 10,
    category: 'Test',
    warrantyMonths: 0,
  );
}

void main() {
  group('CartTotals', () {
    test('sums line totals with no discount', () {
      final lines = [
        CartLine(product: _product(salePrice: 100), quantity: 2, discount: 0),
        CartLine(
          product: _product(id: 'P2', salePrice: 50),
          quantity: 1,
          discount: 0,
        ),
      ];
      final totals = CartTotals.of(lines);
      expect(totals.subtotal, 250);
      expect(totals.discountTotal, 0);
      expect(totals.total, 250);
    });

    test('applies per-unit discount to the total', () {
      final lines = [
        CartLine(
          product: _product(salePrice: 100, maxDiscount: 20),
          quantity: 3,
          discount: 10,
        ),
      ];
      final totals = CartTotals.of(lines);
      expect(totals.subtotal, 300);
      expect(totals.discountTotal, 30);
      expect(totals.total, 270);
    });

    test('empty cart is zero', () {
      final totals = CartTotals.of(const []);
      expect(totals.total, 0);
    });
  });

  group('Product.fromJson', () {
    test('parses catalog JSON from the RPC', () {
      final p = Product.fromJson({
        'id': 'P00001',
        'name': 'Air Freshener',
        'barcodes': ['890', '891'],
        'costPrice': 260.87,
        'salePrice': 300,
        'maxDiscount': 50,
        'singleDiscount': 0,
        'quantity': 4,
        'category': 'Air Freshener',
        'warrantyMonths': 36,
      });
      expect(p.id, 'P00001');
      expect(p.barcodes, hasLength(2));
      expect(p.salePrice, 300);
      expect(p.quantity, 4);
    });
  });
}
