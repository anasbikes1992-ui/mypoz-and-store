export interface DiscountPolicy {
  maxCashierDiscountPercent: number; // e.g. 10%
  supervisorPin: string; // default "1234"
}

export const DEFAULT_DISCOUNT_POLICY: DiscountPolicy = {
  maxCashierDiscountPercent: 10,
  supervisorPin: "1234",
};

export function requiresSupervisorPin(
  discountAmount: number,
  originalPrice: number,
  policy: DiscountPolicy = DEFAULT_DISCOUNT_POLICY,
): boolean {
  if (originalPrice <= 0) return false;
  const percent = (discountAmount / originalPrice) * 100;
  return percent > policy.maxCashierDiscountPercent;
}

export function verifySupervisorPin(
  pin: string,
  policy: DiscountPolicy = DEFAULT_DISCOUNT_POLICY,
): boolean {
  return pin.trim() === policy.supervisorPin;
}
