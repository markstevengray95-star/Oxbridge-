const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const read = file => fs.readFileSync(path.join(root, file), "utf8")

const migration = read("supabase/migrations/20260927_add_test_results_history.sql")
const mirror = read("components/history-cloud-mirror.tsx")
const layout = read("app/layout.tsx")
const history = read("app/history/page.tsx")
const privacyExport = read("app/api/privacy/export/route.ts")

const requiredMigrationSnippets = [
  "create table if not exists public.test_results",
  "references auth.users(id) on delete cascade",
  "alter table public.test_results enable row level security",
  "users_read_own_test_results",
  "users_insert_own_test_results",
  "users_update_own_test_results",
  "users_delete_own_test_results",
  "(select auth.uid()) = user_id",
]
for (const snippet of requiredMigrationSnippets) {
  if (!migration.includes(snippet)) throw new Error(`Test-result history migration is missing: ${snippet}`)
}

if (!layout.includes("<HistoryCloudMirror />")) throw new Error("HistoryCloudMirror is not mounted globally.")
if (!mirror.includes('.from("interview_sessions")') || !mirror.includes('.from("interview_turns")')) {
  throw new Error("Interview sessions and transcript turns are not mirrored into structured account history.")
}
if (!mirror.includes('.from("test_results")') || !mirror.includes("fullPaperResults")) {
  throw new Error("Completed full-paper results are not mirrored into structured account history.")
}
if (!mirror.includes("/interview|panel/i")) {
  throw new Error("Interview history mirror is not broad enough to capture the app's interview modes.")
}
if (!history.includes('.from("interview_sessions")') || !history.includes('.from("test_results")')) {
  throw new Error("Unified history page does not load both interviews and tests.")
}
if (!history.includes("Full transcript") || !history.includes("Section breakdown") || !history.includes("Questions to review")) {
  throw new Error("Unified history page is missing transcript or test-analysis detail.")
}
if (!history.includes('.eq("user_id", user.id)')) {
  throw new Error("History page must explicitly scope cloud reads to the signed-in user in addition to RLS.")
}
if (!privacyExport.includes('{name:"test_results",ownerColumn:"user_id"}')) {
  throw new Error("Privacy export does not include structured test history.")
}

console.log("PASS: interview transcripts and full-test results are privately mirrored, user-scoped, viewable together, and included in account data export.")
