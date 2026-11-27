import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {newLiveReliabilityStats,markLiveResponsePending,markLiveResponseArrived,liveReliabilityReport,validLivePcmRate,safeLiveSocketMessage,shouldRecoverLiveSession} from "../lib/gemini/live-reliability.ts"

test("latency diagnostics are bounded and labelled as transcription intervals",()=>{
 const stats=newLiveReliabilityStats()
 assert.equal(liveReliabilityReport(stats).medianObservedMs,null)
 for(const [start,end] of [[100,200],[300,600],[700,1700]]){markLiveResponsePending(stats,start);markLiveResponseArrived(stats,end)}
 markLiveResponseArrived(stats,1800)
 assert.equal(liveReliabilityReport(stats).responseSamples,3)
 assert.equal(liveReliabilityReport(stats).medianObservedMs,300)
 assert.equal(liveReliabilityReport(stats).p95ObservedMs,1000)
 assert.match(liveReliabilityReport(stats).measurementNote,/not end-to-end/)
 for(let i=0;i<200;i++){markLiveResponsePending(stats,i);markLiveResponseArrived(stats,i+100)}
 assert.equal(liveReliabilityReport(stats).responseSamples,100)
})
test("invalid and stale intervals are rejected",()=>{
 const stats=newLiveReliabilityStats()
 markLiveResponsePending(stats,100);markLiveResponseArrived(stats,50)
 markLiveResponsePending(stats,100);markLiveResponseArrived(stats,60101)
 assert.equal(liveReliabilityReport(stats).responseSamples,0)
 assert.equal(stats.pendingResponseAt,null)
})
test("PCM rates and socket frames are bounded",()=>{
 assert.equal(validLivePcmRate(),24000)
 assert.equal(validLivePcmRate("audio/pcm;rate=16000"),16000)
 assert.equal(validLivePcmRate("audio/pcm;rate=0"),null)
 assert.equal(validLivePcmRate("audio/pcm;rate=1000000"),null)
 assert.equal(validLivePcmRate("audio/mp3"),null)
 assert.deepEqual(safeLiveSocketMessage('{"setupComplete":{}}'),{setupComplete:{}})
 for(const value of ["","[1]","null","bad","x".repeat(4000001)])assert.equal(safeLiveSocketMessage(value),null)
})
test("only recorded dialogue permits resume",()=>{
 assert.equal(shouldRecoverLiveSession([{role:"system",text:"connection"}]),false)
 assert.equal(shouldRecoverLiveSession([{role:"candidate",text:"  "}]),false)
 assert.equal(shouldRecoverLiveSession([{role:"interviewer",text:"Explain your reasoning."}]),true)
})
test("both clients measure diagnostics, handle malformed frames and preserve elapsed time",()=>{
 for(const path of ["app/gemini-live-next/page.tsx","components/gemini-live-interview-experience.tsx"]){
  const src=readFileSync(path,"utf8")
  for(const marker of ["safeLiveSocketMessage","validLivePcmRate","setupTimerRef","elapsedBeforeReconnectRef","markLiveResponsePending","markLiveResponseArrived","reliabilityReport:liveReliabilityReport","LiveReliabilityReview"])assert.ok(src.includes(marker),path+" "+marker)
 }
 const secondary=readFileSync("components/gemini-live-interview-experience.tsx","utf8")
 assert.match(secondary,/Resume voice interview/)
 assert.match(secondary,/Save and review/)
 assert.match(secondary,/buildLiveResumePrompt\(course,turnsRef.current\)/)
 assert.match(secondary,/generation!==generationRef.current/)
})
test("visual analysis requires authentication, bounded input and no raw provider errors",()=>{
 const src=readFileSync("app/api/analyse-working/route.ts","utf8")
 assert.match(src,/supabase.auth.getClaims/)
 assert.match(src,/status:401/)
 assert.match(src,/content-length/)
 assert.match(src,/untrusted evidence/)
 assert.doesNotMatch(src,/detail.slice\(0, 700\)/)
})
