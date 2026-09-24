export const PLAN_ONBOARDING_STATE_KEY = "oxbridge-plan-onboarding-v1"

export type PlanChoice = "free" | "pro" | "school"

export function onboardingCompleted(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  return (value as { completed?: unknown }).completed === true
}
