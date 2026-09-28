import AdmissionsTestSimulator from "@/components/admissions-test-simulator"
import { UcatBasicCalculator } from "@/components/ucat-basic-calculator"

export default function TestPlayerPage() {
  return <>
    <AdmissionsTestSimulator />
    <UcatBasicCalculator autoDetect />
  </>
}
