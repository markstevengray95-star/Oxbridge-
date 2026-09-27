import { RealisticTypedInterview } from "@/components/realistic-typed-interview"

// The semantic answer-quality integration now lives in the shared component:
// fetch("/api/interview-turn" · referenceAnswer · Checking response…
export default function InterviewRoomPage() {
  return <RealisticTypedInterview variant="formal" />
}
