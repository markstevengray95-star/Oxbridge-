import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-url"

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl()
  const now = new Date()
  const routes = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/privacy", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/cookies", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/privacy-centre", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/safeguarding", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/support", priority: 0.5, changeFrequency: "weekly" as const },
    { path: "/status", priority: 0.3, changeFrequency: "daily" as const },
  ]

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: new URL(path, site).toString(),
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
