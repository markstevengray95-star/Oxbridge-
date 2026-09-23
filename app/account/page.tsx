import Link from "next/link"
import { redirect } from "next/navigation"
import { Brain, ClipboardCheck, CreditCard, GraduationCap, LogOut, Mic2, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signOut } from "./actions"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect("/login")

  const [{ data: profile }, { data: subscription }, interviews, memories, attempts] = await Promise.all([
    supabase.from("profiles").select("display_name,target_university,target_course,application_year").eq("id", userId).maybeSingle(),
    supabase.from("subscriptions").select("tier,status,current_period_end,cancel_at_period_end").eq("user_id", userId).maybeSingle(),
    supabase.from("interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("memory_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
    supabase.from("practice_attempts").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ])

  const tier = subscription?.tier ?? "free"
  const status = subscription?.status ?? "inactive"

  return (
    <main className="min-h-screen bg-[#f2f5f5] px-4 py-7 text-[#172b3a] sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#147d91]">Your account</p><h1 className="font-serif text-3xl font-bold">Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}</h1></div>
          <form action={signOut}><Button variant="outline"><LogOut />Sign out</Button></form>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="size-5 text-[#147d91]" />Plan</CardTitle><CardDescription>Your current access level</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2"><Badge className="bg-[#102a43] text-white">{tier.toUpperCase()}</Badge><span className="text-sm text-[#667984]">{status}</span></div><p className="mt-3 text-sm text-[#667984]">Your saved work remains attached to this account even if your plan changes.</p></CardContent></Card>
          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Mic2 className="size-5 text-[#147d91]" />Interviews</CardTitle><CardDescription>Saved interview sessions</CardDescription></CardHeader><CardContent><p className="font-serif text-4xl font-bold">{interviews.count ?? 0}</p></CardContent></Card>
          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Brain className="size-5 text-[#147d91]" />Learning memory</CardTitle><CardDescription>Active strengths, weaknesses and goals</CardDescription></CardHeader><CardContent><p className="font-serif text-4xl font-bold">{memories.count ?? 0}</p></CardContent></Card>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="font-serif text-2xl">Preparation profile</CardTitle><CardDescription>This information can personalise interview and test preparation.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-[#f6f8f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7b8d96]">University</p><p className="mt-1 font-semibold">{profile?.target_university || "Not set yet"}</p></div><div className="rounded-xl bg-[#f6f8f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7b8d96]">Course</p><p className="mt-1 font-semibold">{profile?.target_course || "Not set yet"}</p></div><div className="rounded-xl bg-[#f6f8f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7b8d96]">Application year</p><p className="mt-1 font-semibold">{profile?.application_year || "Not set yet"}</p></div><div className="rounded-xl bg-[#f6f8f9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7b8d96]">Practice attempts</p><p className="mt-1 font-semibold">{attempts.count ?? 0}</p></div></CardContent></Card>

          <Card className="border-[#dbe5e7]"><CardHeader><CardTitle className="font-serif text-2xl">Continue preparing</CardTitle></CardHeader><CardContent className="space-y-2"><Button className="w-full justify-start" asChild><Link href="/gemini-live-interview"><Mic2 />Live interview</Link></Button><Button className="w-full justify-start" variant="outline" asChild><Link href="/interviews"><Sparkles />Interview hub</Link></Button><Button className="w-full justify-start" variant="outline" asChild><Link href="/tests"><ClipboardCheck />Admissions tests</Link></Button><Button className="w-full justify-start" variant="outline" asChild><Link href="/"><GraduationCap />Home</Link></Button></CardContent></Card>
        </div>
      </div>
    </main>
  )
}
