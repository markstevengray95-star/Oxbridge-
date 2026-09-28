"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Eye, EyeOff, Flag, Grid3X3, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { buildFullPaper, paperCatalog, type FullPaperTest, type PaperForm } from "@/lib/full-paper-system"
import {
  isQuestionAnswered,
  isQuestionFullyCorrect,
  isYesNoStatementQuestion,
  questionMaxMarks,
  questionRawMark,
  setStatementResponse,
  statementAnswerLabel,
  statementResponse,
  type FullPaperQuestion,
} from "@/lib/full-paper-question"

const PROGRESS_KEY = "oxbridge-tutor-progress-v2"
const SIM_DRAFT_KEY = "oxbridge-admissions-simulator-draft-v1"

type Stage = "setup" | "exam" | "review" | "break" | "results"
type Filter = "all" | "unanswered" | "flagged"

type Draft = {
  test: FullPaperTest
  form: PaperForm
  sectionIndex: number
  questionIndex: number
  answers: Record<string,number>
  flags: string[]
  essayResponses: Record<string,string>
  essayPrompts: Record<string,string>
  timeLeft: number
  startedAt: number
  savedAt: number
}

function formatTime(seconds:number){const safe=Math.max(0,seconds);return `${Math.floor(safe/60)}:${String(safe%60).padStart(2,"0")}`}
function words(value:string){return value.trim()?value.trim().split(/\s+/).length:0}
function answerLabel(question:FullPaperQuestion,response:number|undefined){if(isYesNoStatementQuestion(question)){return question.statements.map((_,index)=>{const value=statementResponse(response,index);return `${index+1}: ${value===undefined?"—":value?"Yes":"No"}`}).join(" · ")}return response===undefined?"Unanswered":question.options[response]??"Unanswered"}
function correctLabel(question:FullPaperQuestion){if(isYesNoStatementQuestion(question))return question.statements.map((_,index)=>`${index+1}: ${statementAnswerLabel(question,index)}`).join(" · ");return question.options[question.answer]??""}
function readDraft(){try{return JSON.parse(localStorage.getItem(SIM_DRAFT_KEY)||"null") as Draft|null}catch{return null}}

