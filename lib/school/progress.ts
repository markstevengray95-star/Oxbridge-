export type SchoolStudent = { userId: string; displayName: string; targetCourse?: string | null; targetUniversity?: string | null; preparationScore: number; interviewCount: number; fullPaperCount: number; essayCount: number; priority?: { label?: string } | null; strongest?: { label?: string } | null; updatedAt?: string | null }
export type SchoolAssignment = { id: string; title: string; due_at?: string | null; description: string; href: string }
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
  const tasks = detail.assignments.map(a => ({ ...a, progress: records.get(a.id), state: taskState(a, records.get(a.id), now) }))
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
