import { db } from "./db";
import { currentUser } from "./auth";
import { canAccess, publicPrice } from "./domain";
import type { Prisma } from "@prisma/client";
export const productInclude = {
  category: true,
  shippingGroup: true,
  collections: true,
  variants: {
    orderBy: { sku: "asc" as const },
    include: { tiers: { orderBy: { minQty: "asc" as const } } },
  },
  assets: true,
} satisfies Prisma.ProductInclude;
export type ProductFull = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;
export type ProductCardData = {
  id: string;
  slug: string;
  code: string;
  name: string;
  image: string;
  vipOnly: boolean;
  recommended: boolean;
  recommendation: string;
  moq: number;
  available: number;
  price: number | null;
  shipping: string;
  groupName: string;
};
export function card(
  p: ProductFull,
  u: Awaited<ReturnType<typeof currentUser>>,
): ProductCardData {
  const v = p.variants[0];
  const eligible = p.variants.filter((v) => v.onHand - v.reserved >= v.moq);
  const minMoq = v?.moq ?? 0;
  return {
    id: p.id,
    slug: p.slug,
    code: p.code,
    name: p.name,
    image: p.image,
    vipOnly: p.vipOnly,
    recommended: p.recommended,
    recommendation: p.recommendation,
    moq: minMoq,
    available: eligible.reduce((s, v) => s + v.onHand - v.reserved, 0),
    price: v ? publicPrice(u, p.vipOnly, v.tiers, v.moq) : null,
    shipping: p.shippingGroup.mode === "FREE" ? "무료배송" : "배송비 별도",
    groupName: p.shippingGroup.name,
  };
}
export async function catalog(
  query: Record<string, string | undefined>,
  collection?: string,
) {
  const user = await currentUser();
  const allow = canAccess(user);
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    AND: [{ variants: { some: { tiers: { some: {} } } } }],
    ...(canAccess(user, true) ? {} : { vipOnly: false }),
  };
  if (query.q)
    where.OR = ["name", "code"].map((key) => ({
      [key]: { contains: query.q, mode: "insensitive" },
    }));
  if (query.q)
    where.OR!.push(
      { tags: { has: query.q } },
      { category: { name: { contains: query.q } } },
    );
  if (query.category) where.category = { slug: query.category };
  if (collection === "recommended") where.recommended = true;
  else if (collection === "small-lot")
    where.variants = { some: { moq: { lte: 5 } } };
  else if (collection === "bundle")
    where.shippingGroup = { mode: { not: "FREE" } };
  else if (collection === "vip") {
    if (!canAccess(user, true))
      return { products: [], total: 0, page: 1, pages: 1, user };
    where.vipOnly = true;
  } else if (collection) where.collections = { some: { slug: collection } };
  let products = await db.product.findMany({
    where,
    include: productInclude,
    orderBy: { createdAt: query.sort === "new" ? "desc" : "asc" },
  });
  if (query.within)
    products = products.filter(
      (p) =>
        p.name.includes(query.within!) ||
        p.tags.some((t) => t.includes(query.within!)),
    );
  if (query.moq)
    products = products.filter((p) =>
      p.variants.some((v) => v.moq <= Number(query.moq)),
    );
  if (query.stock === "1")
    products = products.filter((p) =>
      p.variants.some((v) => v.onHand - v.reserved >= v.moq),
    );
  if (query.free === "1")
    products = products.filter((p) => p.shippingGroup.mode === "FREE");
  if (query.bundle === "1")
    products = products.filter((p) => p.shippingGroup.mode !== "FREE");
  let cards = products.map((p) => card(p, user));
  if (allow) {
    if (query.min)
      cards = cards.filter(
        (p) => p.price !== null && p.price >= Number(query.min),
      );
    if (query.max)
      cards = cards.filter(
        (p) => p.price !== null && p.price <= Number(query.max),
      );
    if (query.sort === "low")
      cards.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (query.sort === "high")
      cards.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }
  if (!query.sort || query.sort === "recommended")
    cards.sort((a, b) => Number(b.recommended) - Number(a.recommended));
  const page = Math.max(1, Number(query.page) || 1),
    total = cards.length;
  return {
    products: cards.slice((page - 1) * 20, page * 20),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 20)),
    user,
  };
}
