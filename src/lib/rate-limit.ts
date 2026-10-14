import { db } from "./db";
export async function sensitiveRateLimit(key: string, max = 30) {
  const now = Date.now();
  const count = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("id","key","count","lastRequest") VALUES (${key},${key},1,${BigInt(now)}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."lastRequest"<${BigInt(now - 60000)} THEN 1 ELSE "RateLimit"."count"+1 END,"lastRequest"=CASE WHEN "RateLimit"."lastRequest"<${BigInt(now - 60000)} THEN ${BigInt(now)} ELSE "RateLimit"."lastRequest" END RETURNING "count"`;
  if (count[0].count > max)
    throw new Error("요청이 많습니다. 1분 후 다시 시도해주세요.");
}
