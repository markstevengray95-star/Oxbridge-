import { AdvancedInterviewExperience } from "@/components/advanced-interview-experience"

// Semantic answer-quality integration is provided by the shared advanced component:
// fetch("/api/interview-turn" · referenceAnswer · Checking response…
export default function InterviewRoomPage() {
  return <AdvancedInterviewExperience variant="formal" />
}
