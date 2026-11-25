export type SchoolStudent = { userId: string; displayName: string; targetCourse?: string | null; targetUniversity?: string | null; preparationScore: number; interviewCount: number; fullPaperCount: number; essayCount: number; priority?: { label?: string } | null; strongest?: { label?: string } | null; updatedAt?: string | null }
export type SchoolAssignment = { id: string; title: string; due_at?: string | null; description: string; href: string; target_user_id?: string | null; task_type?: string; submission_required?: boolean }
export type SchoolProgress = { assignment_id: string; user_id: string; status: "not_started" | "in_progress" | "completed"; note?: string; updated_at?: string }
export type SchoolDetail = { cohort: { name: string }; students: SchoolStudent[]; assignments: SchoolAssignment[]; progress: SchoolProgress[] }
export function taskState(assignment: SchoolAssignment, progress: SchoolProgress | undefined, now: number) {
  if (progress?.status === "completed") return "Completed"
  const due = assignment.due_at ? Date.parse(assignment.due_at) : NaN
  if (Number.isFinite(due) && due < now) return "Overdue"
  return progress?.status === "in_progress" ? "In progress" : "Not started"
}
export function studentSummary(detail: SchoolDetail, student: SchoolStudent, now: number) {
  const records = new Map(detail.progress.filter(p => p.user_id === student.userId).map(p => [p.assignment_id, p]))
  const tasks = detail.assignments.filter(a => assignmentApplies(a,student.userId)).map(a => ({ ...a, progress: records.get(a.id), state: taskState(a, records.get(a.id), now) }))
  const completed = tasks.filter(t => t.state === "Completed").length
  const overdue = tasks.filter(t => t.state === "Overdue").length
  const dueSoon = tasks.filter(t => t.state !== "Completed" && t.due_at && Date.parse(t.due_at) >= now && Date.parse(t.due_at) <= now + 7 * 86400000).length
  return { student, tasks, completed, overdue, dueSoon, percent: tasks.length ? Math.round(completed / tasks.length * 100) : null }
}
export function csvCell(value: unknown) {
  const text = String(value ?? "")
  // Spreadsheet formula characters must remain literal when a teacher opens the file.
  return '"' + (/^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"'
}
export function progressCsv(detail: SchoolDetail, now: number) {
  const rows: unknown[][] = [["Student", "Course", "Assignment", "Due", "Status", "Student reflection", "Last update"]]
  for (const student of detail.students) for (const task of studentSummary(detail, student, now).tasks) rows.push([student.displayName, student.targetCourse, task.title, task.due_at, task.state, task.progress?.note, task.progress?.updated_at])
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}

export function assignmentApplies(assignment:SchoolAssignment,userId:string){
 return !assignment.target_user_id||assignment.target_user_id===userId
}
export function cohortAssignmentSummary(detail:SchoolDetail,now:number){
 const rows=detail.students.map(s=>studentSummary(detail,s,now))
 const assigned=rows.reduce((n,s)=>n+s.tasks.length,0),completed=rows.reduce((n,s)=>n+s.completed,0)
 const targeted=rows.flatMap(s=>s.tasks.filter(t=>t.target_user_id===s.student.userId).map(t=>({student:s.student,task:t})))
 return {assigned,completed,percent:assigned?Math.round(100*completed/assigned):null,targeted:targeted.length,targetedCompleted:targeted.filter(t=>t.task.state==="Completed").length,targetedWithReflection:targeted.filter(t=>t.task.state==="Completed"&&Boolean(t.task.progress?.note?.trim())).length,targetedOverdue:targeted.filter(t=>t.task.state==="Overdue").length}
}
export function assignmentSummary(detail:SchoolDetail,assignment:SchoolAssignment){
 const eligible=detail.students.filter(s=>assignmentApplies(assignment,s.userId))
 const done=eligible.filter(s=>detail.progress.some(p=>p.assignment_id===assignment.id&&p.user_id===s.userId&&p.status==="completed")).length
 return {eligible:eligible.length,done,percent:eligible.length?Math.round(100*done/eligible.length):null}
}
