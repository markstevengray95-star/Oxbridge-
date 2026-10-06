export function configuredAdminEmails() {
  return Array.from(new Set(
    [process.env.ADMIN_EMAILS || "", process.env.ORBITS_OWNER_EMAILS || ""]
      .join(",")
      .split(",")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean)
  ))
}

export function isConfiguredAdminEmail(email: unknown) {
  if (typeof email !== "string" || !email.trim()) return false
  return configuredAdminEmails().includes(email.trim().toLowerCase())
}
