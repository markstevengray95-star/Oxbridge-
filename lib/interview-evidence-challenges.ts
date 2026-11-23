/**
 * Original, deliberately unfamiliar academic evidence for interactive interviews.
 * Figures and passages are fictional practice stimuli, not published research,
 * historical artefacts, clinical advice or university interview questions.
 * Never send unrevealed stages or facilitator notes to a live candidate.
 */
import { subjectInterviewPathway } from "./subject-interview-pathways.ts"

export type EvidenceGraph = {
  kind: "graph"
  title: string
  xLabel: string
  yLabel: string
  x: number[]
  series: { label: string; values: number[] }[]
  note: string
}
export type EvidenceTable = {
  kind: "table"
  title: string
  headers: string[]
  rows: string[][]
  note: string
}
export type EvidenceExcerpt = {
  kind: "excerpt"
  title: string
  text: string
  note: string
}
export type EvidenceMedia = EvidenceGraph | EvidenceTable | EvidenceExcerpt
export type EvidenceChallengeStage = {
  label: string
  question: string
  material: EvidenceMedia
  change: string
}
export type EvidenceChallenge = {
  id: string
  pathwayId: string
  title: string
  introduction: string
  stages: [EvidenceChallengeStage, EvidenceChallengeStage, EvidenceChallengeStage]
}
export type EvidenceSelection = { challengeId?: string; stage?: number }
export type EvidenceContext = {
  id: string
  stage: number
  title: string
  material: string
  question: string
  change: string
}

