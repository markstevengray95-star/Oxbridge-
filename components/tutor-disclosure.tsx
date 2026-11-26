"use client"
import {useEffect,useRef} from "react"
export function TutorDisclosure({title,children,defaultOpen=false}:{title:string;children:React.ReactNode;defaultOpen?:boolean}){
 const ref=useRef<HTMLDetailsElement>(null)
 useEffect(()=>{
  const reveal=()=>{
   const hash=window.location.hash.slice(1)
   if(!hash)return
   const target=document.getElementById(hash)
   if(target&&ref.current?.contains(target)){
    ref.current.open=true
    requestAnimationFrame(()=>target.scrollIntoView({block:"start"}))
   }
  }
  reveal()
  window.addEventListener("hashchange",reveal)
  return()=>window.removeEventListener("hashchange",reveal)
 },[])
 return <details ref={ref} open={defaultOpen} className="fellow-panel mx-auto my-4 max-w-7xl"><summary className="cursor-pointer rounded-xl px-5 py-4 font-semibold text-[#142d3e]">{title}</summary>{children}</details>
}
