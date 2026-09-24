export function configuredAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
}

export function isConfiguredAdminEmail(email: unknown) {
  if (typeof email !== "string" || !email.trim()) return false
  return configuredAdminEmails().includes(email.trim().toLowerCase())
}
