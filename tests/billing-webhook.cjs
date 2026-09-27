const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
let event
const writes = []
const admin = { from: table => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: null }),
  insert: async row => { writes.push({ table, row }); return { error: null } },
  upsert: async (row, options) => { writes.push({ table, row, options }); return { error: null } },
}) }
const exportsObject = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/billing/webhook/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject, console, process: { env: { STRIPE_WEBHOOK_SECRET: 'mock' } },
  require: name => ({ 'node:crypto': require('node:crypto'),
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/supabase/admin': { createAdminClient: () => admin },
    '@/lib/stripe/server': { getStripe: () => ({ webhooks: { constructEvent: () => event } }) },
    '@/lib/billing/plans': { liveCreditPackMinutes: () => 30 },
  })[name],
})
async function main() {
  const session = { id: 'cs_test', payment_status: 'unpaid', metadata: { kind: 'live_credit_pack', supabase_user_id: 'user-1' } }
  const request = { headers: new Headers({ 'stripe-signature': 'mock' }), text: async () => '{}' }
  event = { id: 'evt_completed', type: 'checkout.session.completed', data: { object: session } }
  assert.equal((await exportsObject.POST(request)).status, 200)
  assert.equal(writes.filter(write => write.table === 'usage_events').length, 0)
  session.payment_status = 'paid'
  event.id = 'evt_paid'; event.type = 'checkout.session.async_payment_succeeded'
  assert.equal((await exportsObject.POST(request)).status, 200)
  assert.equal(writes.find(write => write.table === 'usage_events').row.quantity, 30)
  session.metadata.kind = 'human_interview_review'
  assert.equal((await exportsObject.POST(request)).status, 200)
  assert.equal(writes.find(write => write.table === 'human_review_orders').options.ignoreDuplicates, true)
  console.log('PASS: unpaid add-ons withheld, delayed payment fulfilled, completed human reviews protected on replay')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
