const fs = require("node:fs")
const path = require("node:path")

const root = path.resolve(__dirname, "..")
const read = file => fs.readFileSync(path.join(root, file), "utf8")
const exists = file => fs.existsSync(path.join(root, file))

const requiredFiles = [
  "lib/site-url.ts",
  "app/opengraph-image.tsx",
  "app/sitemap.ts",
  "app/robots.ts",
  "app/not-found.tsx",
  "app/error.tsx",
  "app/support/page.tsx",
  "app/status/page.tsx",
  "app/api/health/route.ts",
  "components/service-status-probe.tsx",
]

for (const file of requiredFiles) {
  if (!exists(file)) throw new Error(`Missing launch surface: ${file}`)
}

const layout = read("app/layout.tsx")
const siteUrl = read("lib/site-url.ts")
const sitemap = read("app/sitemap.ts")
const robots = read("app/robots.ts")
const support = read("app/support/page.tsx")
const health = read("app/api/health/route.ts")
const statusProbe = read("components/service-status-probe.tsx")
const notFound = read("app/not-found.tsx")
const errorPage = read("app/error.tsx")
const envExample = read(".env.example")

const expectIncludes = (content, needle, label) => {
  if (!content.includes(needle)) throw new Error(`${label} is missing ${JSON.stringify(needle)}`)
}

expectIncludes(layout, "metadataBase: getSiteUrl()", "root metadata")
expectIncludes(layout, "openGraph:", "root metadata")
expectIncludes(layout, "twitter:", "root metadata")
expectIncludes(layout, "alternates: { canonical: \"/\" }", "root metadata")
expectIncludes(layout, 'href="/support"', "footer")
expectIncludes(layout, 'href="/status"', "footer")

expectIncludes(siteUrl, "NEXT_PUBLIC_SITE_URL", "site URL helper")
expectIncludes(siteUrl, "VERCEL_PROJECT_PRODUCTION_URL", "site URL helper")
expectIncludes(siteUrl, "localhost:3000", "site URL helper")
expectIncludes(envExample, "NEXT_PUBLIC_SITE_URL=", "environment example")

for (const route of ["/privacy", "/terms", "/cookies", "/privacy-centre", "/safeguarding", "/support", "/status"]) {
  expectIncludes(sitemap, `path: \"${route}\"`, "sitemap")
}

for (const privatePrefix of ["/admin/", "/api/", "/account/", "/history/", "/student-home/", "/tutor/", "/school-dashboard/"]) {
  expectIncludes(robots, `\"${privatePrefix}\"`, "robots rules")
}

expectIncludes(support, "NEXT_PUBLIC_SUPPORT_EMAIL", "support page")
if (/support@scholarbridge|hello@scholarbridge/i.test(support)) {
  throw new Error("Support page must not invent an unconfigured public email address")
}

expectIncludes(health, '"Cache-Control": "no-store, max-age=0"', "health endpoint")
expectIncludes(health, 'status: "ok"', "health endpoint")
expectIncludes(statusProbe, 'fetch("/api/health"', "status probe")
expectIncludes(notFound, "404 · Page not found", "not-found page")
expectIncludes(errorPage, "reset()", "error recovery page")

if (/https:\/\/[^"'`\s]*scholarbridge/i.test(siteUrl)) {
  throw new Error("Canonical URL helper must not hard-code an unverified ScholarBridge production domain")
}

console.log("PASS: public launch metadata, indexing, support/status, health and recovery surfaces are wired without inventing production contact/domain details")
