import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(self), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
]

const nextConfig: NextConfig = {
  // Keep long-form writing on the strongest configured primary, while routing
  // short-form interview/feedback calls through the responsive production model.
  // Live voice uses GEMINI_LIVE_MODEL separately and is intentionally unaffected.
  env: {
    GEMINI_MODEL: "gemini-3.5-flash-lite",
    GEMINI_WRITING_MODEL: "gemini-3.8-flash",
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
};

export default nextConfig;
