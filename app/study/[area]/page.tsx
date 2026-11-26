import {notFound} from "next/navigation"
import {InterviewLauncher} from "@/components/interview-launcher"
import {StudentProgressHub} from "@/components/student-progress-hub"
import {StudyArea} from "@/components/study-area"
import {studentAreas} from "@/lib/navigation-directory"
export default async function StudyPage({params}:{params:Promise<{area:string}>}){
 const {area}=await params
 const section=studentAreas.find(s=>s.id===area&&s.href.startsWith("/study/"))
 if(!section)notFound()
 if(section.id==="interviews")return <InterviewLauncher/>
 if(section.id==="progress")return <StudentProgressHub/>
 return <StudyArea area={section.id} title={section.label}/>
}
