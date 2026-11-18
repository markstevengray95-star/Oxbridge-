import { NextResponse } from 'next/server'
import { FREE_FULL_ACCESS } from '@/lib/billing/plans'
import { createClient } from '@/lib/supabase/server'
export const runtime='nodejs'
export const dynamic='force-dynamic'
function pricing(request:Request,value:string){const url=new URL('/premium',request.url);url.searchParams.set('billing',value);return NextResponse.redirect(url,303)}
export async function POST(request:Request){
  if(FREE_FULL_ACCESS)return pricing(request,'payments-paused')
  try{
    const supabase=await createClient()
    const {data:{user},error:authError}=await supabase.auth.getUser()
    if(authError||!user){const url=new URL('/login',request.url);url.searchParams.set('next','/premium');return NextResponse.redirect(url,303)}
    const form=await request.formData()
    if(form.get('purchase_authority')!=='confirmed'||form.get('start_now')!=='confirmed')return pricing(request,'consent-required')
    const tier=form.get('tier')==='school'?'school':'pro'
    const interval=form.get('interval')==='annual'?'yearly':'monthly'
    // Native and Orbitals checkout share one authenticated, serialized purchase path.
    const {data,error}=await supabase.functions.invoke('orbits-billing',{body:{action:'checkout',code:`fellow_${tier}_${interval}`,purchase_authority:true,start_now:true,return_origin:new URL(request.url).origin,return_path:'/post-login?billing=success',cancel_path:'/premium?billing=cancelled'}})
    if(error){
      const response=error.context as Response|undefined
      const detail=await response?.json().catch(()=>null) as {error?:string}|null|undefined
      return pricing(request,detail?.error==='legal_details_required'?'legal-details-required':detail?.error==='subscription_already_exists'?'subscription-exists':'checkout-error')
    }
    if(!data?.url)return pricing(request,'checkout-error')
    const url=new URL(data.url)
    if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')return pricing(request,'checkout-error')
    return NextResponse.redirect(url,303)
  }catch{return pricing(request,'checkout-error')}
}