// Visually legible small datasets: values are integers/fixed decimals and
// are internally consistent; no statistical conclusion is pre-marked as true.
const physical: EvidenceChallenge = {
  id: "phase6-physical-ramp", pathwayId: "physics",
  title: "A slope experiment that changes",
  introduction: "A fictional laboratory study of a ball released from rest on ramps with the same vertical drop. Examine the changing data before proposing a model.",
  stages: [
    { label: "Unseen measurements", change: "First experimental record",
      question: "Which pattern do you see in the times, and what could explain it without assuming that final speed changes?",
      material: { kind: "graph", title: "Time to reach bottom, equal vertical drop (friction neglected)", xLabel: "Slope length (m)", yLabel: "Travel time (s)",
        x: [1,2,3,4,5], series: [{label:"Measured time",values:[0.64,1.28,1.92,2.56,3.19]}],
        note:"Invented data rounded to 2 decimals; all slopes have a vertical drop of 0.5 m." },
    },
    { label: "New evidence", change: "Speed measurements are now provided",
      question: "The speed measurements hardly change. Does that support or undermine your earlier explanation of travel time?",
      material: { kind: "table", title: "Observed exit speeds", headers:["Slope length (m)","Exit speed (m/s)"], rows:[["1","3.12"],["2","3.14"],["3","3.13"],["4","3.12"],["5","3.14"]], note:"Fictional readings with small experimental variation." },
    },
    { label: "Changed condition", change: "The longest ramp is replaced with a rough surface",
      question: "Suppose the 5 m slope becomes rough and the measured exit speed drops to 2.5 m/s. Which assumption fails, and what measurement could test your revised model?",
      material: { kind: "table", title: "Revised apparatus", headers:["Ramp","Length (m)","Exit speed (m/s)"],rows:[["Smooth","5","3.14"],["Rough","5","2.50"]],note:"The vertical drop and release conditions are unchanged." },
    },
  ],
}
const medicine: EvidenceChallenge = {
  id:"phase6-medicine-trial",pathwayId:"medicine",title:"A treatment claim under scrutiny",
  introduction:"Fictional educational trial data. No real treatment guidance is implied.",
  stages:[
    {label:"Initial evidence",change:"Non-randomised recovery counts",
      question:"What does this table show, and why can you not yet claim that the treatment caused the difference?",
      material:{kind:"table",title:"Observed 14-day recovery",headers:["Group","Recovered","Total"],rows:[["Received treatment","72","100"],["No treatment","60","100"]],note:"Groups were selected by different clinics; baseline risks are not yet known."}},
    {label:"New evidence",change:"Patients had unequal baseline severity",
      question:"How does knowing that the groups differed at baseline change your causal claim?",
      material:{kind:"table",title:"Baseline classification",headers:["Group","Mild cases","Severe cases"],rows:[["Received treatment","80","20"],["No treatment","45","55"]],note:"Treatment status was not randomly assigned."}},
    {label:"Interviewer twist",change:"A small randomised subset is revealed",
      question:"A randomised subset shows 35/50 recovered with treatment and 34/50 without. How should that affect your confidence, and what else matters?",
      material:{kind:"table",title:"Exploratory randomised subset",headers:["Arm","Recovered","Total"],rows:[["Treatment","35","50"],["Comparator","34","50"]],note:"Illustrative small numbers: discuss uncertainty, adverse effects, consent and study power."}},
  ],
}
const law: EvidenceChallenge={
  id:"phase6-law-hypothetical",pathwayId:"law",title:"An invented rule with a hard exception",
  introduction:"A wholly fictional campus regulation, not a real statute or judicial precedent.",
  stages:[
    {label:"Unseen provision",change:"Read the original rule before deciding",
      question:"What readings of 'vehicle' are defensible here, and what is the strongest reason for your preferred reading?",
      material:{kind:"excerpt",title:"Invented university rule",text:"Rule 4: No vehicles may enter the College Garden between 08:00 and 18:00. The stated purpose is to prevent injury to pedestrians.",note:"No definition section is supplied."}},
    {label:"New facts",change:"The first hard case is introduced",
      question:"A student using a powered wheelchair must cross the garden to reach a lecture. Does that change your interpretation, and which principle matters most?",
      material:{kind:"excerpt",title:"Case A — access",text:"The accessible lecture entrance is inside the Garden. A powered wheelchair is stopped under Rule 4, although bicycles are sometimes carried across the Garden.",note:"Discuss literal wording, purpose, access and fairness; do not assume a particular real-world legal regime."}},
    {label:"Changed condition",change:"A materially different vehicle is introduced",
      question:"A silent delivery robot travels at walking speed carrying emergency medicine. Can your proposed rule handle both cases consistently?",
      material:{kind:"excerpt",title:"Case B — emergency",text:"At 14:00, a small autonomous delivery robot approaches the Garden with time-sensitive medication. It can be supervised remotely.",note:"Identify which facts should make a principled difference; acknowledge reasonable opposing interpretations."}},
  ],
}
const history: EvidenceChallenge={
  id:"phase6-history-sources",pathwayId:"history",title:"Who can describe the same protest?",
  introduction:"These are invented source extracts for reasoning practice, not historical quotations.",
  stages:[
    {label:"Unseen witness",change:"First witness extract",
      question:"What can you reasonably infer from this first source, and which claims require corroboration?",
      material:{kind:"excerpt",title:"Source A — resident's diary, fictional",text:"At midday the square seemed calm. Several people carried signs and spoke with the mayor; I heard no threats from where I stood beside the market.",note:"Written that evening by an imagined resident."}},
    {label:"Contrasting account",change:"Another viewpoint appears",
      question:"How could both accounts be broadly sincere, and how would you test their apparent disagreement?",
      material:{kind:"excerpt",title:"Source B — constable's report, fictional",text:"Near the eastern gate at half past twelve, a small group pushed against the barrier. The crowd near me became difficult to control.",note:"Invented official report concerning a different position and time."}},
    {label:"New corroboration",change:"The historian receives a map annotation",
      question:"The gate is 300 m from the market, and the reports differ by 30 minutes. What changes in your interpretation and what remains unproved?",
      material:{kind:"table",title:"Source comparison",headers:["Source","Position","Time"],rows:[["A","Market","12:00"],["B","Eastern gate","12:30"]],note:"Locations and times are invented for this scenario."}},
  ],
}
const maths: EvidenceChallenge={
  id:"phase6-maths-pattern",pathwayId:"mathematics",title:"A pattern that might mislead",
  introduction:"Work from an unseen table, then justify what it does and does not prove.",
  stages:[
    {label:"First six values",change:"A numerical pattern is presented",
      question:"What rules could generate these values, and why does agreeing with the table not establish a unique formula?",
      material:{kind:"table",title:"Unknown function",headers:["n","1","2","3","4","5","6"],rows:[["f(n)","1","4","9","16","25","36"]],note:"The function is defined for positive integers only; no further assumptions are given."}},
    {label:"An extra value",change:"A seventh value differs from the obvious rule",
      question:"You now learn f(7)=50. Can you construct a rule consistent with all seven values, and what happened to your previous conjecture?",
      material:{kind:"table",title:"Seventh observation",headers:["n","6","7"],rows:[["f(n)","36","50"]],note:"No continuity or degree bound is specified."}},
    {label:"Extra assumption",change:"The interviewer specifies polynomial degree",
      question:"If f is known to be a polynomial of degree at most six, would seven data points determine it uniquely? What mathematical fact justifies your answer?",
      material:{kind:"excerpt",title:"New condition",text:"The unknown function is a polynomial in n of degree no greater than six.",note:"Reason from how many roots a nonzero polynomial can have."}},
  ],
}
const economics: EvidenceChallenge={
  id:"phase6-economics-traffic",pathwayId:"economics",title:"Was the congestion charge successful?",
  introduction:"Fictional monitoring results from two city centres. Discuss counterfactuals before declaring success.",
  stages:[
    {label:"Before and after",change:"Initial congestion data",
      question:"What happened after the charge, and why does a before-after comparison alone not settle causation?",
      material:{kind:"graph",title:"Average weekday peak travel delay",xLabel:"Month",yLabel:"Delay (minutes)",
        x:[1,2,3,4,5,6],series:[{label:"Charged centre",values:[22,21,20,16,15,14]}],note:"Charging began after month 3; invented monitoring data."}},
    {label:"Control location",change:"A comparable city is revealed",
      question:"The control location also improved. How does that change your estimate of the policy's effect?",
      material:{kind:"graph",title:"Peak travel delay: treated and comparison centres",xLabel:"Month",yLabel:"Delay (minutes)",
        x:[1,2,3,4,5,6],series:[{label:"Charged centre",values:[22,21,20,16,15,14]},{label:"Comparison centre",values:[21,20,19,17,16,15]}],note:"The comparison city has no charge; illustrative data, not a causal identification proof."}},
    {label:"Displacement",change:"Another outcome is disclosed",
      question:"Bus occupancy rose 15% while roads around the zone became busier. Which further outcomes should be measured to judge the trade-offs?",
      material:{kind:"table",title:"Additional fictional indicators",headers:["Indicator","Change after charge"],rows:[["Bus passengers","+15%"],["Outer-zone traffic","+9%"],["Central-zone car trips","-18%"]],note:"Changes measured against preceding months; no validated counterfactual supplied."}},
  ],
}
const biology: EvidenceChallenge={
  id:"phase6-biology-growth",pathwayId:"biology",title:"Light, growth and a possible confound",
  introduction:"Fictional plant experiment, designed for cautious interpretation of measurements.",
  stages:[
    {label:"Growth data",change:"First experimental graph",
      question:"Describe the pattern and distinguish a biological mechanism from what this graph alone demonstrates.",
      material:{kind:"graph",title:"Plant height after 4 weeks",xLabel:"Light dose (arbitrary units)",yLabel:"Mean height (cm)",x:[1,2,3,4,5],series:[{label:"Blue light",values:[4,7,10,12,12]},{label:"Red light",values:[3,6,8,9,9]}],note:"Invented averages; no uncertainty bars or sample size shown."}},
    {label:"New measurement",change:"The light sources were not equivalent",
      question:"The blue source delivered more photons at each stated setting. How does this change the claim that wavelength caused the difference?",
      material:{kind:"table",title:"Photon flux at setting 3",headers:["Source","Photons per relative interval"],rows:[["Blue","140"],["Red","100"]],note:"Fictional arbitrary units; sources were not photon-matched."}},
    {label:"Controlled comparison",change:"Matched photon flux evidence arrives",
      question:"After matching photon flux, both groups averaged 9 cm at setting 3. What can you now conclude, and which uncertainty still matters?",
      material:{kind:"table",title:"Mean height at matched flux",headers:["Source","Mean height (cm)"],rows:[["Blue","9.0"],["Red","9.0"]],note:"Single illustrative comparison, no variability or replication reported."}},
  ],
}
const computing: EvidenceChallenge={
  id:"phase6-computing-runtime",pathwayId:"computing",title:"Can you identify an algorithm by timing?",
  introduction:"Invented timing evidence, with intentionally ambiguous interpretation until more information is revealed.",
  stages:[
    {label:"Initial runtime",change:"One benchmark table",
      question:"Which growth rates could explain these timings, and how would you test your inference?",
      material:{kind:"graph",title:"Measured elapsed time by input size",xLabel:"Input size n",yLabel:"Time (ms)",x:[100,200,300,400],series:[{label:"Implementation A",values:[1.1,2.2,3.4,4.5]}],note:"Invented measurement times; hardware and setup not specified."}},
    {label:"New algorithm",change:"A second implementation is benchmarked",
      question:"Why might implementation B eventually become slower even if it looks fast on small inputs?",
      material:{kind:"graph",title:"Benchmark comparison",xLabel:"Input size n",yLabel:"Time (ms)",x:[100,200,300,400],series:[{label:"Implementation A",values:[1.1,2.2,3.4,4.5]},{label:"Implementation B",values:[0.3,0.8,1.8,3.2]}],note:"Compare trends cautiously; only four points are available."}},
    {label:"New constraint",change:"Available RAM is reduced",
      question:"Now memory is limited to a small fixed buffer. How would that change your algorithm choice and correctness tests?",
      material:{kind:"excerpt",title:"System constraint",text:"The input is an unbounded stream. Memory is limited to 32 KiB and each item is processed on arrival.",note:"An exact answer depends on the task and whether approximations are allowed."}},
  ],
}
const literature: EvidenceChallenge={
  id:"phase6-literature-reading",pathwayId:"literature",title:"A voice changes the meaning",
  introduction:"All quotations below are original, invented practice prose.",
  stages:[
    {label:"Unseen passage",change:"Opening extract",
      question:"How does the imagery support more than one interpretation of the narrator's attitude?",
      material:{kind:"excerpt",title:"Fictional passage A",text:"The windows were open, but the house still held its breath. I had returned with a key that no longer felt like mine.",note:"Original practice prose, not a quotation from an existing novel."}},
    {label:"Second passage",change:"The narrator's next sentence is revealed",
      question:"Does this additional sentence support your first reading or complicate it, and which exact word matters most?",
      material:{kind:"excerpt",title:"Fictional passage B",text:"Behind the door, a small lamp waited; for the first time I wondered whether someone had kept it burning for me.",note:"Interpretations should be supported by diction, context and structure."}},
    {label:"Changed perspective",change:"A rival perspective appears",
      question:"If another character calls the lamp an 'accident', how could that change the narrative's reliability and your interpretation?",
      material:{kind:"excerpt",title:"Imagined second speaker",text:"'That lamp?' she said. 'It was never meant for you.'",note:"Consider unreliable narration and competing character knowledge."}},
  ],
}

