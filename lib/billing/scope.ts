// Recognise configured prices and historical Fellow subscriptions after price migration.
const legacy = new Set(['price_1UJDtkJz8aAWdovW1SzsDFzG','price_1UJDulJz8aAWdovWnoCYcYPC','price_1UJDvcJz8aAWdovWouFjWTIb','price_1UJDw6Jz8aAWdovWdnaIG0bo']);
export function isFellowSubscription(sub: {metadata?:Record<string,string>;items:{data:{price?:{id?:string}}[]}}) {
  if(sub.metadata?.app && sub.metadata.app !== 'fellow') return false
  const prices = new Set([...legacy,process.env.STRIPE_PRO_PRICE_ID,process.env.STRIPE_PRO_MONTHLY_PRICE_ID,process.env.STRIPE_PRO_ANNUAL_PRICE_ID,process.env.STRIPE_SCHOOL_PRICE_ID,process.env.STRIPE_SCHOOL_MONTHLY_PRICE_ID,process.env.STRIPE_SCHOOL_ANNUAL_PRICE_ID,process.env.STRIPE_SCHOOL_EXTRA_SEAT_PRICE_ID].filter(Boolean))
  return sub.items.data.some(item=>Boolean(item.price?.id && prices.has(item.price.id)))
}
