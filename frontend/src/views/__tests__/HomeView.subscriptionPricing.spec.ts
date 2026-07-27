import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { subscriptionDisplayPrice } from '@/components/payment/subscriptionPricing'

const homeViewSource = readFileSync(resolve(__dirname, '../HomeView.vue'), 'utf8')
const paymentAPISource = readFileSync(resolve(__dirname, '../../api/payment.ts'), 'utf8')

describe('HomeView subscription pricing', () => {
  it('uses the subscription multiplier for the displayed price and original price', () => {
    expect(subscriptionDisplayPrice(100, 10)).toBe(10)
    expect(subscriptionDisplayPrice(200, 10)).toBe(20)
    expect(subscriptionDisplayPrice(100, 0)).toBe(100)
    expect(homeViewSource).toContain('subscriptionDisplayPrice(price, subscriptionMultiplier.value)')
    expect(homeViewSource).toContain('selectedPlanDisplayPrice')
    expect(homeViewSource).toContain('selectedPlanDisplayOriginalPrice')
    expect(homeViewSource).toContain("currencySymbol('CNY')")
  })

  it('declares the multiplier returned by the landing API', () => {
    expect(paymentAPISource).toContain('subscription_cny_to_usd_multiplier: number')
  })
})