const chemistry: EvidenceChallenge={
  id:"phase6-chemistry-rates",pathwayId:"chemistry",title:"The rate experiment changes",
  introduction:"Fictional initial-rate experiments. Use numerical relationships carefully and distinguish measurements from mechanisms.",
  stages:[
    {label:"Initial readings",change:"Rates for varied concentrations",
      question:"Which reaction-order hypothesis is consistent with these results, and what additional information do you need?",
      material:{kind:"table",title:"Initial rates",headers:["Trial","[A] (mol/L)","[B] (mol/L)","Initial rate (mol/L/s)"],rows:[["1","0.10","0.10","0.020"],["2","0.20","0.10","0.040"],["3","0.10","0.20","0.080"]],note:"Temperature and catalyst conditions held fixed."}},
    {label:"New condition",change:"Temperature is increased",
      question:"At the original concentrations a higher temperature produces 0.050 mol/L/s. Which part of your rate model changes, and what conclusion would be unwarranted?",
      material:{kind:"table",title:"Temperature test at trial 1 concentrations",headers:["Temperature (°C)","Initial rate (mol/L/s)"],rows:[["20","0.020"],["35","0.050"]],note:"Concentrations are unchanged; a simple concentration-order test alone cannot establish mechanism."}},
    {label:"Mechanistic challenge",change:"A rival two-step mechanism is proposed",
      question:"Two proposed mechanisms predict the same rate law at the tested conditions. What experiment could distinguish them?",
      material:{kind:"excerpt",title:"Mechanistic ambiguity",text:"Mechanism X and mechanism Y both predict first order in A and second order in B under these conditions.",note:"Avoid treating a fitted rate law as proof of a unique mechanism."}},
  ],
}
const engineering: EvidenceChallenge={
  id:"phase6-engineering-beams",pathwayId:"engineering",title:"A beam design has a surprise",
  introduction:"Illustrative beam-deflection data for equal-span, equal-mass alternatives. The support and loading arrangements are assumed identical.",
  stages:[
    {label:"Baseline comparison",change:"Measured deflection",
      question:"Which design appears stiffer under this load and what must be controlled to support that comparison?",
      material:{kind:"table",title:"Deflection at centre under 100 N",headers:["Profile","Mass (kg)","Deflection (mm)"],rows:[["Solid rectangle","2.0","4.0"],["Hollow I-shaped","2.0","1.5"]],note:"Fictional measurements at one load and orientation."}},
    {label:"Loading changes",change:"The load rotates relative to the section",
      question:"With the profile rotated, the I-shape now deflects 6 mm. What does this reveal about the claim that it is 'stronger'?",
      material:{kind:"table",title:"Deflection under changed orientation",headers:["Profile","Original (mm)","Rotated (mm)"],rows:[["Solid rectangle","4.0","4.1"],["I-shaped","1.5","6.0"]],note:"Discuss bending direction and second moment of area."}},
    {label:"Failure mode",change:"Lateral buckling is reported",
      question:"The narrow flange starts to buckle before the expected load limit. Which failure mode does your initial bending-stiffness comparison miss?",
      material:{kind:"excerpt",title:"Observed failure",text:"At increased load, the I-shaped section develops lateral instability before yielding in bending.",note:"Propose an appropriate bracing or test strategy without assuming unique optimal design."}},
  ],
}
const geography: EvidenceChallenge={
  id:"phase6-geography-floods",pathwayId:"geography",title:"Does the flood barrier move risk?",
  introduction:"A fictional spatial field study; local flood frequency is not controlled by one variable alone.",
  stages:[
    {label:"Flood frequency",change:"Before and after data",
      question:"What spatial pattern do you see, and what would you need before attributing it to the barrier?",
      material:{kind:"table",title:"Reported flooded days per year",headers:["Location","Before","After"],rows:[["Protected town","12","4"],["Downstream village","6","10"]],note:"Different years have different rainfall; values are illustrative."}},
    {label:"Changed environment",change:"Rainfall record is disclosed",
      question:"Rainfall increased in the later period. How might this change your interpretation of the two locations?",
      material:{kind:"table",title:"Mean annual rainfall",headers:["Period","Rainfall (mm)"],rows:[["Before","800"],["After","920"]],note:"Rainfall alone does not determine coastal or river flood hazard."}},
    {label:"Counterfactual model",change:"A third site is measured",
      question:"A control settlement without a barrier also experienced more floods. Which comparison best helps isolate possible barrier effects, and why?",
      material:{kind:"table",title:"Comparison flood days",headers:["Location","Before","After"],rows:[["Unprotected reference","5","8"]],note:"A control site must be similar for a defensible comparison."}},
  ],
}

