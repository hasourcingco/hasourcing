import { createAuthMiddleware, APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { env } from "./env";
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL: env.SITE_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.SITE_URL],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: false,
  },
  session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
  advanced: {
    useSecureCookies: env.APP_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email") {
        const email = String(ctx.body?.email ?? "").toLowerCase();
        const account = await db.user.findUnique({ where: { email } });
        if (
          account?.accountStatus === "DISABLED" ||
          (env.APP_ENV === "production" && email.endsWith("@demo.local"))
        )
          throw new APIError("FORBIDDEN", {
            message: "이 계정은 로그인할 수 없습니다.",
          });
      }
    }),
  },
  plugins: [nextCookies()],
});
export async function currentUser() {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = await db.user.findUnique({ where: { id: s.user.id } });
  return u?.accountStatus === "ACTIVE" &&
    !(env.APP_ENV === "production" && u.email.endsWith("@demo.local"))
    ? u
    : null;
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/auth/login");
  return u;
}
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new Error("관리자 권한이 필요합니다.");
  return u;
}
