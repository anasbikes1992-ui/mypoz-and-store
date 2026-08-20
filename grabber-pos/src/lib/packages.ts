/**
 * Package expand — turn a pack definition into POS cart lines whose unit
 * prices sum (× qty) to the pack price.
 */

export interface PackageItem {
  productId: string;
  qty: number;
}

export interface PackageRecord {
  name: string;
  price: number;
  /** Legacy single-item pack. */
  productId?: string;
  qty?: number;
  /** Multi-item pack (preferred when present). */
  items?: PackageItem[];
}

export interface ExpandedLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ExpandResult {
  name: string;
  price: number;
  lines: ExpandedLine[];
}

export type ProductLookup = (id: string) => {
  name: string;
  salePrice: number;
} | null;

function resolveItems(pack: PackageRecord): PackageItem[] {
  if (Array.isArray(pack.items) && pack.items.length > 0) {
    return pack.items.map((i) => ({
      productId: String(i.productId),
      qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
    }));
  }
  if (pack.productId?.trim()) {
    return [
      {
        productId: pack.productId.trim(),
        qty: Math.max(1, Math.floor(Number(pack.qty) || 1)),
      },
    ];
  }
  return [];
}

/**
 * Expand a package into priced cart lines. Catalog prices weight the
 * distribution; remainder cents land on the last line so totals match.
 */
export function expandPackage(
  pack: PackageRecord,
  lookup: ProductLookup,
): ExpandResult {
  const name = (pack.name || "Package").trim() || "Package";
  const price = Math.max(0, Number(pack.price) || 0);
  const items = resolveItems(pack);
  if (items.length === 0) {
    throw new Error("Package has no items");
  }

  const resolved = items.map((item) => {
    const product = lookup(item.productId);
    if (!product) {
      throw new Error(`Unknown product: ${item.productId}`);
    }
    const catalog = Math.max(0, Number(product.salePrice) || 0) * item.qty;
    return {
      productId: item.productId,
      name: product.name,
      quantity: item.qty,
      catalog,
    };
  });

  const catalogTotal = resolved.reduce((s, r) => s + r.catalog, 0);
  const lines: ExpandedLine[] = [];
  let allocated = 0;

  for (let i = 0; i < resolved.length; i++) {
    const r = resolved[i];
    const isLast = i === resolved.length - 1;
    let lineTotal: number;
    if (isLast) {
      lineTotal = Number((price - allocated).toFixed(2));
    } else if (catalogTotal > 0) {
      lineTotal = Number(((r.catalog / catalogTotal) * price).toFixed(2));
      allocated += lineTotal;
    } else {
      lineTotal = Number((price / resolved.length).toFixed(2));
      allocated += lineTotal;
    }
    const unitPrice =
      r.quantity > 0 ? Number((lineTotal / r.quantity).toFixed(4)) : lineTotal;
    lines.push({
      productId: r.productId,
      name: r.name,
      quantity: r.quantity,
      unitPrice,
    });
  }

  return { name, price, lines };
}
