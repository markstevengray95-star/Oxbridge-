"use client"
import {useEffect,useState} from "react"
import {Button} from "@/components/ui/button"
import {NativeSelect,NativeSelectOption} from "@/components/ui/native-select"
import {subjectInterviewPathway} from "@/lib/subject-interview-pathways"
import {PROGRESS_KEY} from "@/lib/personal-tutor"
import {liveDifficultyLevels,liveUniversityOptions,liveReasoningTargets,suggestLivePractice,normaliseLivePracticeSettings,type LivePracticeSettings,type LivePracticeSuggestion,type LiveDifficulty,type LiveUniversity} from "@/lib/gemini/live-personalised-practice"

export function LivePracticePreferences({course,track,settings,onChange,disabled=false}:{course:string;track:string;settings:LivePracticeSettings;onChange:(value:LivePracticeSettings)=>void;disabled?:boolean}){
 const pathway=subjectInterviewPathway(course,track)
 const current=normaliseLivePracticeSettings(settings,pathway)
 const [suggestion,setSuggestion]=useState<LivePracticeSuggestion|null>(null)
 useEffect(()=>{
  try{setSuggestion(suggestLivePractice(JSON.parse(localStorage.getItem(PROGRESS_KEY)||"{}").logs,course))}
  catch{setSuggestion(suggestLivePractice([],course))}
 },[course])
 const level=liveDifficultyLevels.find(item=>item.value===current.difficulty)!
 const targets=[...new Set([...liveReasoningTargets,...pathway.reasoningFocus])]
 return <section className="space-y-3 rounded-xl border bg-white p-4" aria-label="Personalise interview">
  <h3 className="font-semibold">Personalise your academic interview</h3>
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="text-sm">University preference<NativeSelect disabled={disabled} value={current.university} onChange={e=>onChange({...current,university:e.target.value as LiveUniversity})}>{liveUniversityOptions.map(item=><NativeSelectOption key={item} value={item}>{item==="Either"?"Either university":item}</NativeSelectOption>)}</NativeSelect></label>
   <label className="text-sm">Starting difficulty<NativeSelect disabled={disabled} value={current.difficulty} onChange={e=>onChange({...current,difficulty:Number(e.target.value) as LiveDifficulty})}>{liveDifficultyLevels.map(item=><NativeSelectOption key={item.value} value={item.value}>{item.value} · {item.label}</NativeSelectOption>)}</NativeSelect><span className="mt-1 block text-xs text-slate-500">{level.description}</span></label>
   <label className="text-sm sm:col-span-2">Academic focus · {pathway.label}<NativeSelect disabled={disabled} value={current.target} onChange={e=>onChange({...current,target:e.target.value})}>{targets.map(item=><NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}</NativeSelect></label>
  </div>
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current.freshProblem} disabled={disabled} onChange={e=>onChange({...current,freshProblem:e.target.checked})}/>Request a fresh opening problem</label>
  {suggestion&&suggestion.sessions>0&&<div className="rounded-lg bg-slate-50 p-3 text-sm"><strong>Suggested next practice: {suggestion.target}</strong><p className="mt-1 text-xs text-slate-600">{suggestion.explanation} Based on {suggestion.sessions} recent local voice sessions and {suggestion.analysableAnswers} analysable responses.</p><Button type="button" size="sm" variant="outline" className="mt-2" disabled={disabled} onClick={()=>onChange({...current,target:suggestion.target,freshProblem:suggestion.freshProblem})}>Use recommendation</Button></div>}
  <p className="text-xs text-slate-500">Difficulty adapts to your demonstrated academic reasoning. University preference is a practice preference, not a verified institution-specific interview format. Fresh questions may still resemble earlier ones.</p>
 </section>
}
