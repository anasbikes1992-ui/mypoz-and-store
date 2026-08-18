const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return !!value && UUID_RE.test(value);
}

export interface ParsedCommerceLine {
  productId: string;
  variantId: string | null;
  variantSku: string | null;
}

/** POS and storefront both encode variants as `productId:variantId|sku`. */
export function parseCommerceLineId(raw: string): ParsedCommerceLine {
  const colon = raw.indexOf(":");
  if (colon <= 0) {
    return { productId: raw, variantId: null, variantSku: null };
  }
  const productId = raw.slice(0, colon);
  const rest = raw.slice(colon + 1);
  if (!rest) return { productId, variantId: null, variantSku: null };
  if (isUuid(rest)) return { productId, variantId: rest, variantSku: null };
  return { productId, variantId: null, variantSku: rest };
}

export function commerceLineKey(
  productId: string,
  variantId?: string | null,
  variantSku?: string | null,
): string {
  if (variantId) return `${productId}:${variantId}`;
  if (variantSku) return `${productId}:${variantSku}`;
  return productId;
}

export interface VariantOptionAxis {
  name: string;
  values: string[];
}

export interface CartesianVariant {
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  skuHint: string;
}

/** Size × Color → Black / S, Black / M, … */
export function cartesianVariants(axes: VariantOptionAxis[]): CartesianVariant[] {
  const cleaned = axes
    .map((a) => ({
      name: a.name.trim(),
      values: [...new Set(a.values.map((v) => v.trim()).filter(Boolean))],
    }))
    .filter((a) => a.name && a.values.length);
  if (!cleaned.length) return [];

  let combos: string[][] = [[]];
  for (const axis of cleaned) {
    const next: string[][] = [];
    for (const prefix of combos) {
      for (const value of axis.values) next.push([...prefix, value]);
    }
    combos = next;
  }

  return combos.map((values) => {
    const title = values.join(" / ");
    return {
      title,
      option1: values[0] ?? null,
      option2: values[1] ?? null,
      option3: values[2] ?? null,
      skuHint: values
        .map((v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
        .join("-"),
    };
  });
}

export function groupVariantOptions(
  variants: { option1?: string | null; option2?: string | null; option3?: string | null; title: string }[],
): { option1: string[]; option2: string[]; option3: string[] } {
  const o1 = new Set<string>();
  const o2 = new Set<string>();
  const o3 = new Set<string>();
  for (const v of variants) {
    if (v.option1) o1.add(v.option1);
    if (v.option2) o2.add(v.option2);
    if (v.option3) o3.add(v.option3);
  }
  return {
    option1: [...o1],
    option2: [...o2],
    option3: [...o3],
  };
}

export function findVariantByOptions<
  T extends {
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
  },
>(
  variants: T[],
  pick: { option1?: string | null; option2?: string | null; option3?: string | null },
): T | null {
  return (
    variants.find(
      (v) =>
        (v.option1 ?? null) === (pick.option1 ?? null) &&
        (v.option2 ?? null) === (pick.option2 ?? null) &&
        (v.option3 ?? null) === (pick.option3 ?? null),
    ) ?? null
  );
}
