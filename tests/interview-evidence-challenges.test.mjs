import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  allEvidenceChallenges,
  evidenceChallengeById,
  evidenceChallengeForCourse,
  evidenceContext,
  evidenceStageFor,
  evidenceQuestionProbes,
  evidenceFollowUpProbes,
  validatedEvidenceContext,
  canRevealNextEvidence, nextEvidenceStage,
} from "../lib/interview-evidence-challenges.ts"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = name => fs.readFileSync(path.join(root, name), "utf8")
const list = allEvidenceChallenges()

test("every original scenario contains exactly three nonempty progressive exhibits",()=>{
  assert.equal(list.length,12)
  assert.equal(new Set(list.map(x=>x.id)).size,12)
  for(const item of list){
    assert.match(item.id,/^phase6-/)
    assert.equal(item.stages.length,3,item.id)
    assert.ok(item.introduction.length>45,item.id)
    assert.equal(new Set(item.stages.map(stage=>stage.question)).size,3,item.id)
    for(const stage of item.stages){
      assert.ok(stage.label && stage.change && stage.question.length>65,item.id)
      assert.ok(stage.question.includes("?"),item.id)
      assert.ok(stage.material.title && stage.material.note,item.id)
    }
  }
})

test("all graph series are numeric, aligned, finite and have usable axis titles",()=>{
  const graphs=list.flatMap(challenge=>challenge.stages.map(stage=>stage.material).filter(m=>m.kind==="graph"))
  assert.ok(graphs.length>=4)
  for(const graph of graphs){
    assert.ok(graph.xLabel.length>=3&&graph.yLabel.length>=3)
    assert.ok(graph.x.length>=4)
    assert.ok(graph.series.length>=1)
    assert.equal(new Set(graph.x).size,graph.x.length)
    for(const s of graph.series){
      assert.equal(s.values.length,graph.x.length,graph.title)
      assert.ok(s.values.every(Number.isFinite),graph.title)
    }
  }
})

test("tables have aligned columns and invented textual exhibits contain original material",()=>{
  let excerpts=0
  for(const challenge of list)for(const stage of challenge.stages){
    const material=stage.material
    if(material.kind==="table"){
      assert.ok(material.headers.length>=2)
      assert.ok(material.rows.length>=1)
      assert.ok(material.rows.every(row=>row.length===material.headers.length),material.title)
    }
    if(material.kind==="excerpt"){
      excerpts++
      assert.ok(material.text.length>30,material.title)
      assert.ok(material.note.length>15,material.title)
    }
  }
  assert.ok(excerpts>=5)
})

test("physics ramp dataset respects a constant height model",()=>{
  const challenge=evidenceChallengeById("phase6-physical-ramp")
  const chart=challenge.stages[0].material
  assert.equal(chart.kind,"graph")
  const scaling=chart.series[0].values.map((value,i)=>value/chart.x[i])
  assert.ok(Math.max(...scaling)-Math.min(...scaling)<0.02,"time should scale with ramp length")
  const second=challenge.stages[1].material
  assert.equal(second.kind,"table")
  const exitSpeeds=second.rows.map(row=>Number(row[1]))
  assert.ok(Math.max(...exitSpeeds)-Math.min(...exitSpeeds)<0.1)
})

test("chemistry rates reveal a justified concentration pattern, not a unique mechanism",()=>{
  const challenge=evidenceChallengeForCourse("Chemistry","physical")
  assert.equal(challenge.id,"phase6-chemistry-rates")
  const data=challenge.stages[0].material
  assert.equal(data.kind,"table")
  const rate=data.rows.map(row=>Number(row[3]))
  assert.ok(Math.abs(rate[1]/rate[0]-2)<0.001)
  assert.ok(Math.abs(rate[2]/rate[0]-4)<0.001)
  assert.match(challenge.stages[2].question,/mechanism/i)
})

test("course-specific challenges differ for engineering, chemistry, law and medicine",()=>{
  const names=[["Engineering","physical"],["Chemistry","physical"],["Physics","physical"],["Medicine","life"],["Law","law"],["History","humanities"],["Mathematics","maths"],["Computer Science","maths"],["Economics","economics"],["Geography","humanities"]]
  const ids=names.map(([course,track])=>evidenceChallengeForCourse(course,track).id)
  assert.equal(new Set(ids).size,ids.length)
})

test("unseen evidence is disclosed only through the selected stage",()=>{
  const x=list.find(x=>x.id==="phase6-medicine-trial")
  const early=evidenceContext({challengeId:x.id,stage:0})
  const middle=evidenceContext({challengeId:x.id,stage:1})
  const final=evidenceContext({challengeId:x.id,stage:2})
  assert.ok(early&&middle&&final)
  assert.match(early.material,/72.*100/)
  assert.doesNotMatch(early.material,/80 \| 20|35 \| 50/)
  assert.match(middle.material,/80 \| 20/)
  assert.doesNotMatch(middle.material,/35 \| 50/)
  assert.match(final.material,/35 \| 50/)
  assert.equal(early.stage,0)
  assert.equal(final.stage,2)
})

