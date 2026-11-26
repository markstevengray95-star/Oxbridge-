/** Phase 24 staff dashboard presentation helpers. All input must come from authorised server endpoints. */
export type TeacherView="all"|"follow-up"|"active"|"no-baseline"
export type StaffStudent={
 userId:string;displayName:string;targetCourse:string|null;targetUniversity:string|null;
 activeThisWeek:boolean;lastActiveAt:string|null;preparationScore:number|null;
 assignmentCompleted:number;assignmentTotal:number;currentPriority:{label?:string}|null
}
export const teacherViews:{id:TeacherView;label:string}[]=[
 {id:"all",label:"All students"},
 {id:"follow-up",label:"No recent activity"},
 {id:"active",label:"Active this week"},
 {id:"no-baseline",label:"Needs baseline"},
]
export function filterTeacherRoster<T extends StaffStudent>(rows:T[],query:string,view:TeacherView):T[]{
 const term=query.trim().toLocaleLowerCase("en-GB")
 return rows.filter(row=>{
  if(view==="follow-up"&&row.activeThisWeek)return false
  if(view==="active"&&!row.activeThisWeek)return false
  if(view==="no-baseline"&&row.preparationScore!==null)return false
  return !term||[row.displayName,row.targetCourse??"",row.targetUniversity??""].some(v=>v.toLocaleLowerCase("en-GB").includes(term))
 })
}
export function followUpStudents<T extends StaffStudent>(rows:T[],limit=4):T[]{
 return rows.filter(row=>!row.activeThisWeek).sort((a,b)=>{
  const ad=a.lastActiveAt?Date.parse(a.lastActiveAt):NaN
  const bd=b.lastActiveAt?Date.parse(b.lastActiveAt):NaN
  const ta=Number.isFinite(ad)?ad:0,tb=Number.isFinite(bd)?bd:0
  return ta-tb||a.displayName.localeCompare(b.displayName,"en-GB")
 }).slice(0,Math.max(0,limit))
}
export type DueAssignment={id:string;title:string;due_at?:string|null}
export function upcomingSchoolAssignments<T extends DueAssignment>(tasks:T[],now=Date.now(),days=7):T[]{
 const until=now+Math.max(0,days)*86400000
 return tasks.filter(item=>{
  const t=item.due_at?Date.parse(item.due_at):NaN
  return Number.isFinite(t)&&t<=until
 }).sort((a,b)=>Date.parse(a.due_at??"")-Date.parse(b.due_at??""))
}
