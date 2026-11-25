import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {interviewerStyles,interviewerStyle,nextPanelSpeaker,styleLocalPrompt,validWhiteboardPayload,MAX_WHITEBOARD_BASE64} from "../lib/interview-realism.ts"

test("four validated style choices and safe default",()=>{
 assert.equal(interviewerStyles.length,4)
 for(const s of interviewerStyles)assert.equal(interviewerStyle(s.id).id,s.id)
 assert.equal(interviewerStyle("unrecognised").id,"balanced")
 assert.equal(interviewerStyle(null).id,"balanced")
})
test("panel handovers happen after three answers and preserve single interviewer",()=>{
 assert.equal(nextPanelSpeaker(false,30,true),"Interviewer")
 assert.equal(nextPanelSpeaker(true,0),"Interviewer A")
 assert.equal(nextPanelSpeaker(true,2),"Interviewer A")
 assert.equal(nextPanelSpeaker(true,3),"Interviewer B")
 assert.equal(nextPanelSpeaker(true,6),"Interviewer A")
 assert.equal(nextPanelSpeaker(true,0,true),"Interviewer B")
})
test("style only changes presentation, not the academic prompt",()=>{
 const prompt="Which assumption is necessary for this conclusion?"
 for(const s of interviewerStyles)for(const n of [0,1,2,3])assert.ok(styleLocalPrompt(prompt,s.id,n).endsWith(prompt))
 assert.equal(styleLocalPrompt(prompt,"supportive",0),prompt)
 assert.equal(styleLocalPrompt(prompt,"quiet",0),prompt)
})
const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGNgAAAAAgAB4iG8MwAAAABJRU5ErkJggg=="
test("explicit image consent is required and notes are bounded",()=>{
 assert.equal(validWhiteboardPayload({data:png}),null)
 assert.equal(validWhiteboardPayload({data:png,consent:false}),null)
 const result=validWhiteboardPayload({data:png,consent:true,notes:"x".repeat(1000)})
 assert.equal(result.data,png);assert.equal(result.notes.length,800)
})
test("reject non PNG, URL, malformed and oversized data",()=>{
 for(const data of ["https://example.org/sketch.png","data:image/png;base64,"+png,"iVBORw0KGgo!!!","iVBORw0KGgo"+"A".repeat(MAX_WHITEBOARD_BASE64)])assert.equal(validWhiteboardPayload({data,consent:true}),null)
})
test("whiteboard image only included in the next follow-up and guarded server-side",()=>{
 const route=readFileSync(new URL("../app/api/reasoning-interview-turn/route.ts",import.meta.url),"utf8")
 const ui=readFileSync(new URL("../components/reasoning-interview-experience-v2.tsx",import.meta.url),"utf8")
 const guard=readFileSync(new URL("../lib/ai/request-guard.ts",import.meta.url),"utf8")
 assert.match(route,/auth\.getUser\(\)/);assert.match(route,/validWhiteboardPayload/);assert.match(route,/readUInt32BE\(16\)!==900/)
 assert.match(route,/inlineData: \{ mimeType: "image\/png"/);assert.match(route,/Do not grade the image/)
 assert.match(ui,/const attached=snapshot;setSnapshot\(null\)/)
 assert.match(ui,/whiteboard:attached\?\{\.\.\.attached,consent:true\}:undefined/)
 assert.match(guard,/\/api\/reasoning-interview-turn/)
 assert.doesNotMatch(ui,/localStorage\.setItem\([^\n]*whiteboard:attached/)
})
test("labelled axes, invalidation, local fallback and optional thinking time are integrated",()=>{
 const board=readFileSync(new URL("../components/interview-whiteboard.tsx",import.meta.url),"utf8")
 const ui=readFileSync(new URL("../components/reasoning-interview-experience-v2.tsx",import.meta.url),"utf8")
 assert.match(board,/Horizontal axis \/ units/);assert.match(board,/Attach sketch to next answer/);assert.match(board,/onSnapshot\?\.\(null\)/)
 assert.match(ui,/15-second think time/);assert.match(ui,/sketch was not analysed/);assert.match(ui,/Two-academic panel/)
})
