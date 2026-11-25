export type SchoolStudentAccessInputs={
  viewerId:string
  studentId:string
  scopeOrganizationId:string
  scopeRole:"owner"|"school_admin"|"teacher"
  activeOrganizationId:string|null
  organizationActive:boolean
  organizationOwnerId:string|null
  studentMemberUserId:string|null
  studentMemberRole:string|null
  studentSeatUserId:string|null
  studentSeatActive:boolean
  studentStaffActive:boolean
  linkedStudentId:string|null
}
export function schoolStudentMayReadDetails(input:SchoolStudentAccessInputs):boolean{
  if(!input.viewerId||!input.studentId||input.viewerId===input.studentId)return false
  if(!input.organizationActive||!input.activeOrganizationId||input.activeOrganizationId!==input.scopeOrganizationId)return false
  if(input.studentId===input.organizationOwnerId||input.studentMemberUserId!==input.studentId||input.studentMemberRole==="owner")return false
  if(input.studentSeatUserId!==input.studentId||!input.studentSeatActive||input.studentStaffActive)return false
  if(input.scopeRole==="owner"||input.scopeRole==="school_admin")return true
  return input.scopeRole==="teacher"&&input.linkedStudentId===input.studentId
}
