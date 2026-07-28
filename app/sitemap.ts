import type { MetadataRoute } from "next"

/**
 * Solo se publican las rutas publicas. El panel /admin queda fuera a
 * proposito, y ademas se marca noindex desde robots.ts y las cabeceras.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://djjohnx.com"
  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
