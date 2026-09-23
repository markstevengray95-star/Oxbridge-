import type { TestQuestion } from "@/lib/oxbridge-data"

export type QualityIssue = { severity:"error"|"warning"; id:string; test:string; message:string }

const normalise = (text:string) => text.toLowerCase().replace(/\d+(?:\.\d+)?/g,"#").replace(/[^a-z#]+/g," ").replace(/\s+/g," ").trim()

export function validateQuestionBank(bank: TestQuestion[]) {
  const issues: QualityIssue[] = []
  const ids = new Map<string,number>()
  const exactPrompts = new Map<string,string[]>()
  const stems = new Map<string,string[]>()

  for (const q of bank) {
    ids.set(q.id,(ids.get(q.id)??0)+1)
    const exact=q.prompt.trim().toLowerCase()
    exactPrompts.set(exact,[...(exactPrompts.get(exact)??[]),q.id])
    const stem=normalise(q.prompt)
    stems.set(stem,[...(stems.get(stem)??[]),q.id])
    if (!q.prompt.trim()) issues.push({severity:"error",id:q.id,test:q.test,message:"Question prompt is empty."})
    if (!Array.isArray(q.options) || q.options.length < 2) issues.push({severity:"error",id:q.id,test:q.test,message:"Question has fewer than two answer options."})
    if (q.answer < 0 || q.answer >= q.options.length) issues.push({severity:"error",id:q.id,test:q.test,message:"Answer index is outside the option list."})
    if (new Set(q.options.map(x=>x.trim().toLowerCase())).size !== q.options.length) issues.push({severity:"error",id:q.id,test:q.test,message:"Question contains duplicate answer options."})
    if (!q.explanation?.trim()) issues.push({severity:"warning",id:q.id,test:q.test,message:"Explanation is empty."})
    if (q.prompt.length < 20) issues.push({severity:"warning",id:q.id,test:q.test,message:"Prompt is unusually short; review for ambiguity."})
    if (q.options.some(opt=>opt.trim().length===0)) issues.push({severity:"error",id:q.id,test:q.test,message:"One or more options are blank."})
  }

  for (const [id,count] of ids) if (count>1) issues.push({severity:"error",id,test:"Multiple",message:`Duplicate question id appears ${count} times.`})
  for (const [,list] of exactPrompts) if (list.length>1) list.slice(1).forEach(id=>issues.push({severity:"warning",id,test:bank.find(q=>q.id===id)?.test??"Unknown",message:`Exact prompt duplicate of ${list[0]}.`}))
  for (const [,list] of stems) if (list.length>4) list.slice(4).forEach(id=>issues.push({severity:"warning",id,test:bank.find(q=>q.id===id)?.test??"Unknown",message:`Highly repeated prompt template; same normalised stem appears ${list.length} times.`}))

  const byTest = Object.fromEntries(Array.from(new Set(bank.map(q=>q.test))).map(test=>{
    const qs=bank.filter(q=>q.test===test)
    return [test,{ total:qs.length, sections:Array.from(new Set(qs.map(q=>q.section))).length, foundation:qs.filter(q=>q.difficulty==="Foundation").length, stretch:qs.filter(q=>q.difficulty==="Stretch").length, challenge:qs.filter(q=>q.difficulty==="Challenge").length, issues:issues.filter(i=>i.test===test).length }]
  }))
  return { issues, byTest, total:bank.length, errorCount:issues.filter(i=>i.severity==="error").length, warningCount:issues.filter(i=>i.severity==="warning").length }
}
