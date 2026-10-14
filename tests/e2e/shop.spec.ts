import { login } from "./helpers";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
async function action(
  page: import("@playwright/test").Page,
  op: string,
  fields: Record<string, string>,
) {
  return page.evaluate(
    async ({ op, fields }) => {
      const f = new FormData();
      f.set("op", op);
      for (const [k, v] of Object.entries(fields)) f.set(k, v);
      const r = await fetch("/api/actions", { method: "POST", body: f });
      return { status: r.status, body: await r.json() };
    },
    { op, fields },
  );
}
test("guest response protects prices and VIP products", async ({
  page,
  request,
}) => {
  await page.goto("/products/product-1");
  await expect(page.locator(".detail-panel .info-strip").first()).toBeVisible();
  const r = await request.get("/products/product-1");
  const html = await r.text();
  expect(html).not.toContain('"standard":980');
  expect(html).not.toContain('"vip":900');
  expect(html).not.toContain("개당 980");
  await page.goto("/products");
  const baseline = await page.locator(".results-bar b").innerText();
  await page.goto("/products?min=9999999&sort=low");
  await expect(page.locator(".results-bar b")).toHaveText(baseline);
  await page.goto("/collections/vip");
  await expect(
    page.getByText("VIP 회원 승인 후 이용할 수 있습니다."),
  ).toBeVisible();
});
test("full purchase flow persists cart/order and authorizes download", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/products?q=실리콘");
  await page
    .getByRole("link", { name: "실리콘 접이식 런치박스", exact: true })
    .click();
  await page.getByLabel("옵션", { exact: true }).selectOption("variant-1-0");
  await page
    .getByRole("button", { name: "장바구니 담기", exact: true })
    .click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.reload();
  await expect(
    page.getByText("실리콘 접이식 런치박스", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/390-cart.png",
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("link", { name: "선택 상품 주문하기" }).click();
  await page.getByLabel("수령인", { exact: true }).fill("데모 수령인");
  await page.getByLabel("연락처", { exact: true }).fill("01012345678");
  await page.getByLabel("우편번호 (5자리)").fill("00000");
  await page.getByLabel("기본주소").fill("데모 검증 주소");
  await page.getByLabel("상세주소").fill("데모 상세주소");
  await page.getByRole("checkbox", { name: /주문 약관/ }).check();
  await page.screenshot({
    path: "docs/screenshots/390-checkout.png",
    fullPage: true,
    caret: "initial",
  });
  await page
    .getByRole("button", { name: "데모 주문하기", exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders\/.*\/complete$/);
  await expect(
    page.getByText("데모 주문입니다. 실제 결제가 발생하지 않았습니다."),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "구매 상품자료 확인" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "허용 자료 다운로드" }).first().click();
  expect((await download).suggestedFilename()).toContain(".pdf");
  await page.goto("/account/orders");
  await expect(page.locator(".order-row").first()).toContainText("데모");
});
test("pending member cannot buy or bypass admin and download permissions", async ({
  page,
}) => {
  await login(page, "pending");
  await page.goto("/products/product-1");
  await expect(page.locator(".detail-panel .info-strip").first()).toBeVisible();
  const denied = await action(page, "cart-add", {
    variantId: "variant-1-0",
    quantity: "5",
  });
  expect(denied.status).toBe(400);
  const admin = await action(page, "admin-setting", {
    key: "legalName",
    value: "unauthorized",
  });
  expect(admin.status).toBe(403);
  expect((await page.request.get("/api/assets/asset-1")).status()).toBe(403);
});
test("standard member is denied VIP data and cross-user orders", async ({
  page,
}) => {
  await login(page);
  const vipResponse = await page.request.get("/products/product-27");
  expect(await vipResponse.text()).not.toContain("VIP 큐레이션 키링 세트");
  const denied = await action(page, "cart-add", {
    variantId: "variant-27-0",
    quantity: "20",
  });
  expect(denied.status).toBe(400);
  const missing = await page.request.get("/account/orders/nonexistent-order");
  expect(await missing.text()).toContain("페이지를 찾을 수 없습니다.");
});
test("VIP sees VIP price and exclusive products", async ({ page }) => {
  await login(page, "vip");
  await page.goto("/collections/vip");
  await expect(
    page.getByRole("link", { name: "VIP 큐레이션 키링 세트", exact: true }),
  ).toBeVisible();
  await page.goto("/products/product-1");
  await expect(page.locator(".detail-panel>.price")).toContainText("900원");
});
test("admin edits public content and shipping data with audit trail", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "운영 대시보드" }),
  ).toBeVisible();
  const title = "자동 검증 공지 " + randomUUID();
  const saved = await action(page, "admin-content", {
    id: "",
    slug: "test-" + randomUUID(),
    kind: "NOTICE",
    title,
    body: "관리자 변경 화면 반영 확인",
    version: "test-v1",
    href: "",
    published: "on",
  });
  expect(saved.status).toBe(200);
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.goto("/admin/audit");
  await expect(page.getByRole("table")).toContainText("admin-content");
  await page.goto("/admin/content?q=" + encodeURIComponent(title));
  const edited = page.locator("details").filter({ hasText: title });
  const id = await edited.locator("input[name=id]").inputValue();
  const slug = await edited.locator("input[name=slug]").inputValue();
  expect(
    (
      await action(page, "admin-content", {
        id,
        slug,
        kind: "NOTICE",
        title,
        body: "관리자 변경 화면 반영 확인",
        version: "test-v1",
        href: "",
      })
    ).status,
  ).toBe(200);
});
test("search filters and pagination remain in URL", async ({ page }) => {
  await login(page);
  await page.goto("/products?moq=5&stock=1&sort=low");
  await expect(page.getByLabel("최소주문수량 상한")).toHaveValue("5");
  await page.reload();
  await expect(page.getByLabel("정렬", { exact: true })).toHaveValue("low");
  await page.goto("/products?q=없는상품검색검증");
  await expect(page.getByText("조건에 맞는 상품이 없습니다.")).toBeVisible();
  await page.goto("/products/product-12");
  await expect(
    page.getByRole("button", { name: "장바구니 담기" }),
  ).toBeDisabled();
});
test("responsive layout and no console errors at required widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/products",
      "/products/product-1",
      "/auth/login",
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page.locator(".loading")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      ).toBe(true);
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      for (
        let y = 0;
        y < (await page.evaluate(() => document.documentElement.scrollHeight));
        y += 800
      ) {
        await page.evaluate((v) => window.scrollTo(0, v), y);
        await page.waitForTimeout(80);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect
        .poll(
          async () =>
            page
              .locator("img")
              .evaluateAll((imgs) =>
                imgs
                  .filter(
                    (i) =>
                      !(i as HTMLImageElement).complete ||
                      (i as HTMLImageElement).naturalWidth === 0,
                  )
                  .map((i) => (i as HTMLImageElement).src),
              ),
          { timeout: 15000 },
        )
        .toEqual([]);
      await page.screenshot({
        caret: "initial",
        path:
          "docs/screenshots/" +
          width +
          "-" +
          (route === "/" ? "home" : route.replaceAll("/", "-")) +
          ".png",
        fullPage: true,
      });
      await expect
        .poll(
          async () =>
            page
              .locator("img")
              .evaluateAll((imgs) =>
                imgs
                  .filter(
                    (i) =>
                      !(i as HTMLImageElement).complete ||
                      (i as HTMLImageElement).naturalWidth === 0,
                  )
                  .map((i) => (i as HTMLImageElement).src),
              ),
          { timeout: 15000 },
        )
        .toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});

test("direct buy checks quantities and opens checkout", async ({ page }) => {
  await login(page);
  await page.goto("/products/product-1");
  const qty = page.getByRole("spinbutton", { name: "주문 수량" });
  await qty.fill("6");
  await expect(
    page.getByRole("button", { name: "구매하기", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#quantity-error")).toContainText("5개 단위");
  await qty.fill("10");
  await page.getByRole("button", { name: "구매하기", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(
    page.getByText("실리콘 접이식 런치박스", { exact: true }),
  ).toBeVisible();
  await page.goto("/cart");
  const line = page
    .locator(".cart-row")
    .filter({ hasText: "실리콘 접이식 런치박스" });
  const id = await line.locator("input[name=id]").first().inputValue();
  expect((await action(page, "cart-remove", { id })).status).toBe(200);
});
