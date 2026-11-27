/** Session-level diagnostics only. No audio, transcripts, tokens or identifiers. */
export type LiveReliabilityStats = {connections:number;disconnects:number;droppedFrames:number;interruptions:number;audioErrors:number;responseSamplesMs:number[];pendingResponseAt:number|null}
export function newLiveReliabilityStats():LiveReliabilityStats{
 return {connections:0,disconnects:0,droppedFrames:0,interruptions:0,audioErrors:0,responseSamplesMs:[],pendingResponseAt:null}
}
export function markLiveResponsePending(stats:LiveReliabilityStats,now:number){
 if(Number.isFinite(now))stats.pendingResponseAt=now
}
export function markLiveResponseArrived(stats:LiveReliabilityStats,now:number){
 const start=stats.pendingResponseAt
 stats.pendingResponseAt=null
 if(start===null||!Number.isFinite(now)||now<start||now-start>60000)return
 if(stats.responseSamplesMs.length<100)stats.responseSamplesMs.push(Math.round(now-start))
}
export function liveReliabilityReport(stats:LiveReliabilityStats){
 const values=stats.responseSamplesMs.slice().sort((a,b)=>a-b)
 const percentile=(p:number)=>values.length?values[Math.max(0,Math.ceil(p*values.length)-1)]:null
 return {connections:stats.connections,disconnects:stats.disconnects,droppedFrames:stats.droppedFrames,interruptions:stats.interruptions,audioErrors:stats.audioErrors,responseSamples:values.length,medianObservedMs:percentile(.5),p95ObservedMs:percentile(.95),measurementNote:"Time from latest received candidate transcription fragment to first received interviewer content. This is not end-to-end spoken latency or a measurement of interruption latency. Dropped frames indicate local backpressure, not all network losses."}
}
export function validLivePcmRate(mimeType?:string){
 if(!mimeType)return 24000
 if(!/^audio\/pcm(?:;\s*rate=\d+)?$/i.test(mimeType))return null
 const match=mimeType.match(/rate=(\d+)/i)
 const rate=match?Number(match[1]):24000
 return Number.isInteger(rate)&&rate>=8000&&rate<=48000?rate:null
}
export function safeLiveSocketMessage(raw:string){
 if(typeof raw!=="string"||!raw.trim()||raw.length>4_000_000)return null
 try{const value=JSON.parse(raw);return value&&typeof value==="object"&&!Array.isArray(value)?value:null}catch{return null}
}
export function shouldRecoverLiveSession(turns:readonly {role:string;text:string}[]){
 return turns.some(t=>(t.role==="candidate"||t.role==="interviewer")&&typeof t.text==="string"&&t.text.trim().length>0)
}
