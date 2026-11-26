import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8")
const paths=["components/reasoning-interview-experience-v2.tsx","components/advanced-interview-experience.tsx","app/gemini-live-next/page.tsx"]
test("Every major interview engine has the same follow-up choices",()=>{
 for(const file of paths){const source=read(file);assert.match(source,/import \{InterviewNextSteps\}/);assert.equal((source.match(/<InterviewNextSteps\/>/g)||[]).length,1)}
})
test("Follow-up choices lead to unified progress, interview evidence and a fresh session",()=>{
 const source=read("components/interview-next-steps.tsx")
 for(const href of ["/study/progress","/interview-insights","/interviews"])assert.ok(source.includes('href="'+href+'"'))
 assert.match(source,/not an admissions prediction/)
})
test("Written reasoning review keeps original rubric and detailed technical evidence",()=>{
 const source=read(paths[0])
 assert.match(source,/Detailed reasoning assessment, marking and working evidence/)
 for(const evidence of ["Recovery 2.0","Working-method analysis","Nine-dimension evidence","Intervention path","Practise this weakness"])assert.ok(source.includes(evidence))
 assert.match(source,/InterviewEvidenceReview/)
})
test("Formal review retains transcript but reduces visible complexity",()=>{
 const source=read(paths[1])
 assert.match(source,/Full conversation transcript/)
 assert.match(source,/<details className="rounded-xl border bg-white">/)
 assert.match(source,/turns\.map/)
 assert.match(source,/InterviewEvidenceReview/)
})
test("Voice interview retains saved feedback and original replay route",()=>{
 const source=read(paths[2])
 assert.match(source,/if \(phase === "ended"\)/)
 assert.match(source,/href="\/reasoning-replay"/)
 assert.match(source,/InterviewEvidenceReview/)
})