export default function AdmissionsTestSimulator(){
  const[stage,setStage]=useState<Stage>("setup")
  const[test,setTest]=useState<FullPaperTest>("TMUA")
  const[form,setForm]=useState<PaperForm>(1)
  const[sectionIndex,setSectionIndex]=useState(0)
  const[questionIndex,setQuestionIndex]=useState(0)
  const[answers,setAnswers]=useState<Record<string,number>>({})
  const[flags,setFlags]=useState<string[]>([])
  const[essayResponses,setEssayResponses]=useState<Record<string,string>>({})
  const[essayPrompts,setEssayPrompts]=useState<Record<string,string>>({})
  const[timeLeft,setTimeLeft]=useState(0)
  const[startedAt,setStartedAt]=useState(0)
  const[filter,setFilter]=useState<Filter>("all")
  const[timerVisible,setTimerVisible]=useState(true)
  const[savedDraft,setSavedDraft]=useState<Draft|null>(null)
  const resultSaved=useRef(false)

  const paper=useMemo(()=>buildFullPaper(test,form,["Mathematics 1","Physics","Mathematics 2"]),[test,form])
  const section=paper.sections[sectionIndex]
  const question=section?.kind==="mcq"?section.questions[questionIndex]:undefined
  const essayText=section?.kind==="essay"?(essayResponses[section.id]||""):""
  const answeredCount=section?.kind==="mcq"?section.questions.filter(item=>isQuestionAnswered(item,answers[item.id])).length:essayText.trim()?1:0
  const filteredQuestions=section?.kind==="mcq"?section.questions.map((item,index)=>({item,index})).filter(({item})=>filter==="all"||(filter==="unanswered"&&!isQuestionAnswered(item,answers[item.id]))||(filter==="flagged"&&flags.includes(item.id))):[]

  useEffect(()=>setSavedDraft(readDraft()),[])
  useEffect(()=>{
    if(stage!=="exam")return
    if(timeLeft<=0){setStage("review");return}
    const timer=window.setInterval(()=>setTimeLeft(value=>Math.max(0,value-1)),1000)
    return()=>window.clearInterval(timer)
  },[stage,timeLeft])
  useEffect(()=>{
    if(!["exam","review","break"].includes(stage))return
    const draft:Draft={test,form,sectionIndex,questionIndex,answers,flags,essayResponses,essayPrompts,timeLeft,startedAt,savedAt:Date.now()}
    localStorage.setItem(SIM_DRAFT_KEY,JSON.stringify(draft));setSavedDraft(draft)
  },[stage,test,form,sectionIndex,questionIndex,answers,flags,essayResponses,essayPrompts,timeLeft,startedAt])

  useEffect(()=>{
    if(stage!=="exam"||!section||section.kind!=="mcq")return
    const handler=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null
      if(target?.tagName==="INPUT"||target?.tagName==="TEXTAREA"||target?.tagName==="SELECT")return
      if(event.altKey&&event.key.toLowerCase()==="n"){event.preventDefault();setQuestionIndex(value=>Math.min(section.questions.length-1,value+1));return}
      if(event.altKey&&event.key.toLowerCase()==="p"){event.preventDefault();setQuestionIndex(value=>Math.max(0,value-1));return}
      if(event.altKey&&event.key.toLowerCase()==="f"&&question){event.preventDefault();setFlags(current=>current.includes(question.id)?current.filter(id=>id!==question.id):[...current,question.id]);return}
      if(question&&!isYesNoStatementQuestion(question)&&/^[1-9]$/.test(event.key)){
        const option=Number(event.key)-1
        if(option<question.options.length)setAnswers(current=>({...current,[question.id]:option}))
      }
    }
    window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)
  },[stage,section,question])

  function start(){const first=paper.sections[0];setSectionIndex(0);setQuestionIndex(0);setAnswers({});setFlags([]);setEssayResponses({});setEssayPrompts({});setStartedAt(Date.now());setTimeLeft(first.durationMinutes*60);setStage("exam");resultSaved.current=false}
  function resume(){if(!savedDraft)return;setTest(savedDraft.test);setForm(savedDraft.form);setSectionIndex(savedDraft.sectionIndex);setQuestionIndex(savedDraft.questionIndex);setAnswers(savedDraft.answers);setFlags(savedDraft.flags);setEssayResponses(savedDraft.essayResponses);setEssayPrompts(savedDraft.essayPrompts);setStartedAt(savedDraft.startedAt);setTimeLeft(Math.max(0,savedDraft.timeLeft-Math.floor((Date.now()-savedDraft.savedAt)/1000)));setStage("exam")}
  function toggleFlag(){if(!question)return;setFlags(current=>current.includes(question.id)?current.filter(id=>id!==question.id):[...current,question.id])}
  function submitSection(){setStage("review")}
  function lockSection(){if(sectionIndex>=paper.sections.length-1){localStorage.removeItem(SIM_DRAFT_KEY);setStage("results");return}setStage("break")}
  function nextSection(){const next=paper.sections[sectionIndex+1];if(!next){setStage("results");return}setSectionIndex(value=>value+1);setQuestionIndex(0);setTimeLeft(next.durationMinutes*60);setFilter("all");setStage("exam")}
  function reset(){localStorage.removeItem(SIM_DRAFT_KEY);setSavedDraft(null);setStage("setup");setAnswers({});setFlags([]);setSectionIndex(0);setQuestionIndex(0);setTimeLeft(0)}

  const scoredQuestions=paper.sections.flatMap(item=>item.kind==="mcq"?item.questions:[])
  const rawScore=scoredQuestions.reduce((sum,item)=>sum+questionRawMark(item,answers[item.id]),0)
  const maxScore=scoredQuestions.reduce((sum,item)=>sum+questionMaxMarks(item),0)

  useEffect(()=>{
    if(stage!=="results"||resultSaved.current)return
    resultSaved.current=true
    try{
      const progress=JSON.parse(localStorage.getItem(PROGRESS_KEY)||"{}") as Record<string,unknown>
      const old=Array.isArray(progress.fullPaperResults)?progress.fullPaperResults:[]
      const questionReview=paper.sections.flatMap(item=>item.kind==="mcq"?item.questions.map(q=>({questionId:q.id,section:item.title,difficulty:q.difficulty,prompt:q.prompt,answer:answerLabel(q,answers[q.id]),correctAnswer:correctLabel(q),rawMark:questionRawMark(q,answers[q.id]),maxMarks:questionMaxMarks(q),correct:isQuestionFullyCorrect(q,answers[q.id])})):[])
      const completed={id:`sim-${paper.id}-${Date.now()}`,test:paper.test,form:paper.form,title:`${paper.title} · interface simulation`,date:new Date().toISOString(),rawScore,maxRawMarks:maxScore,totalQuestions:scoredQuestions.length,accuracy:maxScore?Math.round(rawScore/maxScore*100):0,durationSeconds:startedAt?Math.round((Date.now()-startedAt)/1000):null,questionReview,essayPrompts,essayResponses,source:"admissions-test-simulator"}
      localStorage.setItem(PROGRESS_KEY,JSON.stringify({...progress,fullPapersCompleted:Number(progress.fullPapersCompleted??0)+1,fullPaperResults:[completed,...old].slice(0,30)}))
    }catch{}
  },[stage,paper,answers,rawScore,maxScore,scoredQuestions.length,startedAt,essayPrompts,essayResponses])

  if(stage==="setup")return <main className="min-h-screen bg-slate-100 text-slate-950"><header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4"><Link href="/student-home" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4"/>Student Home</Link><Badge className="bg-white/10 text-white">Admissions Test Simulator</Badge></div></header><div className="mx-auto max-w-6xl space-y-6 px-4 py-10"><section><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Focused interface practice</p><h1 className="mt-2 font-serif text-4xl font-bold">Practise the test conditions as well as the questions.</h1><p className="mt-3 max-w-3xl text-slate-600">A neutral practice interface with timed sections, question navigator, flags, review-before-submit, keyboard navigation and locked completed sections. It does not claim to reproduce any provider interface exactly.</p></section>{savedDraft&&<Card className="border-blue-200 bg-blue-50"><CardContent className="flex items-center justify-between gap-4 p-5"><div><strong>Saved simulation found</strong><p className="text-sm text-slate-600">{savedDraft.test} · Form {savedDraft.form}</p></div><Button onClick={resume}>Resume</Button></CardContent></Card>}<Card><CardHeader><CardTitle className="font-serif text-2xl">Configure simulation</CardTitle><CardDescription>{paper.note}</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Test</span><NativeSelect value={test} onChange={event=>setTest(event.target.value as FullPaperTest)}>{paperCatalog.map(item=><NativeSelectOption key={item.test} value={item.test}>{item.test} · {item.title}</NativeSelectOption>)}</NativeSelect></label><label><span className="mb-1 block text-xs font-bold uppercase text-slate-500">Practice form</span><NativeSelect value={String(form)} onChange={event=>setForm(Number(event.target.value) as PaperForm)}><NativeSelectOption value="1">Form 1</NativeSelectOption><NativeSelectOption value="2">Form 2</NativeSelectOption></NativeSelect></label><div className="sm:col-span-2 grid gap-3 md:grid-cols-3">{paper.sections.map(item=><div key={item.id} className="rounded-xl border bg-slate-50 p-4"><strong>{item.title}</strong><p className="mt-1 text-sm text-slate-500">{item.durationMinutes} min · {item.kind==="mcq"?`${item.questions.length} questions`:"writing task"}</p></div>)}</div><div className="sm:col-span-2"><Button size="lg" onClick={start}><Clock3/>Start simulation</Button></div></CardContent></Card></div></main>

  if(!section)return null
  if(stage==="break")return <main className="min-h-screen bg-slate-100 p-4"><div className="mx-auto max-w-2xl py-20"><Card><CardHeader><Badge className="w-fit">Section locked</Badge><CardTitle className="font-serif text-3xl">Section submitted</CardTitle><CardDescription>You cannot return to it in this simulation.</CardDescription></CardHeader><CardContent><Button onClick={nextSection}>Start next section <ArrowRight/></Button></CardContent></Card></div></main>
  if(stage==="results")return <main className="min-h-screen bg-slate-100 text-slate-950"><div className="mx-auto max-w-5xl space-y-5 px-4 py-10"><div className="flex items-center justify-between"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft/>Student Home</Link></Button><Badge>Simulation complete</Badge></div><Card><CardHeader><CardTitle className="font-serif text-3xl">{rawScore}/{maxScore} raw marks</CardTitle><CardDescription>Practice result only. Incorrect and partial-credit items are now available in Mistake Replay.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button asChild><Link href="/mistake-replay"><RotateCcw/>Replay mistakes</Link></Button><Button variant="outline" onClick={reset}>New simulation</Button><Button variant="outline" asChild><Link href="/test-results">Test history</Link></Button></CardContent></Card></div></main>

  if(stage==="review")return <main className="min-h-screen bg-slate-100 text-slate-950"><div className="mx-auto max-w-5xl space-y-5 px-4 py-10"><Card><CardHeader><Badge className="w-fit">Review before submit</Badge><CardTitle className="font-serif text-3xl">{section.title}</CardTitle><CardDescription>Check unanswered and flagged items. Correct answers remain hidden until the paper is finished.</CardDescription></CardHeader><CardContent className="space-y-4">{section.kind==="mcq"?<><div className="grid grid-cols-6 gap-2 sm:grid-cols-10">{section.questions.map((item,index)=>{const answered=isQuestionAnswered(item,answers[item.id]);return <button key={item.id} onClick={()=>{setQuestionIndex(index);setStage("exam")}} className={`relative rounded-lg border p-3 text-sm font-bold ${answered?"bg-emerald-50":"bg-white"}`}>{index+1}{flags.includes(item.id)&&<Flag className="absolute -right-1 -top-1 size-3 fill-current text-amber-600"/>}</button>})}</div><div className="grid gap-2 sm:grid-cols-3"><Metric label="Answered" value={`${answeredCount}/${section.questions.length}`}/><Metric label="Unanswered" value={String(section.questions.length-answeredCount)}/><Metric label="Flagged" value={String(section.questions.filter(item=>flags.includes(item.id)).length)}/></div></>:<Metric label="Words" value={String(words(essayText))}/>}<div className="flex flex-wrap justify-between gap-2"><Button variant="outline" onClick={()=>setStage("exam")}>Return to section</Button><Button onClick={lockSection}><CheckCircle2/>Submit and lock section</Button></div></CardContent></Card></div></main>

  return <main className="min-h-screen bg-slate-100 text-slate-950"><header className="sticky top-0 z-40 border-b bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3"><div className="mr-auto"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{paper.test} · Practice Form {paper.form}</p><p className="font-semibold">{section.title}</p></div><Badge variant="outline">Section {sectionIndex+1}/{paper.sections.length}</Badge><Button size="sm" variant="ghost" onClick={()=>setTimerVisible(value=>!value)}>{timerVisible?<EyeOff className="size-4"/>:<Eye className="size-4"/>}{timerVisible?"Hide time":"Show time"}</Button>{timerVisible&&<div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono font-bold ${timeLeft<=300?"border-amber-300 bg-amber-50":""}`}><Clock3 className="size-4"/>{formatTime(timeLeft)}</div>}</div></header><div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 xl:grid-cols-[1fr_320px]"><section><Card className="shadow-none"><CardHeader className="border-b"><CardDescription>{section.instructions}</CardDescription>{section.kind==="mcq"&&<><div className="flex items-center justify-between gap-3"><Badge>Question {questionIndex+1} of {section.questions.length}</Badge>{question&&<Button size="sm" variant={flags.includes(question.id)?"default":"outline"} onClick={toggleFlag}><Flag className={flags.includes(question.id)?"fill-current":""}/>{flags.includes(question.id)?"Flagged":"Flag"}</Button>}</div><Progress value={(questionIndex+1)/section.questions.length*100}/></>}</CardHeader><CardContent className="space-y-4 p-5 sm:p-7">{section.kind==="mcq"&&question?<><h2 className="whitespace-pre-line font-serif text-2xl font-bold leading-snug">{question.prompt}</h2>{isYesNoStatementQuestion(question)?<div className="space-y-3">{question.statements.map((statement,index)=>{const selected=statementResponse(answers[question.id],index);return <div key={index} className="rounded-xl border bg-white p-4"><p className="font-medium">{index+1}. {statement}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>setAnswers(current=>({...current,[question.id]:setStatementResponse(current[question.id],index,true)}))} className={`rounded-lg border p-2 font-semibold ${selected===true?"border-blue-600 bg-blue-50":""}`}>Yes</button><button onClick={()=>setAnswers(current=>({...current,[question.id]:setStatementResponse(current[question.id],index,false)}))} className={`rounded-lg border p-2 font-semibold ${selected===false?"border-blue-600 bg-blue-50":""}`}>No</button></div></div>})}</div>:<div className="space-y-3">{question.options.map((option,index)=><button key={index} onClick={()=>setAnswers(current=>({...current,[question.id]:index}))} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left ${answers[question.id]===index?"border-blue-600 bg-blue-50 ring-1 ring-blue-200":"bg-white hover:border-slate-400"}`}><span className="grid size-8 shrink-0 place-items-center rounded-full border bg-white text-sm font-bold">{String.fromCharCode(65+index)}</span><span>{option}</span></button>)}</div>}<div className="flex justify-between pt-3"><Button variant="outline" disabled={questionIndex===0} onClick={()=>setQuestionIndex(value=>Math.max(0,value-1))}>Previous</Button><Button disabled={questionIndex===section.questions.length-1} onClick={()=>setQuestionIndex(value=>Math.min(section.questions.length-1,value+1))}>Next <ArrowRight/></Button></div></>:section.kind==="essay"?<><div className="space-y-2"><p className="font-serif text-2xl font-bold">Choose one prompt</p>{section.essayChoices?.map(prompt=><button key={prompt} onClick={()=>setEssayPrompts(current=>({...current,[section.id]:prompt}))} className={`w-full rounded-xl border p-4 text-left ${essayPrompts[section.id]===prompt?"border-blue-600 bg-blue-50":"bg-white"}`}>{prompt}</button>)}</div><Textarea className="min-h-[380px]" value={essayText} onChange={event=>setEssayResponses(current=>({...current,[section.id]:event.target.value}))} placeholder="Write your response here…"/><p className="text-sm text-slate-500">{words(essayText)} words</p></>:null}</CardContent></Card></section><aside className="space-y-4"><Card><CardHeader><div className="flex items-center gap-2"><Grid3X3 className="size-4"/><CardTitle className="text-lg">Question navigator</CardTitle></div></CardHeader><CardContent className="space-y-3">{section.kind==="mcq"?<><div className="grid grid-cols-3 gap-1"><Button size="sm" variant={filter==="all"?"default":"outline"} onClick={()=>setFilter("all")}>All</Button><Button size="sm" variant={filter==="unanswered"?"default":"outline"} onClick={()=>setFilter("unanswered")}>Open</Button><Button size="sm" variant={filter==="flagged"?"default":"outline"} onClick={()=>setFilter("flagged")}>Flagged</Button></div><div className="grid grid-cols-5 gap-2">{filteredQuestions.map(({item,index})=><button key={item.id} onClick={()=>setQuestionIndex(index)} className={`relative rounded-lg border p-2 text-sm font-bold ${index===questionIndex?"border-blue-600 bg-blue-50":isQuestionAnswered(item,answers[item.id])?"border-emerald-200 bg-emerald-50":"bg-white"}`}>{index+1}{flags.includes(item.id)&&<Flag className="absolute -right-1 -top-1 size-3 fill-current text-amber-600"/>}</button>)}</div></>:<p className="text-sm text-slate-600">Writing task · {words(essayText)} words</p>}</CardContent></Card><Card><CardContent className="space-y-3 p-4"><div className="flex justify-between text-sm"><span>Answered</span><strong>{section.kind==="mcq"?`${answeredCount}/${section.questions.length}`:essayText.trim()?"1/1":"0/1"}</strong></div><Button className="w-full" onClick={submitSection}>Review section</Button><div className="border-t pt-3 text-xs leading-5 text-slate-500"><strong>Keyboard:</strong> Alt+N next · Alt+P previous · Alt+F flag · number keys choose single-answer options.</div></CardContent></Card></aside></div></main>
}

function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>}
