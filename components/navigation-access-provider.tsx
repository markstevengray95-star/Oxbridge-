"use client"
import {createContext,useContext,useEffect,useState} from "react"
import {createClient} from "@/lib/supabase/client"
import {noAccess,type NavigationAccess} from "@/lib/navigation-directory"
const Context=createContext<NavigationAccess>(noAccess)
export function NavigationAccessProvider({children}:{children:React.ReactNode}){
 const [access,setAccess]=useState<NavigationAccess>(noAccess)
 useEffect(()=>{
  const client=createClient()
  let generation=0,closed=false,user:string|null=null
  const refresh=async()=>{
   const id=++generation
   if(!user)return
   try{
    const res=await fetch("/api/navigation-access",{cache:"no-store"})
    if(!res.ok)throw Error()
    const next=await res.json() as NavigationAccess
    if(!closed&&generation===id)setAccess({signedIn:next.signedIn===true,staff:next.staff===true,manage:next.manage===true,owner:next.owner===true,admin:next.admin===true})
   }catch{if(!closed&&generation===id)setAccess({...noAccess,signedIn:true})}
  }
  const {data}=client.auth.onAuthStateChange((_event,session)=>{
   const next=session?.user.id??null
   if(next!==user){++generation;user=next;setAccess(next?{...noAccess,signedIn:true}:noAccess)}
   if(next)void refresh()
  })
  const onFocus=()=>{if(user)void refresh()}
  window.addEventListener("focus",onFocus)
  return()=>{closed=true;++generation;data.subscription.unsubscribe();window.removeEventListener("focus",onFocus)}
 },[])
 return <Context.Provider value={access}>{children}</Context.Provider>
}
export const useNavigationAccess=()=>useContext(Context)