test("invalid or adversarial evidence identifiers and stages are rejected",()=>{
  for(const stage of [-1,3,99,1.1,NaN,"1",null,undefined])
    assert.equal(evidenceContext({challengeId:"phase6-medicine-trial",stage}),null)
  assert.equal(evidenceStageFor({challengeId:"unknown",stage:0}),null)
  assert.equal(evidenceStageFor({challengeId:"phase6-medicine-trial",stage:-1}),null)
  assert.equal(validatedEvidenceContext("Law","law",{challengeId:"phase6-medicine-trial",stage:0}),null)
})

test("server validation requires the canonical exhibit question to precede a student answer",()=>{
  const chosen=evidenceChallengeForCourse("Law","law")
  const selection={challengeId:chosen.id,stage:1}
  const q=chosen.stages[1].question
  assert.equal(validatedEvidenceContext("Law","law",selection,[{role:"candidate",text:"I think the rule is ambiguous."}]),null)
  assert.equal(validatedEvidenceContext("Law","law",selection,[{role:"interviewer",text:q}]),null)
  assert.ok(validatedEvidenceContext("Law","law",selection,[{role:"interviewer",text:q},{role:"candidate",text:"I would compare the purpose of the rule with the access impact."}]))
  assert.equal(validatedEvidenceContext("Medicine","life",selection,[{role:"interviewer",text:q},{role:"candidate",text:"A response"}]),null)
})

test("grounded follow-ups refer only to the current revealed evidence",()=>{
  const context=evidenceContext({challengeId:"phase6-history-sources",stage:0})
  const probes=evidenceFollowUpProbes(context)
  assert.equal(Object.keys(probes).length,10)
  for(const q of Object.values(probes)){
    assert.match(q,/exhibit 1/i)
    assert.match(q,/\?$/)
    assert.doesNotMatch(q,/Source B|Eastern gate/)
  }
  const additional=evidenceQuestionProbes({challengeId:"phase6-history-sources",stage:0})
  assert.ok(additional.length>=3)
  assert.ok(additional.every(x=>!x.includes("Eastern gate")))
})

test("interview UIs expose staged evidence, control reveal and request grounded prompts",()=>{
  const a=read("components/advanced-interview-experience.tsx")
  const b=read("components/reasoning-interview-experience-v2.tsx")
  const live=read("app/gemini-live-next/page.tsx")
  const panel=read("components/interview-evidence-panel.tsx")
  for(const source of [a,b,live]){
    assert.match(source,/InterviewEvidencePanel/)
    assert.match(source,/evidenceStage/)
    assert.match(source,/evidenceLastAnswerCount/)
    assert.match(source,/revealEvidence/)
  }
  assert.match(panel,/Accessible graph data table/)
  assert.match(panel,/aria-label/)
  assert.match(panel,/aria-pressed/)
  assert.match(panel,/Reveal changed evidence/)
  for(const p of ["app/api/interview-turn/route.ts","app/api/reasoning-interview-turn/route.ts"]){
    const route=read(p)
    assert.match(route,/validatedEvidenceContext/)
    assert.match(route,/evidenceFollowUpProbes/)
    assert.match(route,/workingEvidence/)
  }
})

test("live reconnect includes only already-revealed exhibit context",()=>{
  const live=read("app/gemini-live-next/page.tsx")
  assert.match(live,/evidenceContext\(\{challengeId:evidenceChallenge.id,stage:evidenceStage\}\)/)
  assert.match(live,/Current interactive evidence already shown to the student/)
  assert.match(live,/clientContent/)
})


test("a candidate must answer before each exhibit and cannot skip stages",()=>{
  const challenge=evidenceChallengeForCourse("Physics","physical")
  assert.equal(canRevealNextEvidence(-1,0,0),false)
  assert.equal(canRevealNextEvidence(-1,1,0),true)
  const first=nextEvidenceStage(challenge,-1,1,0)
  assert.equal(first.index,0)
  assert.equal(first.stage.question,challenge.stages[0].question)
  assert.equal(nextEvidenceStage(challenge,0,1,1),null)
  const second=nextEvidenceStage(challenge,0,2,1)
  assert.equal(second.index,1)
  assert.equal(nextEvidenceStage(challenge,1,2,2),null)
  assert.equal(nextEvidenceStage(challenge,1,3,2).index,2)
  assert.equal(nextEvidenceStage(challenge,2,4,3),null)
  assert.equal(nextEvidenceStage(challenge,-2,100,0),null)
  assert.equal(nextEvidenceStage(challenge,0,2,3),null)
})
