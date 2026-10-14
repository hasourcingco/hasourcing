import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/domain";
import { isDemo } from "@/lib/env";
import { storage } from "@/services/storage";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const u = await currentUser();
  if (!u) return new NextResponse("로그인 필요", { status: 401 });
  const a = await db.productAsset.findUnique({
    where: { id: (await params).id },
    include: { product: true },
  });
  if (!a || !canAccess(u, a.product.vipOnly))
    return new NextResponse("접근 권한 없음", { status: 403 });
  const own = await db.order.findFirst({
    where: {
      userId: u.id,
      paymentStatus: "PAID",
      ...(isDemo ? {} : { isDemo: false }),
      items: { some: { productId: a.productId } },
    },
  });
  if (u.role !== "ADMIN" && !own)
    return new NextResponse("구매 권한 없음", { status: 403 });
  try {
    const b = await storage.get(a.storageKey);
    return new NextResponse(new Uint8Array(b), {
      headers: {
        "Content-Type": a.mime,
        "Content-Disposition":
          "attachment; filename*=UTF-8''" + encodeURIComponent(a.name),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("파일을 찾을 수 없습니다.", { status: 404 });
  }
}
