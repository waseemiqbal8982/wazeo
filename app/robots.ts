import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/api", "/auth", "/verify-email", "/reset-password"],
      },
    ],
    sitemap: "https://wazeo.vercel.app/sitemap.xml",
    host: "https://wazeo.vercel.app",
  };
}
