export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
export default function robots(): MetadataRoute.Robots {
  return {
    rules:
      env.APP_ENV === "production"
        ? {
            userAgent: "*",
            allow: "/",
            disallow: [
              "/admin",
              "/account",
              "/cart",
              "/checkout",
              "/orders",
              "/auth",
              "/api",
            ],
          }
        : { userAgent: "*", disallow: "/" },
    sitemap: env.SITE_URL + "/sitemap.xml",
  };
}
