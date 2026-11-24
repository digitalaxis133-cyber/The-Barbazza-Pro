import type { MetadataRoute } from "next";

const SITE = "https://www.thebarbazza.com";

/** Public pages Google should index (staff/admin routes stay out). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const publicPaths = ["", "/book", "/team", "/year-one"];

  return [
    ...publicPaths.map((path) => ({
      url: `${SITE}${path || "/"}`,
      lastModified: now,
      changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
      priority: path === "" ? 1 : path === "/year-one" ? 0.85 : 0.9,
    })),
    {
      url: "https://year.thebarbazza.com",
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    },
  ];
}
