"use client"

import { useEffect, useState } from "react"
import { BarChart3, FileText, Table2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { EvidenceChallenge, EvidenceGraph, EvidenceMedia } from "@/lib/interview-evidence-challenges"

type Props = {
  challenge: EvidenceChallenge
  stageIndex: number
  canReveal: boolean
  onReveal: () => void
  disabled?: boolean
}
const palette=["#147d91","#b45309","#6d28d9","#15803d"]

function EvidencePlot({ graph }: { graph: EvidenceGraph }) {
  const [visible, setVisible] = useState<number[]>(graph.series.map((_,i)=>i))
  useEffect(()=>setVisible(graph.series.map((_,i)=>i)),[graph])
  const xValues=graph.x
  const yValues=graph.series.filter((_,index)=>visible.includes(index)).flatMap(s=>s.values)
  const minX=Math.min(...xValues),maxX=Math.max(...xValues)
  const minY=Math.min(0,...yValues),maxY=Math.max(1,...yValues)
  const rangeX=maxX-minX||1, rangeY=maxY-minY||1
  const left=56,top=20,w=492,h=230
  const mapX=(x:number)=>left+((x-minX)/rangeX)*w
  const mapY=(y:number)=>top+h-((y-minY)/rangeY)*h
  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2" role="group" aria-label="Choose plotted data series">
      {graph.series.map((series,index)=><Button key={series.label} type="button" variant={visible.includes(index)?"default":"outline"} size="sm" onClick={() => setVisible(current=>current.includes(index)?current.length===1?current:current.filter(i=>i!==index):[...current,index])} aria-pressed={visible.includes(index)}>
        <span className="inline-block size-2.5 rounded-full" style={{background:palette[index%palette.length]}} />{series.label}
      </Button>)}
    </div>
    <div className="overflow-x-auto rounded-xl border bg-white p-2">
      <svg viewBox="0 0 570 314" role="img" aria-label={graph.title+"; "+graph.xLabel+" against "+graph.yLabel} className="h-auto min-w-[290px] w-full">
        {[0,.25,.5,.75,1].map(fraction=><g key={fraction}>
          <line x1={left} y1={top+fraction*h} x2={left+w} y2={top+fraction*h} stroke="#e2e8f0"/>
          <text x={left-7} y={top+fraction*h+4} textAnchor="end" fontSize="11" fill="#475569">{Number((maxY-fraction*rangeY).toFixed(2))}</text>
        </g>)}
        <line x1={left} y1={top} x2={left} y2={top+h} stroke="#334155" strokeWidth="1.6" />
        <line x1={left} y1={top+h} x2={left+w} y2={top+h} stroke="#334155" strokeWidth="1.6" />
        {xValues.map((x,index)=><text key={index} x={mapX(x)} y={top+h+17} fontSize="11" textAnchor="middle" fill="#334155">{x}</text>)}
        {graph.series.map((series,index)=>visible.includes(index)?<g key={series.label}>
          <polyline points={series.values.map((v,j)=>mapX(xValues[j])+","+mapY(v)).join(" ")} fill="none" stroke={palette[index%palette.length]} strokeWidth="2.8" strokeLinejoin="round"/>
          {series.values.map((v,j)=><circle key={j} cx={mapX(xValues[j])} cy={mapY(v)} r={4.5} fill={palette[index%palette.length]} stroke="#fff" strokeWidth="1.5"><title>{series.label+": "+graph.xLabel+" "+xValues[j]+", "+graph.yLabel+" "+v}</title></circle>)}
        </g>:null)}
        <text x={left+w/2} y="300" fontSize="12" fill="#334155" textAnchor="middle">{graph.xLabel}</text>
        <text x="15" y={top+h/2} transform={"rotate(-90 15 "+(top+h/2)+")"} fontSize="12" fill="#334155" textAnchor="middle">{graph.yLabel}</text>
      </svg>
    </div>
    <details className="rounded-xl border bg-slate-50 p-3 text-xs"><summary className="cursor-pointer font-semibold">Accessible graph data table</summary><div className="mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-left"><thead><tr><th scope="col" className="border-b p-2">{graph.xLabel}</th>{graph.series.map((series,i)=>visible.includes(i)?<th key={series.label} scope="col" className="border-b p-2">{series.label} ({graph.yLabel})</th>:null)}</tr></thead>
        <tbody>{graph.x.map((x,index)=><tr key={index}><th scope="row" className="border-b p-2">{x}</th>{graph.series.map((series,i)=>visible.includes(i)?<td key={i} className="border-b p-2">{series.values[index]}</td>:null)}</tr>)}</tbody></table>
    </div></details>
  </div>
}
function EvidenceCard({material}:{material:EvidenceMedia}){
  return <div className="space-y-3">
    <div className="flex items-center gap-2 font-semibold text-slate-900">{material.kind==="graph"?<BarChart3 className="size-4"/>:material.kind==="table"?<Table2 className="size-4"/>:<FileText className="size-4"/>}{material.title}</div>
    {material.kind==="graph"?<EvidencePlot graph={material}/>:material.kind==="table"?
      <div className="overflow-x-auto rounded-xl border"><table className="w-full border-collapse text-sm"><thead className="bg-slate-100"><tr>{material.headers.map((head,i)=><th key={i} scope="col" className="border-b px-3 py-2 text-left">{head}</th>)}</tr></thead><tbody>{material.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row" className="border-b px-3 py-2 text-left font-medium">{cell}</th>:<td key={j} className="border-b px-3 py-2">{cell}</td>)}</tr>)}</tbody></table></div>
      :<blockquote className="whitespace-pre-wrap border-l-4 border-cyan-700 bg-slate-50 p-4 text-sm leading-7 text-slate-900">{material.text}</blockquote>}
    <p className="text-xs leading-5 text-slate-500">{material.note}</p>
  </div>
}
export function InterviewEvidencePanel({challenge,stageIndex,canReveal,onReveal,disabled=false}:Props){
  const revealed=stageIndex>=0?challenge.stages.slice(0,stageIndex+1):[]
  const next=challenge.stages[stageIndex+1]
  return <section className="space-y-4 rounded-2xl border border-[#cfe1e4] bg-white p-4" aria-label="Interactive academic evidence">
    <div><p className="text-xs font-bold uppercase tracking-wider text-[#147d91]">Interactive evidence · {Math.max(stageIndex+1,0)}/3</p><h3 className="mt-1 text-lg font-semibold text-[#102a43]">{challenge.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{challenge.introduction}</p></div>
    {revealed.length===0?<p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><EyeOff className="mr-2 inline size-4"/>Evidence is initially unseen. Explain your first response, then reveal the first exhibit.</p>:revealed.map((stage,index)=><details key={index} open={index===stageIndex?true:undefined} className="rounded-xl border bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold text-[#102a43]">Exhibit {index+1}: {stage.label}</summary>
      <div className="mt-3"><EvidenceCard material={stage.material}/></div>
      {index===stageIndex?<div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-900">New interviewer challenge</p><p className="mt-1 text-sm leading-6 text-slate-900">{stage.question}</p></div>:null}
    </details>)}
    {next?<Button type="button" variant="outline" onClick={onReveal} disabled={!canReveal||disabled} className="w-full"><Eye className="size-4"/>{stageIndex<0?"Reveal first unseen exhibit":"Reveal changed evidence"}</Button>:<p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">All three exhibits have been shown. Continue analysing and revising your argument.</p>}
    {next&&!canReveal?<p className="text-xs text-slate-500">Explain your current answer before another exhibit can be revealed.</p>:null}
    <p className="text-xs leading-5 text-slate-500">Original FELLOW practice evidence. No unseen exhibit is used by the interviewer before you choose to reveal it. Explain any diagram or plotted reasoning in your answer or working notes; drawing strokes are not automatically interpreted.</p>
  </section>
}
