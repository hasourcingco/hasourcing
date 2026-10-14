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
test("admin creates and edits SKU prices/stock and public product", async ({
  page,
}) => {
  await login(page, "admin@demo.local");
  await page.goto("/admin/products/new");
  const token = "e2e-" + randomUUID().slice(0, 16);
  await page.getByLabel("상품명", { exact: true }).fill("관리자 검증 상품");
  await page.getByLabel("상품번호 (고유)").fill(token);
  await page.getByLabel("상품 URL slug").fill(token);
  await page
    .getByLabel("상품 설명", { exact: true })
    .fill("관리자 저장 후 실제 화면 확인용");
  await page.getByLabel("판매 포인트", { exact: true }).fill("테스트용 상품");
  await page.locator("select[name=status]").selectOption("ACTIVE");
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "상품 정보 저장" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/(?!new)[^/]+$/);
  const variant = page
    .locator("form")
    .filter({ has: page.locator("input[name=op][value=admin-variant]") })
    .first();
  const optionDetails = page
    .locator("details")
    .filter({ hasText: "새 옵션 추가" });
  if ((await optionDetails.getAttribute("open")) === null)
    await page.getByText("새 옵션 추가", { exact: true }).click();
  await variant.getByLabel("SKU (고유)").fill(token + "-sku");
  await variant.getByLabel("옵션명", { exact: true }).fill("테스트 옵션");
  await variant.getByLabel("MOQ", { exact: true }).fill("5");
  await variant.getByLabel("주문 단위", { exact: true }).fill("5");
  await variant.getByLabel("보유 재고 (예약 재고 포함)").fill("40");
  await variant.getByLabel("변경·재고 조정 사유").fill("자동 E2E 검증");
  await variant.getByLabel("적용 수량 이상").fill("5");
  await variant.getByLabel("일반 개당 가격").fill("1234");
  await variant.getByLabel("VIP 개당 가격").fill("1111");
  await variant.getByRole("button", { name: "옵션·가격·재고 저장" }).click();
  await expect(
    page.getByText("저장했습니다.", { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("현재 예약 재고 0개.", { exact: false }).first(),
  ).toBeVisible();
  const productId = page.url().split("/").at(-1)!;
  await page.goto("/products/" + token);
  await expect(
    page.getByRole("heading", { name: "관리자 검증 상품" }),
  ).toBeVisible();
  await expect(page.locator(".detail-panel>.price")).toContainText("1,111원");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(
    page.getByRole("link", { name: "로그인", exact: true }),
  ).toBeVisible();
  await login(page, "standard@demo.local");
  await page.goto("/products/" + token);
  await expect(page.locator(".detail-panel>.price")).toContainText("1,234원");
  await expect(
    page.getByText("주문 가능 재고", { exact: false }),
  ).toContainText("40개");
  await page.screenshot({
    path: "docs/screenshots/admin-product-public.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "로그아웃" }).click();
  await login(page, "admin@demo.local");
  await page.goto("/admin/products/" + productId);
  await page.screenshot({
    path: "docs/screenshots/admin-product-editor.png",
    fullPage: true,
  });
  const hide = await action(page, "admin-product", {
    id: productId,
    code: token,
    slug: token,
    name: "관리자 검증 상품",
    description: "관리자 저장 후 실제 화면 확인용",
    sellingPoints: "테스트용 상품",
    categoryId: await page.locator("select[name=categoryId]").inputValue(),
    shippingGroupId: await page
      .locator("select[name=shippingGroupId]")
      .inputValue(),
    status: "HIDDEN",
    origin: "검증 상품",
    recommendation: "",
  });
  expect(hide.status).toBe(200);
});
test("signup, administrator approval and grade change take effect for active session", async ({
  page,
  browser,
}) => {
  const email = "test-" + randomUUID() + "@example.invalid";
  await page.goto("/auth/signup");
  await page.getByLabel("담당자명", { exact: true }).fill("검증 회원");
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호 · 10자 이상").fill("DemoOnly!2026");
  await page.getByLabel("연락처", { exact: true }).fill("01000000000");
  await page.getByLabel("상호", { exact: true }).fill("검증용 가상 사업자");
  await page.getByLabel("사업자등록번호", { exact: true }).fill("000-00-00000");
  await page.getByRole("checkbox", { name: /이용약관/ }).check();
  await page
    .getByRole("button", { name: "사업자 회원가입", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("사업자 대기 · 일반 사업자")).toBeVisible();
  const admin = await browser.newPage();
  await login(admin, "admin@demo.local");
  await admin.goto("/admin/members?q=" + encodeURIComponent(email));
  await admin.locator(".panel summary").click();
  const id = await admin.locator("input[name=id]").inputValue();
  const approved = await action(admin, "admin-member", {
    id,
    businessStatus: "APPROVED",
    memberGrade: "VIP",
    accountStatus: "ACTIVE",
    reason: "E2E 검증 승인",
  });
  expect(approved.status).toBe(200);
  await page.reload();
  await expect(
    page.getByText("사업자 승인 · VIP", { exact: true }),
  ).toBeVisible();
  await page.goto("/collections/vip");
  await expect(
    page.getByRole("link", { name: "VIP 큐레이션 키링 세트", exact: true }),
  ).toBeVisible();
  const suspended = await action(admin, "admin-member", {
    id,
    businessStatus: "SUSPENDED",
    memberGrade: "VIP",
    accountStatus: "ACTIVE",
    reason: "E2E 검증 이용 중지",
  });
  expect(suspended.status).toBe(200);
  const denied = await action(page, "cart-add", {
    variantId: "variant-1-0",
    quantity: "5",
  });
  expect(denied.status).toBe(400);
  expect(await (await page.request.get("/products")).text()).not.toContain(
    "VIP 큐레이션 키링 세트",
  );
  expect(
    await (await page.request.get("/account/wishlist")).text(),
  ).not.toContain("VIP 큐레이션 키링 세트");
  await admin.close();
});
test("quote reply and per-group shipment are saved and visible to owner", async ({
  page,
  browser,
}) => {
  await login(page, "standard@demo.local");
  await page.goto("/quotes/new?product=product-1");
  await page.getByLabel("희망 수량", { exact: true }).fill("1000");
  const message = "견적 E2E " + randomUUID();
  const reply = "수량별 조건 확인 후 안내드립니다. " + message;
  await page.getByLabel("요청 사항", { exact: true }).fill(message);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "견적 요청 접수" }).click();
  await expect(page).toHaveURL(/\/account\/quotes$/);
  const admin = await browser.newPage();
  await login(admin, "admin@demo.local");
  await admin.goto("/admin/quotes");
  const panel = admin.locator(".panel").filter({ hasText: message });
  await panel.getByLabel("견적 답변").fill(reply);
  await panel.getByRole("button", { name: "답변 저장" }).click();
  await expect(panel.getByText("저장했습니다.")).toBeVisible();
  await page.reload();
  await expect(page.getByText(reply, { exact: true })).toBeVisible();
  await admin.goto("/admin/orders?order=demo-order");
  const shipment = await action(admin, "admin-shipment", {
    orderId: "demo-order",
    shippingGroupId: "group-a",
    carrier: "데모 택배",
    trackingNumber: "DEMO-ONLY-001",
    status: "SHIPPED",
  });
  expect(shipment.status).toBe(200);
  await page.goto("/account/orders/demo-order");
  await expect(
    page.getByText("데모 택배 · DEMO-ONLY-001 · 배송 중"),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "docs/screenshots/390-order.png",
    fullPage: true,
  });
  await admin.goto("/admin");
  await admin.screenshot({
    path: "docs/screenshots/admin-dashboard.png",
    fullPage: true,
  });
  await admin.close();
});
