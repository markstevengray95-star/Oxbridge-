import { createHash } from "node:crypto"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sources = [
  { id:"oxford-tests", label:"Oxford admissions tests", url:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/admissions-tests", expected:["admissions tests","Oxford"] },
  { id:"oxford-interviews", label:"Oxford interviews", url:"https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/interviews", expected:["interview","Oxford"] },
  { id:"oxford-timeline", label:"Oxford application timeline", url:"https://www.ox.ac.uk/admissions/undergraduate/applying/admissions-timeline", expected:["timeline","application"] },
  { id:"cambridge-tests", label:"Cambridge admissions tests", url:"https://www.undergraduate.study.cam.ac.uk/apply/how/admission-tests", expected:["admission","test"] },
  { id:"cambridge-assessments", label:"Cambridge College assessments", url:"https://www.undergraduate.study.cam.ac.uk/apply/after/college-assessments", expected:["College","assessment"] },
  { id:"cambridge-interviews", label:"Cambridge interviews", url:"https://www.undergraduate.study.cam.ac.uk/apply/after/cambridge-interviews", expected:["interview","Cambridge"] },
  { id:"uat", label:"UAT-UK preparation", url:"https://esat-tmua.ac.uk/prepare/", expected:["ESAT","TMUA"] },
  { id:"lnat", label:"LNAT practice", url:"https://lnat.ac.uk/how-to-prepare/practice-test/", expected:["LNAT","practice"] },
  { id:"ucat", label:"UCAT practice", url:"https://www.ucat.ac.uk/prepare/practice-tests/", expected:["UCAT","practice"] },
]

function fingerprintHtml(html: string) {
  const stable = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220_000)
  return createHash("sha256").update(stable).digest("hex").slice(0, 20)
}

export async function GET(){
  const checkedAt=new Date().toISOString()
  const results=await Promise.all(sources.map(async source=>{
    try{
      const res=await fetch(source.url,{cache:"no-store",headers:{"User-Agent":"OxbridgeTutorSourceHealth/2.0"},signal:AbortSignal.timeout(8000)})
      const text=(await res.text()).slice(0,500_000)
      const lower=text.toLowerCase()
      const matched=source.expected.filter(term=>lower.includes(term.toLowerCase()))
      return { ...source, status:res.status, ok:res.ok, matched, expectedCount:source.expected.length, looksExpected:res.ok&&matched.length===source.expected.length, finalUrl:res.url||source.url, fingerprint:fingerprintHtml(text) }
    }catch(e){return{...source,status:0,ok:false,matched:[],expectedCount:source.expected.length,looksExpected:false,finalUrl:source.url,fingerprint:"",error:e instanceof Error?e.message:"Fetch failed"}}
  }))
  return NextResponse.json({checkedAt,results,note:"Reachability, expected-word checks and content fingerprints can flag sources for human review; they do not prove that application requirements are unchanged."})
}
