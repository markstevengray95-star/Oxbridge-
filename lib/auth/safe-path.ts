/** Accept only same-origin application paths after rejecting slash/control normalization tricks. */
export function safeLocalPath(value: unknown, fallback = "/post-login") {
  if (
    typeof value !== "string"
    || !value.startsWith("/")
    || value.startsWith("//")
    || /[\\\u0000-\u001f\u007f]/.test(value)
  ) return fallback
  return value
}
