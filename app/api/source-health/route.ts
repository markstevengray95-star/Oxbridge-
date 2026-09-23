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

export async function GET(){
  const checkedAt=new Date().toISOString()
  const results=await Promise.all(sources.map(async source=>{
    try{
      const res=await fetch(source.url,{cache:"no-store",headers:{"User-Agent":"OxbridgeTutorSourceHealth/1.0"},signal:AbortSignal.timeout(8000)})
      const text=(await res.text()).slice(0,500_000)
      const lower=text.toLowerCase()
      const matched=source.expected.filter(term=>lower.includes(term.toLowerCase()))
      return { ...source, status:res.status, ok:res.ok, matched, expectedCount:source.expected.length, looksExpected:res.ok&&matched.length===source.expected.length, finalUrl:res.url||source.url }
    }catch(e){return{...source,status:0,ok:false,matched:[],expectedCount:source.expected.length,looksExpected:false,finalUrl:source.url,error:e instanceof Error?e.message:"Fetch failed"}}
  }))
  return NextResponse.json({checkedAt,results,note:"Reachability and expected-word checks can flag sources for human review; they do not prove that application requirements are unchanged."})
}
