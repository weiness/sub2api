export function normalizeSubscriptionMultiplier(value: unknown): number {
  const multiplier = Number(value)
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 0
}

export function subscriptionDisplayPrice(price: number, multiplier: unknown): number {
  const normalizedMultiplier = normalizeSubscriptionMultiplier(multiplier)
  return normalizedMultiplier > 0 ? price / normalizedMultiplier : price
}

function roundSubscriptionDisplayPrice(price: number, multiplier: number): number {
  const displayPrice = subscriptionDisplayPrice(price, multiplier)
  return multiplier > 0 ? Math.round(displayPrice * 100) / 100 : displayPrice
}

export function subscriptionDiscountPercent(
  price: number,
  originalPrice: number | undefined,
  multiplier: unknown,
): number {
  const normalizedMultiplier = normalizeSubscriptionMultiplier(multiplier)
  const paid = roundSubscriptionDisplayPrice(price, normalizedMultiplier)
  const original = roundSubscriptionDisplayPrice(originalPrice || 0, normalizedMultiplier)
  if (!Number.isFinite(paid) || !Number.isFinite(original) || paid < 0 || original <= paid) return 0
  return Math.round((1 - paid / original) * 100)
}
