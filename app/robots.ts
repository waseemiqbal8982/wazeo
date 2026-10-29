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
    sitemap: "https://innvera.shop/sitemap.xml",
    host: "https://innvera.shop",
  };
}
