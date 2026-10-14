import { z } from "zod";
const schema = z.object({
  APP_ENV: z.enum(["local", "demo", "production"]).default("local"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  SITE_URL: z.url(),
  DEMO_ENABLED: z.enum(["true", "false"]).default("false"),
  PAYMENT_PROVIDER: z.enum(["mock", "disabled", "toss"]).default("disabled"),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_PATH: z.string().default("./storage/private"),
});
export const env = schema.parse(process.env);
if (
  env.APP_ENV === "production" &&
  (env.DEMO_ENABLED === "true" || env.PAYMENT_PROVIDER === "mock")
)
  throw new Error("운영에서는 데모 계정과 mock 결제를 사용할 수 없습니다.");
if (env.APP_ENV === "production" && !env.SITE_URL.startsWith("https://"))
  throw new Error("운영 SITE_URL은 HTTPS여야 합니다.");
export const isDemo =
  env.APP_ENV !== "production" && env.DEMO_ENABLED === "true";

if (env.STORAGE_PROVIDER === "s3") {
  for (const key of [
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ])
    if (!process.env[key]) throw new Error(key + "를 설정해주세요.");
}
if (
  env.APP_ENV === "production" &&
  (env.BETTER_AUTH_SECRET.startsWith("replace-with-") ||
    env.DATABASE_URL.includes("b2b_local_only"))
)
  throw new Error("운영용 인증 secret과 DB 비밀번호를 새로 설정해주세요.");
