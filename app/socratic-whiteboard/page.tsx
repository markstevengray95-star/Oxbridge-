"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Eraser, Mic, RotateCcw, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { detectReasoningSignals, WHITEBOARD_KEY } from "@/lib/digital-twin-2"

export default function SocraticWhiteboardPage(){
  const canvasRef=useRef<HTMLCanvasElement|null>(null); const drawing=useRef(false); const [thoughts,setThoughts]=useState(""); const [prompt,setPrompt]=useState("A graph appears linear over the measured range. What assumptions would you need before extrapolating it beyond the data?")
  const signals=detectReasoningSignals(thoughts)
  useEffect(()=>{const c=canvasRef.current;if(!c)return;const ctx=c.getContext("2d");if(ctx){ctx.lineWidth=2;ctx.lineCap="round";ctx.strokeStyle="#172b3a"}},[])
  const point=(e:React.PointerEvent<HTMLCanvasElement>)=>{const c=canvasRef.current!;const r=c.getBoundingClientRect();return {x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}}
  const down=(e:React.PointerEvent<HTMLCanvasElement>)=>{drawing.current=true;const p=point(e);const ctx=canvasRef.current?.getContext("2d");ctx?.beginPath();ctx?.moveTo(p.x,p.y);e.currentTarget.setPointerCapture(e.pointerId)}
  const move=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(!drawing.current)return;const p=point(e);const ctx=canvasRef.current?.getContext("2d");ctx?.lineTo(p.x,p.y);ctx?.stroke()}
  const up=()=>{drawing.current=false}
  const clear=()=>{const c=canvasRef.current;c?.getContext("2d")?.clearRect(0,0,c.width,c.height)}
  const save=()=>{const image=canvasRef.current?.toDataURL("image/png")||"";const session={prompt,thoughts,signals,image,createdAt:new Date().toISOString()};const old=JSON.parse(localStorage.getItem(WHITEBOARD_KEY)||"[]");localStorage.setItem(WHITEBOARD_KEY,JSON.stringify([session,...(Array.isArray(old)?old:[])].slice(0,20)))}
  return <main className="min-h-screen bg-[#f4f7f7] px-4 py-8 text-[#172b3a]"><div className="mx-auto max-w-7xl space-y-5"><Link href="/digital-twin" className="inline-flex items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4"/>Digital Twin</Link><div><Badge>Think aloud</Badge><h1 className="mt-3 font-serif text-4xl font-bold">AI Socratic Whiteboard</h1><p className="mt-2 max-w-3xl text-slate-600">Draw, calculate and explain your thinking. The app tracks reasoning behaviours such as assumptions, counterexamples, self-correction and sanity checking.</p></div><Card><CardHeader><CardTitle>Interviewer prompt</CardTitle></CardHeader><CardContent><Textarea value={prompt} onChange={e=>setPrompt(e.target.value)} /></CardContent></Card><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Working</CardTitle><div className="flex gap-2"><Button variant="outline" size="sm" onClick={clear}><Eraser/>Clear</Button><Button size="sm" onClick={save}><Save/>Save</Button></div></div></CardHeader><CardContent><canvas ref={canvasRef} width={1200} height={700} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="h-[420px] w-full touch-none rounded-xl border bg-white"/></CardContent></Card><div className="space-y-5"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Mic className="size-5"/>Think-aloud transcript</CardTitle></CardHeader><CardContent><Textarea value={thoughts} onChange={e=>setThoughts(e.target.value)} className="min-h-48" placeholder="Explain what you notice, assume, test, revise and check..."/></CardContent></Card><Card><CardHeader><CardTitle>Reasoning signals</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{signals.length?signals.map(s=><Badge key={s} variant="outline">{s}</Badge>):<p className="text-sm text-slate-500">No strong reasoning signals yet. Try making assumptions and checks explicit.</p>}</CardContent></Card><Button variant="outline" className="w-full" onClick={()=>setPrompt("You are given a new piece of evidence that conflicts with your first model. Which part of your reasoning should change first, and which part can remain?")}><RotateCcw/>Introduce new evidence</Button></div></div></div></main>
}
