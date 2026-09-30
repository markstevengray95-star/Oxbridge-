import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/account/",
          "/history/",
          "/student-home/",
          "/tutor/",
          "/school-dashboard/",
          "/interview-replay/",
          "/test-results/",
          "/written-work-vault/",
          "/personal-statement-map/",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
