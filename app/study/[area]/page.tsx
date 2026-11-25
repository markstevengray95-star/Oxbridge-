import {notFound} from "next/navigation"
import {StudyArea} from "@/components/study-area"
import {studentAreas} from "@/lib/navigation-directory"
export default async function StudyPage({params}:{params:Promise<{area:string}>}){
 const {area}=await params
 const section=studentAreas.find(s=>s.id===area&&s.href.startsWith("/study/"))
 if(!section)notFound()
 return <StudyArea area={section.id} title={section.label}/>
}
