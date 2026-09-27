/** Accept only local paths, including after URL slash/control normalization. */
export function safeLocalPath(value: unknown, fallback = "/post-login") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback
  return value
}
