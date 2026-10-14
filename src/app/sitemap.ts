export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (env.APP_ENV !== "production") return [];
  const p = await db.product.findMany({
    where: { status: "ACTIVE", vipOnly: false },
    select: { slug: true, updatedAt: true },
  });
  return [
    { url: env.SITE_URL },
    { url: env.SITE_URL + "/products" },
    ...p.map((p) => ({
      url: env.SITE_URL + "/products/" + p.slug,
      lastModified: p.updatedAt,
    })),
  ];
}
