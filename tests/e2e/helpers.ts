import { expect, type Page, type BrowserContext } from "@playwright/test";
const sessions = new Map<
  string,
  Awaited<ReturnType<BrowserContext["cookies"]>>
>();
export async function login(page: Page, kindOrEmail = "standard") {
  const email = kindOrEmail.includes("@")
    ? kindOrEmail
    : kindOrEmail + "@demo.local";
  const saved = sessions.get(email);
  if (saved) {
    await page.context().clearCookies();
    await page.context().addCookies(saved);
    const r = await page.request.get("/api/auth/get-session");
    if (r.ok() && (await r.json())?.user?.email === email) {
      await page.goto("/account");
      return;
    }
  }
  await page.goto("/auth/login");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill("DemoOnly!2026");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/, { timeout: 15000 });
  sessions.set(email, await page.context().cookies());
}
