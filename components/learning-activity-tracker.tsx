"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { learningSectionPath } from "@/lib/school/learning-activity"

/** Measures visible-tab time only, not idle device time or external websites. */
export function LearningActivityTracker(){
  const pathname=usePathname()
  useEffect(()=>{
    const page=learningSectionPath(pathname)
    if(!page)return
    const supabase=createClient()
    let closed=false
    let activeSince=document.hidden?0:Date.now()

    async function record(eventKind:"visit"|"heartbeat",activeSeconds=0){
      if(closed)return
      try{
        const {data}=await supabase.auth.getSession()
        if(!data.session?.user?.id || closed)return
        await fetch("/api/learning/activity",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({pagePath:page,eventKind,activeSeconds}),
          cache:"no-store",
          keepalive:eventKind==="heartbeat",
        })
      }catch{
        // Failed telemetry never interrupts the learning activity itself.
      }
    }
    if(activeSince)void record("visit")
    const interval=window.setInterval(()=>{
      if(document.hidden||!activeSince)return
      const now=Date.now()
      const seconds=Math.min(30,Math.floor((now-activeSince)/1000))
      activeSince=now
      if(seconds>=5)void record("heartbeat",seconds)
    },30000)
    const visibility=()=>{
      if(document.hidden)activeSince=0
      else {activeSince=Date.now();void record("visit")}
    }
    document.addEventListener("visibilitychange",visibility)
    return ()=>{
      closed=true
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange",visibility)
    }
  },[pathname])
  return null
}
