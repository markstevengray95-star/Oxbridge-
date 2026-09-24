"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function AssignmentReflection({ id, initialNote, status, onSaved }: { id: string; initialNote: string; status: "not_started" | "in_progress" | "completed"; onSaved: () => Promise<void> }) {
  const [note, setNote] = useState(initialNote)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  async function save(reopen: boolean) {
    setBusy(true); setMessage("")
    try {
      const response = await fetch("/api/school", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateAssignmentStatus", assignmentId: id, status: reopen ? "in_progress" : status, note }) })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error || "Could not save reflection")
      await onSaved(); setMessage(reopen ? "Task reopened." : "Reflection saved.")
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save reflection") } finally { setBusy(false) }
  }
  return <details className="mt-3 border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">Reflection & next steps{initialNote ? " — saved note" : ""}</summary><label className="mt-3 block text-sm" htmlFor={`reflection-${id}`}>What improved, what needs practice, and what will you do next? This note is shared with your cohort teacher.</label><textarea id={`reflection-${id}`} maxLength={1200} rows={3} className="mt-2 w-full rounded-md border bg-white p-3 text-sm" value={note} onChange={e => setNote(e.target.value)} /><div className="mt-2 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void save(false)}>{busy ? "Saving…" : "Save reflection"}</Button>{status === "completed" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void save(true)}>Reopen for more practice</Button>}<span className="text-xs text-slate-500">{note.length}/1200</span></div><p className="mt-2 text-sm" role="status">{message}</p></details>
}
