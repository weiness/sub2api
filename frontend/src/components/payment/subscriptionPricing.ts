export function normalizeSubscriptionMultiplier(value: unknown): number {
  const multiplier = Number(value)
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 0
}

export function subscriptionDisplayPrice(price: number, multiplier: unknown): number {
  const normalizedMultiplier = normalizeSubscriptionMultiplier(multiplier)
  return normalizedMultiplier > 0 ? price / normalizedMultiplier : price
}
