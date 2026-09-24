const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')
const env = {}
let checkout, customerCreated = false, signedIn = true
const subscriptionQuery = { select(){return this}, eq(){return this}, async maybeSingle(){return {data:{stripe_customer_id:'cus_existing'}}} }
const client = {auth:{getClaims:async()=>({data:{claims:signedIn?{sub:'user-1'}:null}}),getUser:async()=>({data:{user:{email:'test@example.invalid'}}})}}
const stripe = {customers:{create:async()=>{customerCreated=true; return {id:'cus_new'}}},checkout:{sessions:{create:async params=>{checkout=params; return {url:'https://checkout.stripe.com/test'}}}}}
const mocks = {
 'next/server':{NextResponse:{redirect:(url,status)=>({url:String(url),status})}},
 '@/lib/supabase/server':{createClient:async()=>client},
 '@/lib/supabase/admin':{createAdminClient:()=>({from:()=>subscriptionQuery})},
 '@/lib/stripe/server':{getStripe:()=>stripe,isStripeConfigured:()=>Boolean(env.STRIPE_SECRET_KEY?.trim())},
}
function load(file){const exports={}; const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(source,{exports,process:{env},console,URL,require:name=>{if(mocks[name])return mocks[name];return load(path.resolve(name.startsWith('@/')?'.':path.dirname(file),name.replace(/^@\//,'')+'.ts'))}});return exports}
const {checkoutLineItem}=load('lib/billing/checkout.ts')
for(const [tier,interval,amount,period] of [['pro','monthly',1499,'month'],['pro','annual',11900,'year'],['school','monthly',5900,'month'],['school','annual',49900,'year']]){
 const item=checkoutLineItem(tier,interval);assert.equal(item.price_data.unit_amount,amount);assert.equal(item.price_data.recurring.interval,period);assert.equal(item.price_data.currency,'gbp')
}
env.STRIPE_PRO_PRICE_ID=' price_existing ';assert.equal(checkoutLineItem('pro','monthly').price,'price_existing');assert.equal(checkoutLineItem('pro','annual').price_data.recurring.interval,'year');delete env.STRIPE_PRO_PRICE_ID
env.PRO_MONTHLY_PRICE_GBP='19.95';assert.equal(checkoutLineItem('pro','monthly').price_data.unit_amount,1995);env.PRO_MONTHLY_PRICE_GBP='0';assert.throws(()=>checkoutLineItem('pro','monthly'));delete env.PRO_MONTHLY_PRICE_GBP
async function main(){const {POST}=load('app/api/billing/checkout/route.ts');const request={url:'https://oxbridge.example/api/billing/checkout',formData:async()=>new Map([['tier','pro'],['interval','annual'],['amount','1']])};let result=await POST(request);assert.match(result.url,/stripe-not-configured/);assert.equal(checkout,undefined);env.STRIPE_SECRET_KEY='sk_test_mock';result=await POST(request);assert.equal(result.status,303);assert.equal(result.url,'https://checkout.stripe.com/test');assert.equal(checkout.line_items[0].price_data.unit_amount,11900);assert.equal(checkout.subscription_data.metadata.tier,'pro');assert.equal(checkout.subscription_data.metadata.supabase_user_id,'user-1');assert.equal(customerCreated,false);signedIn=false;checkout=undefined;result=await POST(request);assert.match(result.url,/login/);assert.equal(checkout,undefined);console.log('PASS: all four plans, explicit Price ID priority, annual isolation, override validation, authentication, missing key, checkout redirect and webhook metadata')}
main().catch(e=>{console.error(e);process.exitCode=1})
