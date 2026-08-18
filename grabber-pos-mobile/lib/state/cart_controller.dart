import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/cart.dart';
import '../data/models/product.dart';

class CartController extends Notifier<List<CartLine>> {
  @override
  List<CartLine> build() => const [];

  void add(Product product) {
    final idx = state.indexWhere((l) => l.product.id == product.id);
    if (idx >= 0) {
      setQuantity(product.id, state[idx].quantity + 1);
    } else {
      state = [
        ...state,
        CartLine(
          product: product,
          quantity: 1,
          discount: product.singleDiscount
              .clamp(0, product.maxDiscount)
              .toDouble(),
        ),
      ];
    }
  }

  void setQuantity(String productId, int quantity) {
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    state = [
      for (final l in state)
        if (l.product.id == productId) l.copyWith(quantity: quantity) else l,
    ];
  }

  void setDiscount(String productId, double discount) {
    state = [
      for (final l in state)
        if (l.product.id == productId)
          l.copyWith(
            discount: discount.clamp(0, l.product.maxDiscount).toDouble(),
          )
        else
          l,
    ];
  }

  void remove(String productId) {
    state = state.where((l) => l.product.id != productId).toList();
  }

  void clear() => state = const [];
}

final cartProvider = NotifierProvider<CartController, List<CartLine>>(
  CartController.new,
);

final cartTotalsProvider = Provider<CartTotals>(
  (ref) => CartTotals.of(ref.watch(cartProvider)),
);
