import { demoPdf } from "../scripts/lib/demo-pdf";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const db = new PrismaClient();
async function main() {
  if (
    !["local", "demo"].includes(process.env.APP_ENV ?? "") ||
    process.env.DEMO_ENABLED !== "true"
  )
    throw new Error("데모 seed는 local/demo에서만 실행합니다.");
  for (const [slug, name] of [
    ["living", "생활·주방"],
    ["fashion", "패션·액세서리"],
    ["stationery", "문구·취미"],
    ["pets", "반려동물"],
    ["travel", "여행·레저"],
    ["digital", "디지털 주변용품"],
    ["season", "시즌·행사"],
  ])
    await db.category.upsert({
      where: { slug },
      update: {},
      create: { id: slug, slug, name },
    });
  for (const [slug, name, description] of [
    ["recommended", "김우람 추천", "운영자가 직접 지정한 추천 상품"],
    ["small-lot", "소량 시작", "MOQ 5개 이하로 시작하는 상품"],
    ["bundle", "묶음배송", "같은 배송그룹의 상품을 함께 구매하세요."],
    ["vip", "VIP 전용", "승인된 VIP 회원 전용 상품"],
  ])
    await db.collection.upsert({
      where: { slug },
      update: {},
      create: { id: slug, slug, name, description },
    });
  for (const g of [
    {
      id: "group-a",
      name: "생활·잡화 합배송 A",
      origin: "데모 출고지 A",
      mode: "CONDITIONAL",
      fee: 3000,
      freeAbove: 100000,
    },
    {
      id: "group-b",
      name: "패션·문구 합배송 B",
      origin: "데모 출고지 B",
      mode: "FIXED",
      fee: 3500,
      freeAbove: null,
    },
    {
      id: "group-free",
      name: "무료배송 상품",
      origin: "데모 출고지 C",
      mode: "FREE",
      fee: 0,
      freeAbove: null,
    },
  ])
    await db.shippingGroup.upsert({
      where: { id: g.id },
      update: {},
      create: g,
    });
  const names = [
    "실리콘 접이식 런치박스",
    "우드 손잡이 주방 브러시",
    "데일리 유리 머그컵",
    "모듈형 데스크 수납함",
    "캔버스 데일리 에코백",
    "컬러 매듭 스트랩 키링",
    "미니 지퍼 코인 파우치",
    "무광 데일리 헤어클립",
    "파스텔 인덱스 메모패드",
    "육각 컬러 젤펜 세트",
    "투명 아크릴 북마크",
    "미니 포켓 스케치 노트",
    "반려동물 슬로우 식기",
    "산책용 풉백 디스펜서",
    "코튼 펫 스카프",
    "반려동물 실리콘 브러시",
    "여행용 압축 파우치",
    "폴딩 캠핑 컵",
    "방수 미니 드라이백",
    "트래블 케이블 오거나이저",
    "접이식 알루미늄 거치대",
    "자석 케이블 홀더",
    "패브릭 데스크 매트",
    "시즌 기프트 포장 키트",
    "스테인리스 티 인퓨저",
    "빈티지 캔버스 파우치",
    "VIP 큐레이션 키링 세트",
    "VIP 여행 수납 컬렉션",
  ];
  const categories = [
    "living",
    "fashion",
    "stationery",
    "pets",
    "travel",
    "digital",
    "season",
  ];
  for (let i = 0; i < names.length; i++) {
    const n = i + 1,
      categoryId = categories[Math.min(6, Math.floor(i / 4))],
      moq = [5, 10, 3, 20][i % 4],
      base = 980 + i * 170,
      productId = "product-" + n;
    await db.product.upsert({
      where: { id: productId },
      update: {},
      create: {
        id: productId,
        code: "WR-" + String(n).padStart(4, "0"),
        slug: "product-" + n,
        name: names[i],
        description:
          names[i] +
          " 데모 상품입니다. 온라인 판매용 상품 구성을 검토할 수 있도록 제작한 예시이며 실제 규격·소재·원산지는 공급 계약 후 확정합니다.",
        sellingPoints:
          "명확한 최소주문수량으로 초기 재고를 계획하세요. 옵션별 수량 조건과 묶음배송 조건을 함께 확인하면 구매원가를 비교하기 좋습니다.",
        tags: [
          categories[Math.min(6, Math.floor(i / 4))],
          names[i].split(" ")[0],
          "데모",
        ],
        image: "/images/product-" + n + ".svg",
        categoryId,
        shippingGroupId:
          i % 7 === 0 ? "group-free" : i % 2 === 0 ? "group-a" : "group-b",
        recommended: i < 5 || i === 10,
        vipOnly: i >= 26,
        recommendation:
          i < 5 ? "소량 테스트 판매를 검토하기 좋은 구성입니다." : "",
      },
    });
    for (let option = 0; option < 2; option++) {
      const id = "variant-" + n + "-" + option;
      await db.productVariant.upsert({
        where: { id },
        update: {},
        create: {
          id,
          productId,
          sku: "WR-" + n + "-" + option,
          name: option ? "포레스트" : "샌드",
          moq,
          step: moq,
          onHand: i === 11 ? 0 : i === 15 ? moq - 1 : 300 + i * 10,
        },
      });
      for (const [minQty, standard] of [
        [moq, base + option * 100],
        [moq * 5, base + option * 100 - 100],
        [moq * 20, base + option * 100 - 200],
      ])
        await db.priceTier.upsert({
          where: { variantId_minQty: { variantId: id, minQty } },
          update: {},
          create: { variantId: id, minQty, standard, vip: standard - 80 },
        });
    }
    const scope =
      "데모 환경에서 판매페이지 제작 연습에만 사용할 수 있습니다. 재배포·자료 판매는 허용되지 않으며 저작권 이전을 의미하지 않습니다.";
    const storageKey = "demo-product-" + n + ".pdf";
    const pdf = demoPdf("Product " + n);
    await mkdir(path.resolve(process.env.STORAGE_PATH ?? "storage/private"), {
      recursive: true,
    });
    await writeFile(
      path.resolve(process.env.STORAGE_PATH ?? "storage/private", storageKey),
      pdf,
    );
    await db.productAsset.upsert({
      where: { storageKey },
      update: {},
      create: {
        id: "asset-" + n,
        productId,
        name: names[i] + " 데모 자료.pdf",
        storageKey,
        mime: "application/pdf",
        size: Buffer.byteLength(pdf),
        usageScope: scope,
      },
    });
  }
  for (const [id, name, status, grade, role] of [
    ["pending", "승인대기 체험", "PENDING", "STANDARD", "CUSTOMER"],
    ["standard", "일반회원 체험", "APPROVED", "STANDARD", "CUSTOMER"],
    ["vip", "VIP 체험", "APPROVED", "VIP", "CUSTOMER"],
    ["admin", "운영자 체험", "APPROVED", "VIP", "ADMIN"],
  ] as const) {
    await db.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name,
        email: id + "@demo.local",
        businessStatus: status,
        memberGrade: grade,
        role,
        company: "데모 사업자 · 실제 정보 아님",
        phone: "01000000000",
        businessNumber: "0000000000",
        policyVersion: "draft-v1",
        consentAt: new Date(),
      },
    });
    await db.account.upsert({
      where: {
        providerId_accountId: { providerId: "credential", accountId: id },
      },
      update: {},
      create: {
        id: "account-" + id,
        userId: id,
        accountId: id,
        providerId: "credential",
        password: await hashPassword("DemoOnly!2026"),
      },
    });
  }
  const content = [
    [
      "moq",
      "GUIDE",
      "최소주문수량, 정확히 이해하기",
      "최소주문수량(MOQ)은 옵션별로 적용됩니다. 샌드 옵션의 MOQ가 5개라면 샌드 3개와 포레스트 2개를 합쳐 주문할 수 없습니다. 주문 단위 역시 옵션별로 확인하세요.",
    ],
    [
      "cost",
      "GUIDE",
      "배송비까지 포함한 구매원가 계산",
      "상품금액에 배송비를 더한 후 수량으로 나누어 개당 구매원가를 계산합니다. 동일 배송그룹은 정책에 따라 합배송하며 다른 출고지의 상품은 별도 배송비가 적용됩니다. 샘플 상품은 VAT 포함이므로 결제에서 VAT를 추가하지 않습니다.",
    ],
    [
      "asset-guide",
      "GUIDE",
      "상품자료, 어디까지 사용할 수 있을까요?",
      "구매자료에는 파일별 사용 범위가 있습니다. 구매했다고 모든 저작권이 이전되지 않습니다. 승인 상태와 주문 소유권을 서버에서 확인한 후 자료를 제공합니다.",
    ],
    [
      "welcome",
      "NOTICE",
      "사업자 승인과 데모 이용 안내",
      "사업자 회원가입 후 운영자가 정보를 검토합니다. 사업자번호 형식 검사는 공식 인증이 아닙니다. 데모 주문은 실제 결제와 실제 매출로 집계되지 않습니다.",
    ],
    [
      "hero",
      "BANNER",
      "판매할 상품을 찾는 가장 실전적인 방법",
      "김우람의 상품 큐레이션과 명확한 도매 조건으로, 내 사업에 맞는 상품을 빠르게 찾아보세요.",
    ],
    [
      "terms",
      "POLICY",
      "이용약관 · 운영 검토용 초안",
      "초안 v1. 이 문서는 확정된 약관이 아닙니다. 사업자 승인 후 구매가 가능합니다. 가격·MOQ·배송 조건은 주문서에서 확인합니다. 운영 전 법적 사업자정보, 책임 범위, 분쟁 처리 및 약관 시행일을 확정해주세요.",
    ],
    [
      "privacy",
      "POLICY",
      "개인정보처리방침 · 운영 검토용 초안",
      "초안 v1. 가입과 주문 처리를 위해 담당자명, 이메일, 연락처, 사업자정보, 배송지를 수집합니다. 운영 전 개인정보 담당자, 보유기간, 위탁처, 삭제·열람 요청 절차를 확정해야 합니다. 선택 마케팅 동의는 필수 동의와 분리됩니다.",
    ],
    [
      "shipping",
      "POLICY",
      "배송 안내 · 데모 규칙",
      "데모 A그룹은 배송비 3,000원이며 그룹 상품금액 100,000원 이상 무료입니다. B그룹은 3,500원 정액입니다. 무료배송 그룹은 배송비가 없습니다. 다른 배송그룹은 별도 계산됩니다. 추가 지역 배송비는 미적용입니다. 실제 정책은 운영 전 확정해야 합니다.",
    ],
    [
      "returns",
      "POLICY",
      "교환·반품 안내 · 운영 검토용 초안",
      "불량·오배송·단순 변심·주문제작 여부에 따라 개별 조건을 확인합니다. B2B라는 이유만으로 환불을 일괄 차단하지 않습니다. 운영 전 접수기한, 비용 부담, 검수 절차와 PG 환불 처리를 확정해주세요.",
    ],
    [
      "assets",
      "POLICY",
      "상품자료 이용 범위 · 데모 안내",
      "구매한 상품의 자료는 승인된 회원이 해당 주문의 소유권을 유지할 때 제공됩니다. 각 파일에 안내된 사용 허용 범위를 확인하세요. 구매는 저작권의 이전을 의미하지 않습니다. 데모 자료는 데모 환경에서만 이용 가능합니다.",
    ],
  ];
  for (const [slug, kind, title, body] of content)
    await db.content.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        kind,
        title,
        body,
        href: kind === "BANNER" ? "/products" : "",
      },
    });
  await db.quoteRequest.upsert({
    where: { id: "demo-quote" },
    update: {},
    create: {
      id: "demo-quote",
      userId: "standard",
      message:
        "소량 테스트 판매 후 500개 추가 주문 조건을 알고 싶습니다. (데모)",
      phone: "01000000000",
      consentAt: new Date(),
      items: { create: { productId: "product-1", quantity: 500 } },
    },
  });
  await db.$transaction(async (tx) => {
    if (await tx.order.findUnique({ where: { id: "demo-order" } })) return;
    const v = await tx.productVariant.findUniqueOrThrow({
      where: { id: "variant-25-0" },
      include: { tiers: true, product: { include: { shippingGroup: true } } },
    });
    const qty = v.moq,
      unit = v.tiers.find((t) => t.minQty === qty)!.standard,
      amount = qty * unit,
      fee = v.product.shippingGroup.fee,
      supply = Math.round(amount / 1.1) + Math.round(fee / 1.1);
    await tx.order.create({
      data: {
        id: "demo-order",
        number: "DEMO-SEED-0001",
        userId: "standard",
        idempotencyKey: "demo-seed-order",
        isDemo: true,
        status: "PAID",
        paymentStatus: "PAID",
        recipient: "데모 수령인",
        phone: "01000000000",
        postcode: "00000",
        address: "데모 주소 · 실제 주소 아님",
        detail: "데모",
        memo: "샘플 주문",
        subtotal: amount,
        shipping: fee,
        total: amount + fee,
        supply,
        tax: amount + fee - supply,
        shippingSnapshot: [{ id: v.product.shippingGroupId, cost: fee }],
        policyVersion: "draft-v1",
        consentAt: new Date(),
        expiresAt: new Date(),
        items: {
          create: {
            variantId: v.id,
            productId: v.productId,
            productName: v.product.name,
            productCode: v.product.code,
            optionName: v.name,
            quantity: qty,
            unitPrice: unit,
            amount,
            supply: Math.round(amount / 1.1),
            tax: amount - Math.round(amount / 1.1),
            shippingGroupId: v.product.shippingGroupId,
          },
        },
        payment: {
          create: {
            provider: "mock",
            status: "PAID",
            amount: amount + fee,
            confirmedAt: new Date(),
          },
        },
      },
    });
    await tx.productVariant.update({
      where: { id: v.id },
      data: { onHand: { decrement: qty } },
    });
  });
  console.log("Seed ready: 28 products, 7 categories, 4 demo accounts.");
}
main().finally(() => db.$disconnect());
