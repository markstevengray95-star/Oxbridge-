"use client"

import { useEffect, useState } from "react"
import { Calculator, Delete, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type Operator = "+" | "−" | "×" | "÷"

function applyOperation(left: number, right: number, operator: Operator) {
  if (operator === "+") return left + right
  if (operator === "−") return left - right
  if (operator === "×") return left * right
  if (right === 0) return Number.NaN
  return left / right
}

function renderNumber(value: number) {
  if (!Number.isFinite(value)) return "Error"
  const rounded = Math.abs(value) >= 1e12 ? value.toExponential(8) : Number(value.toPrecision(12)).toString()
  return rounded.length > 16 ? Number(value.toPrecision(9)).toString() : rounded
}

export function UcatBasicCalculator() {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState("0")
  const [stored, setStored] = useState<number | null>(null)
  const [operator, setOperator] = useState<Operator | null>(null)
  const [replaceDisplay, setReplaceDisplay] = useState(true)

  function clear() {
    setDisplay("0")
    setStored(null)
    setOperator(null)
    setReplaceDisplay(true)
  }

  function inputDigit(digit: string) {
    if (display === "Error" || replaceDisplay) {
      setDisplay(digit)
      setReplaceDisplay(false)
      return
    }
    if (display.replace(/[-.]/g, "").length >= 12) return
    setDisplay(current => current === "0" ? digit : `${current}${digit}`)
  }

  function inputDecimal() {
    if (display === "Error" || replaceDisplay) {
      setDisplay("0.")
      setReplaceDisplay(false)
      return
    }
    if (!display.includes(".")) setDisplay(current => `${current}.`)
  }

  function toggleSign() {
    if (display === "Error" || display === "0") return
    setDisplay(current => current.startsWith("-") ? current.slice(1) : `-${current}`)
  }

  function backspace() {
    if (display === "Error" || replaceDisplay) return
    setDisplay(current => {
      const next = current.slice(0, -1)
      return next === "" || next === "-" ? "0" : next
    })
  }

  function calculatePending(nextOperator?: Operator) {
    const current = Number(display)
    if (!Number.isFinite(current)) {
      clear()
      return
    }

    if (stored === null || operator === null) {
      setStored(current)
      setOperator(nextOperator ?? null)
      setReplaceDisplay(true)
      return
    }

    const result = applyOperation(stored, current, operator)
    const rendered = renderNumber(result)
    setDisplay(rendered)
    setStored(Number.isFinite(result) ? result : null)
    setOperator(Number.isFinite(result) ? nextOperator ?? null : null)
    setReplaceDisplay(true)
  }

  function chooseOperator(nextOperator: Operator) {
    if (display === "Error") return clear()
    if (operator && replaceDisplay) {
      setOperator(nextOperator)
      return
    }
    calculatePending(nextOperator)
  }

  function equals() {
    if (!operator || stored === null || display === "Error") return
    calculatePending()
  }

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) { event.preventDefault(); inputDigit(event.key); return }
      if (event.key === ".") { event.preventDefault(); inputDecimal(); return }
      if (event.key === "+") { event.preventDefault(); chooseOperator("+"); return }
      if (event.key === "-") { event.preventDefault(); chooseOperator("−"); return }
      if (event.key === "*") { event.preventDefault(); chooseOperator("×"); return }
      if (event.key === "/") { event.preventDefault(); chooseOperator("÷"); return }
      if (event.key === "Enter" || event.key === "=") { event.preventDefault(); equals(); return }
      if (event.key === "Backspace") { event.preventDefault(); backspace(); return }
      if (event.key === "Escape") { event.preventDefault(); setOpen(false) }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  })

  const keys: Array<{ label: string; action: () => void; wide?: boolean }> = [
    { label: "C", action: clear },
    { label: "+/−", action: toggleSign },
    { label: "⌫", action: backspace },
    { label: "÷", action: () => chooseOperator("÷") },
    { label: "7", action: () => inputDigit("7") },
    { label: "8", action: () => inputDigit("8") },
    { label: "9", action: () => inputDigit("9") },
    { label: "×", action: () => chooseOperator("×") },
    { label: "4", action: () => inputDigit("4") },
    { label: "5", action: () => inputDigit("5") },
    { label: "6", action: () => inputDigit("6") },
    { label: "−", action: () => chooseOperator("−") },
    { label: "1", action: () => inputDigit("1") },
    { label: "2", action: () => inputDigit("2") },
    { label: "3", action: () => inputDigit("3") },
    { label: "+", action: () => chooseOperator("+") },
    { label: "0", action: () => inputDigit("0"), wide: true },
    { label: ".", action: inputDecimal },
    { label: "=", action: equals },
  ]

  return <>
    <Button type="button" size="sm" variant="outline" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Open UCAT basic calculator">
      <Calculator className="size-4" />Calculator
    </Button>
    {open && <div className="fixed right-4 top-24 z-[140] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border bg-white p-3 shadow-2xl" role="dialog" aria-label="UCAT basic calculator">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><p className="text-sm font-bold">Basic calculator</p><p className="text-xs text-slate-500">DM / QR practice tool</p></div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close calculator"><X className="size-4" /></button>
      </div>
      <div className="mb-3 rounded-xl border bg-slate-950 px-3 py-3 text-right font-mono text-2xl font-bold text-white" aria-live="polite">{display}</div>
      <div className="grid grid-cols-4 gap-2">
        {keys.map(key => <button key={key.label} type="button" onClick={key.action} className={`${key.wide ? "col-span-2" : ""} min-h-11 rounded-lg border bg-white px-3 py-2 font-semibold shadow-sm transition hover:bg-slate-50 active:translate-y-px`} aria-label={key.label === "⌫" ? "Backspace" : key.label}>
          {key.label === "⌫" ? <Delete className="mx-auto size-4" /> : key.label}
        </button>)}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Basic four-function calculator for UCAT practice. Keyboard: 0–9, +, −, *, /, Enter and Backspace.</p>
    </div>}
  </>
}
