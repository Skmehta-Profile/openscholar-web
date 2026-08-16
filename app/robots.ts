import type { MetadataRoute } from "next";

const productionDomain = "https://openscholar.dvsanalytik.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/auth/",
        "/signin/",
        "/library/",
        "/collections/",
        "/profile/",
        "/alerts/",
        "/reader/",
        "/researcher/*/manage",
      ],
    },
    sitemap: `${productionDomain}/sitemap.xml`,
    host: productionDomain,
  };
}
