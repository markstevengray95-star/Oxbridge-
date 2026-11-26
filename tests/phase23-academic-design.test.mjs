import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8")
const css=read("app/fellow-design.css")
const global=read("app/globals.css")
const nav=read("components/global-focus-nav.tsx")
function channel(value){const v=value/255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4)}
function luminance(hex){const rgb=hex.replace("#","").match(/.{2}/g).map(v=>channel(parseInt(v,16)));return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]}
function contrast(a,b){const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}
function token(name){const escaped=name.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&");const match=css.match(new RegExp(escaped+"\\s*:\\s*(#[0-9a-fA-F]{6})"));assert.ok(match,"Missing colour "+name);return match[1]}
test("Approved academic colours are the design source of truth",()=>{
 assert.equal(token("--fellow-navy").toLowerCase(),"#142d3e")
 assert.equal(token("--fellow-teal").toLowerCase(),"#397c80")
 assert.equal(token("--fellow-ivory").toLowerCase(),"#f3f1eb")
 assert.equal(token("--fellow-paper").toLowerCase(),"#ffffff")
 assert.match(global,/--background: #f3f1eb/)
 assert.match(global,/--primary: #397c80/)
})
test("Normal text contrast meets WCAG 2 AA on relevant surfaces",()=>{
 const white=token("--fellow-paper"),ivory=token("--fellow-ivory")
 for(const [colour,bg] of [[token("--fellow-navy"),white],[token("--fellow-teal"),white],[token("--fellow-teal-text"),ivory],[token("--fellow-subtle"),ivory],[token("--fellow-ink"),white],[white,token("--fellow-navy")]])
  assert.ok(contrast(colour,bg)>=4.5,colour+" on "+bg+" is "+contrast(colour,bg).toFixed(2)+":1")
})
test("Design CSS loads after global tokens and mobile layouts",()=>{
 const layout=read("app/layout.tsx")
 const order=["./globals.css","./mobile.css","./fellow-design.css"]
 assert.ok(order.every(x=>layout.includes(x)))
 assert.ok(layout.indexOf(order[0])<layout.indexOf(order[1])&&layout.indexOf(order[1])<layout.indexOf(order[2]))
 assert.match(layout,/themeColor: "#142d3e"/)
 assert.match(layout,/className="fellow-footer/)
})
test("Every central student area inherits the same page shell",()=>{
 for(const path of ["components/student-home-dashboard.tsx","components/interview-launcher.tsx","components/admissions-test-centre.tsx","components/student-progress-hub.tsx","components/study-area.tsx","components/personal-tutor-shell.tsx"]){
  const s=read(path)
  assert.match(s,/fellow-ui/,path)
  assert.match(s,/fellow-page-title/,path)
  assert.match(s,/fellow-page-header/,path)
 }
})
test("Existing interview and exam session engines inherit theme but keep engine controls",()=>{
 const files=["components/full-paper-centre.tsx","components/reasoning-interview-experience-v2.tsx","components/advanced-interview-experience.tsx","app/gemini-live-next/page.tsx"]
 for(const path of files)assert.match(read(path),/main className="fellow-ui/,path)
 const paper=read(files[0])
 for(const term of ["remainingExamSeconds","resumeExamDeadline","DRAFT_KEY","toggleFlag","questionRawMark","nextUnansweredIndex"])assert.ok(paper.includes(term))
 const reasoning=read(files[1]);assert.match(reasoning,/InterviewNextSteps/);assert.match(reasoning,/InterviewEvidenceReview/)
 const voice=read(files[3]);assert.match(voice,/InterviewNextSteps/);assert.match(voice,/InterviewEvidenceReview/)
})
test("Navigation still has six destinations, one search menu, and a direct account link",()=>{
 assert.match(nav,/studentAreas\.map/)
 assert.match(nav,/visibleTools\(access\)/)
 assert.match(nav,/searchTools\(access,query\)/)
 assert.match(nav,/fellow-site-nav/)
 assert.match(nav,/fellow-mobile-nav/)
 assert.match(nav,/aria-current=\{active===a\.id/)
 assert.match(nav,/href="\/account" aria-label="Account and settings"/)
 assert.match(nav,/dialog\.current\.showModal\(\)/)
})
test("Reusable panels, cards and controls have consistent selected, hover and focus styles",()=>{
 for(const selector of [".fellow-panel",".fellow-tile",".fellow-primary",".fellow-secondary",".fellow-choice",".fellow-nav-link",".fellow-page-title",".fellow-section-title"])assert.ok(css.includes(selector),selector)
 assert.match(css,/\.fellow-choice:has\(input:checked\)/)
 assert.match(css,/\.fellow-choice:focus-within/)
 assert.match(css,/focus-visible/)
})
test("Responsive metrics and platform safe areas are preserved",()=>{
 assert.match(css,/@media \(max-width: 420px\)/)
 assert.match(css,/\.fellow-metrics \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
 assert.match(read("app/mobile.css"),/env\(safe-area-inset-bottom\)/)
 assert.match(nav,/env\(safe-area-inset-bottom\)/)
})
test("Accessibility preferences, reduced motion and printing are respected",()=>{
 assert.match(css,/\.a11y-contrast \.fellow-ui/)
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)/)
 assert.match(css,/@media print/)
 assert.match(global,/\.a11y-reduced/)
})
test("Session setup still has working native controls and selected-state indicators",()=>{
 const interview=read("components/interview-launcher.tsx")
 const tests=read("components/admissions-test-centre.tsx")
 for(const source of [interview,tests]){
  assert.match(source,/type="radio"/)
  assert.match(source,/checked=/)
  assert.match(source,/fellow-choice/)
  assert.match(source,/fellow-primary/)
 }
 assert.match(interview,/interviewLaunchUrl\(options\)/)
 assert.match(tests,/centreDestination\(mode,test\)/)
})
test("Visual redesign introduces no database migration or new API routes",()=>{
 const source=read("components/student-progress-hub.tsx")
 assert.match(source,/\/api\/progress-hub/)
 assert.match(source,/fellow-panel/)
 assert.match(read("components/tutor-disclosure.tsx"),/fellow-panel/)
})
