const assert = require('node:assert/strict')
const fs = require('node:fs')

const migration = fs.readFileSync('supabase/migrations/20260929_restore_school_classroom_tables.sql', 'utf8')
const insights = fs.readFileSync('app/school-insights/page.tsx', 'utf8')
const mockDay = fs.readFileSync('app/mock-day/page.tsx', 'utf8')
const mistakeEngine = fs.readFileSync('lib/mistake-intelligence.ts', 'utf8')
const mistakePage = fs.readFileSync('app/mistake-intelligence/page.tsx', 'utf8')
const deadlines = fs.readFileSync('app/deadline-command-centre/page.tsx', 'utf8')
const schoolLayout = fs.readFileSync('app/school-dashboard/layout.tsx', 'utf8')
const mistakeLayout = fs.readFileSync('app/mistake-dna/layout.tsx', 'utf8')
const timelineLayout = fs.readFileSync('app/timeline/layout.tsx', 'utf8')

// Classroom backend must exist and remain server-only behind /api/school.
for (const table of ['school_cohorts','school_memberships','school_assignments','school_assignment_progress','school_assignment_submissions']) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}`, 'i'))
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
  assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'))
  assert.match(migration, new RegExp(`grant all on table public\\.${table} to service_role`, 'i'))
}
assert.match(insights, /fetch\("\/api\/school"/)
assert.match(insights, /action: "createAssignment"/)
assert.match(insights, /Class-wide recurring priorities/)
assert.match(insights, /Differentiated next-step map/)
assert.match(schoolLayout, /href="\/school-insights"/)

// Mock day must be one sequenced journey, including unseen work, written reasoning and two interviews.
assert.match(mockDay, /Unseen briefing/)
assert.match(mockDay, /Timed reasoning task/)
assert.match(mockDay, /Interview 1/)
assert.match(mockDay, /Interview 2 · different academic/)
assert.match(mockDay, /\/panel-interview/)
assert.match(mockDay, /\/interview-feedback/)
assert.match(mockDay, /unlocked\(index/)
assert.match(mockDay, /oxbridge-mock-day-context-v1/)

// Mistake Intelligence must diagnose causes and track change over time.
for (const cause of ['omission','interpretation','evidence','method','execution','assumption','evaluation','checking']) assert.match(mistakeEngine, new RegExp(`${cause}:`))
assert.match(mistakeEngine, /recentRate/)
assert.match(mistakeEngine, /earlierRate/)
assert.match(mistakeEngine, /"improving" \| "stable" \| "worsening" \| "new"/)
assert.match(mistakePage, /buildMistakeIntelligence/)
assert.match(mistakePage, /Root-cause diagnosis/)
assert.match(mistakeLayout, /href="\/mistake-intelligence"/)

// Deadline Command Centre must preserve sourced official tasks while supporting internal deadlines and export.
assert.match(deadlines, /tasksFor\(/)
assert.match(deadlines, /oxbridge-custom-deadlines-v1/)
assert.match(deadlines, /School deadline/)
assert.match(deadlines, /Personal target/)
assert.match(deadlines, /BEGIN:VCALENDAR/)
assert.match(deadlines, /officialUrl/)
assert.match(deadlines, /Export calendar/)
assert.match(timelineLayout, /href="\/deadline-command-centre"/)

console.log('PASS: classroom backend, Classroom Intelligence, sequenced Mock Admissions Day, root-cause Mistake Intelligence and Deadline Command Centre are integrated')
