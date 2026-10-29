import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://wazeo.vercel.app";
  const paths = [
    "",
    "/about",
    "/services",
    "/pricing",
    "/how-it-works",
    "/faq",
    "/support",
    "/tracker",
    "/api-docs",
    "/terms",
    "/privacy",
    "/refund-policy",
    "/owner",
    "/sign-in",
    "/sign-up",
  ];
  return paths.map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));
}
