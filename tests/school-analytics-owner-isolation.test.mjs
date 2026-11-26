import test from "node:test"
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
const route=readFileSync(new URL("../app/api/school/analytics/route.ts",import.meta.url),"utf8")
test("owner identity is server-derived, never client-supplied",()=>{
 assert.match(route,/auth\.getClaims\(\)/)
 assert.match(route,/\.eq\("owner_user_id", userId\)/)
 assert.doesNotMatch(route,/request\.json\(\)/)
})
test("owned cohort scope is checked before reading related learner assignments",()=>{
 const owner=route.indexOf('.eq("owner_user_id",organization.owner_user_id)')
 const assignments=route.indexOf('.in("cohort_id",cohortIds)',owner)
 assert.ok(owner>=0)
 assert.ok(assignments>owner)
 assert.match(route,/if\(cohortError\)return NextResponse\.json/)
 assert.match(route,/if\(assignmentLookup\.error\)return NextResponse\.json/)
})
test("queries for school membership and assignment progress use verified identifiers",()=>{
 assert.match(route,/school_memberships"\).*?\.in\("user_id",userIds\)\.in\("cohort_id",cohortIds\)/s)
 assert.match(route,/school_assignment_progress"\).*?\.in\("user_id",userIds\)\.in\("assignment_id",assignmentIds\)/s)
 assert.doesNotMatch(route,/new Set\(cohortMemberships\.map/)
 assert.match(route,/cohortIds\.length/)
 assert.match(route,/assignmentIds\.length/)
})
test("only eligible assignments can count as completed",()=>{
 assert.match(route,/eligibleIds=new Set/)
 assert.match(route,/eligibleIds\.has\(row\.assignment_id\)/)
 assert.match(route,/!assignment\.target_user_id\|\|assignment\.target_user_id===member\.user_id/)
})
test("failed data reads fail closed rather than silently producing empty records",()=>{
 assert.match(route,/School records could not be verified/)
 assert.match(route,/status:503/)
 assert.match(route,/if\(profilesResult\.error\|\|intelligenceResult\.error\|\|usageResult\.error/)
})
