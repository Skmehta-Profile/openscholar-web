import type { MetadataRoute } from "next";

const productionDomain = "https://openscholar.dvsanalytik.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: productionDomain,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${productionDomain}/about`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${productionDomain}/pricing`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${productionDomain}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${productionDomain}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${productionDomain}/refund-policy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
