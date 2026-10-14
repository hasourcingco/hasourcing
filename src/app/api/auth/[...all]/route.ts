import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(req: Request) {
  if (new URL(req.url).pathname.replace(/\/$/, "").endsWith("/sign-up/email"))
    return Response.json(
      { error: "사업자 회원가입 화면을 이용해주세요." },
      { status: 403 },
    );
  return handlers.POST(req);
}
