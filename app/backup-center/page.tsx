"use client"

import Link from "next/link"
import { ChangeEvent, useState } from "react"
import { ArrowLeft, CheckCircle2, Download, KeyRound, ShieldCheck, Upload } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const STORAGE_KEYS = [
  "oxbridge-tutor-progress-v2",
  "oxbridge-tutor-profile-v2",
  "oxbridge-tutor-accessibility-v1",
  "oxbridge-platform-tasks-v1",
]

type BackupEnvelope = {
  version: 1
  algorithm: "AES-GCM"
  salt: string
  iv: string
  data: string
  created: string
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"])
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
}

async function encryptPayload(payload: unknown, passphrase: string): Promise<BackupEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload)))
  return { version: 1, algorithm: "AES-GCM", salt: bytesToBase64(salt), iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)), created: new Date().toISOString() }
}

async function decryptPayload(envelope: BackupEnvelope, passphrase: string) {
  if (envelope.version !== 1 || envelope.algorithm !== "AES-GCM") throw new Error("Unsupported backup version")
  const salt = base64ToBytes(envelope.salt)
  const iv = base64ToBytes(envelope.iv)
  const key = await deriveKey(passphrase, salt)
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, base64ToBytes(envelope.data) as BufferSource)
  return JSON.parse(dec.decode(decrypted)) as { storage?: Record<string, string | null> }
}

export default function BackupCenterPage() {
  const [passphrase, setPassphrase] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const exportBackup = async () => {
    if (passphrase.length < 8) { setError("Use a passphrase of at least 8 characters before exporting."); return }
    setBusy(true); setError(""); setMessage("")
    try {
      const storage = Object.fromEntries(STORAGE_KEYS.map(key => [key, localStorage.getItem(key)]))
      const envelope = await encryptPayload({ app: "Oxbridge Tutor", exported: new Date().toISOString(), storage }, passphrase)
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `oxbridge-tutor-backup-${new Date().toISOString().slice(0, 10)}.oxbridge.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage("Encrypted backup created. Keep the file and passphrase separately.")
    } catch { setError("The backup could not be created in this browser.") }
    finally { setBusy(false) }
  }

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (passphrase.length < 8) { setError("Enter the passphrase used when the backup was created."); event.target.value = ""; return }
    setBusy(true); setError(""); setMessage("")
    try {
      const envelope = JSON.parse(await file.text()) as BackupEnvelope
      const payload = await decryptPayload(envelope, passphrase)
      const storage = payload.storage ?? {}
      for (const key of STORAGE_KEYS) {
        const value = storage[key]
        if (typeof value === "string") localStorage.setItem(key, value)
      }
      setMessage("Backup restored successfully. Reload the preparation studio to use the restored profile and progress.")
    } catch { setError("Could not restore this backup. Check that the file and passphrase are correct.") }
    finally { setBusy(false); event.target.value = "" }
  }

  return <main className="min-h-screen bg-[#f6f8f8] text-[#172b3a]">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6"><Button asChild variant="ghost"><Link href="/student-home"><ArrowLeft />Student Home</Link></Button><Badge variant="outline"><ShieldCheck className="size-3.5" />Local encryption</Badge></div></header>
    <div className="mx-auto max-w-5xl px-4 py-9 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#147d91]">Backup & move device</p>
      <h1 className="mt-2 font-serif text-4xl font-bold">Take your preparation history with you.</h1>
      <p className="mt-3 max-w-3xl text-slate-600">The backup is encrypted in your browser before it is saved. It includes your local student profile, interview/test progress, application checklist and accessibility settings.</p>

      <Alert className="mt-5"><KeyRound /><AlertTitle>Your passphrase is not stored.</AlertTitle><AlertDescription>If you forget it, the encrypted backup cannot be recovered by the app. Use a passphrase you can remember and keep it separate from the backup file.</AlertDescription></Alert>

      <Card className="mt-5 shadow-none"><CardHeader><CardTitle className="font-serif text-2xl">Backup passphrase</CardTitle><CardDescription>At least 8 characters. The same passphrase is required when importing.</CardDescription></CardHeader><CardContent><input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#147d91] focus:ring-2 focus:ring-[#68c6d0]/30" placeholder="Enter a private passphrase" /></CardContent></Card>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <Card className="shadow-none"><CardHeader><Download className="size-7 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Export encrypted backup</CardTitle><CardDescription>Create a portable file containing the current local app data.</CardDescription></CardHeader><CardContent><Button onClick={exportBackup} disabled={busy || passphrase.length < 8}><Download />Create backup file</Button></CardContent></Card>
        <Card className="shadow-none"><CardHeader><Upload className="size-7 text-[#147d91]" /><CardTitle className="font-serif text-2xl">Restore on this device</CardTitle><CardDescription>Choose an Oxbridge Tutor backup and decrypt it locally using its passphrase.</CardDescription></CardHeader><CardContent><label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-[#147d91] px-4 text-sm font-medium text-white ${busy || passphrase.length < 8 ? "pointer-events-none opacity-50" : ""}`}><Upload className="size-4" />Choose backup<input type="file" accept=".json,.oxbridge.json,application/json" className="hidden" onChange={importBackup} /></label></CardContent></Card>
      </section>

      {message && <Alert className="mt-5 border-emerald-200 bg-emerald-50"><CheckCircle2 /><AlertTitle>Complete</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
      {error && <Alert className="mt-5 border-red-200 bg-red-50"><ShieldCheck /><AlertTitle>Backup not completed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <Card className="mt-5 shadow-none"><CardHeader><CardTitle className="font-serif text-xl">What is included</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2"><p>• Course/university/application-year profile</p><p>• Interview and admissions-test progress</p><p>• Saved mistakes, bookmarks and session history</p><p>• Application checklist completion</p><p>• Accessibility preferences</p><p>• Local-only settings used by the preparation studio</p></CardContent></Card>
    </div>
  </main>
}