const scenarios: EvidenceChallenge[]=[physical,medicine,law,history,maths,economics,biology,computing,literature,chemistry,engineering,geography]
const map:Record<string,string>={
  physics:physical.id,engineering:engineering.id,chemistry:chemistry.id,
  mathematics:maths.id,computing:computing.id,
  medicine:medicine.id,biology:biology.id,psychology:medicine.id,
  law:law.id,economics:economics.id,ppe:economics.id,
  history:history.id,geography:geography.id,
  philosophy:law.id,literature:literature.id,languages:literature.id,general:history.id,
}
export function allEvidenceChallenges(){return scenarios}
export function evidenceChallengeById(id:string){return scenarios.find(x=>x.id===id)||null}
export function evidenceChallengeForCourse(course:string,track?:string){
  const profile=subjectInterviewPathway(course,track)
  return evidenceChallengeById(map[profile.id]) || history
}
export function evidenceStageFor(selection:EvidenceSelection): {challenge:EvidenceChallenge; stage:EvidenceChallengeStage; index:number}|null{
  const challenge=evidenceChallengeById(String(selection.challengeId||""))
  const index=selection.stage
  if(!challenge || !Number.isInteger(index) || typeof index!=="number" || index<0 || index>=challenge.stages.length) return null
  return {challenge,stage:challenge.stages[index],index}
}
export function summarizeEvidenceStage(stage:EvidenceChallengeStage){
  const m=stage.material
  if(m.kind==="excerpt")return "Excerpt: "+m.text+" Context: "+m.note
  if(m.kind==="table")return m.headers.join(" | ")+"; "+m.rows.map(row=>row.join(" | ")).join("; ")+"; "+m.note
  return m.title+"; x="+m.xLabel+" ["+m.x.join(", ")+"]; "+m.series.map(s=>s.label+" ["+s.values.join(", ")+"]").join("; ")+"; y="+m.yLabel+"; "+m.note
}
export function evidenceContext(selection:EvidenceSelection):EvidenceContext|null{
  const result=evidenceStageFor(selection)
  if(!result)return null
  const {challenge,stage,index}=result
  // Only revealed stages up to the stage index are included. Never hand the
  // model stage 3 evidence when the student is still examining stage 1.
  const material=challenge.stages.slice(0,index+1)
    .map((item,i)=>"Revealed step "+(i+1)+" "+item.label+": "+summarizeEvidenceStage(item))
    .join("\n")
  return {id:challenge.id,stage:index,title:challenge.title,material,question:stage.question,change:stage.change}
}
export function evidenceQuestionProbes(selection:EvidenceSelection):string[]{
  const context=evidenceContext(selection)
  if(!context)return []
  return [
    "Stay with the revealed evidence in '"+context.title+"'; do not invent unprovided measurements or future stages. What exact observation would test the candidate's claim?",
    "Using only the displayed evidence, which inference is justified and which remains uncertain?",
    "Which assumption would need to change to explain the newly revealed condition?",
  ]
}


