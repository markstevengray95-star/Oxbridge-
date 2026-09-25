import type Stripe from "stripe"
import { displayPrice, stripePriceForTier, type BillingInterval } from "./plans"

/** Keep the amount server-controlled and shared with the pricing page. */
export function checkoutLineItem(tier: "pro" | "school", interval: BillingInterval): Stripe.Checkout.SessionCreateParams.LineItem {
  const price = stripePriceForTier(tier, interval).trim()
  if (price) return { price, quantity: 1 }

  const unitAmount = Math.round(displayPrice(tier, interval) * 100)
  if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
    throw new Error("A paid plan must have a positive price in pence.")
  }

  // Price IDs are optional: Stripe supports recurring inline prices.
  // Subscription metadata still identifies the tier for webhook fulfilment.
  return {
    quantity: 1,
    price_data: {
      currency: "gbp",
      unit_amount: unitAmount,
      recurring: { interval: interval === "annual" ? "year" : "month" },
      product_data: {
        name: tier === "pro" ? "ScholarBridge Pro" : "ScholarBridge School",
        metadata: { tier },
      },
    },
  }
}