/**
 * Server-side course validation; challenge IDs are not accepted merely because
 * a browser sent them. Avoid allowing a different discipline's evidence to
 * influence academic assessment.
 */
export function validatedEvidenceContext(course:string,track:string|undefined,selection:EvidenceSelection,turns?:Array<{role:string;text:string}>){
  const expected=evidenceChallengeForCourse(course,track)
  if(selection.challengeId!==expected.id)return null
  const context=evidenceContext(selection)
  if(!context)return null
  if(turns){
    // The client must have introduced the canonical question for the disclosed
    // exhibit, and the candidate must have answered it before feedback uses it.
    const lastReveal=turns.findLastIndex(turn=>turn.role==="interviewer"&&turn.text.includes(context.question))
    if(lastReveal<0||!turns.slice(lastReveal+1).some(turn=>turn.role==="candidate"&&turn.text.trim()))return null
  }
  return context
}

export function evidenceFollowUpProbes(context:EvidenceContext){
  const focus="exhibit "+(context.stage+1)+" of "+context.title
  return {
    clarify:"Looking only at "+focus+", what is one observation that you can state with confidence?",
    justify:"Which exact number, comparison or quotation in "+focus+" supports your claim, and how?",
    verify:"Which data point, alternative reading or measurement in "+focus+" would you check before accepting the claim?",
    revision:"The new "+focus+" may alter an earlier assumption. What changed in your reasoning, and what remains uncertain?",
    assumption:"Which assumption is needed to interpret "+focus+", and how would your conclusion change without it?",
    prediction:"What would you predict from the pattern in "+focus+", and what result would challenge the prediction?",
    alternative:"What other interpretation of "+focus+" is consistent with the evidence, and how could you distinguish it?",
    "stress-test":"Which boundary case or missing control could undermine your explanation of "+focus+"?",
    transfer:"Use the reasoning method from "+focus+" in a new but comparable situation. Which part survives?",
    synthesis:"Across the evidence released so far in "+context.title+", what conclusion is justified, and what remains unresolved?",
  }
}
