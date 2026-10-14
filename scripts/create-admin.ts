import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";
const io = createInterface({ input: stdin, output: stdout });
try {
  const email = (await io.question("운영 관리자 이메일: ")).trim();
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email) || email.endsWith("@demo.local"))
    throw new Error("실제 관리자 이메일을 입력해주세요.");
  const password = await io.question(
    "새 관리자 비밀번호 (12자 이상, 화면에 입력이 보입니다): ",
  );
  if (password.length < 12 || password === "DemoOnly!2026")
    throw new Error("새 비밀번호를 12자 이상 입력해주세요.");
  const id = randomUUID();
  await db.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id,
        name: "운영 관리자",
        email,
        role: "ADMIN",
        businessStatus: "APPROVED",
        memberGrade: "VIP",
      },
    });
    await tx.account.create({
      data: {
        id: randomUUID(),
        providerId: "credential",
        accountId: id,
        userId: id,
        password: await hashPassword(password),
      },
    });
  });
  console.log("관리자 계정을 생성했습니다.");
} finally {
  io.close();
  await db.$disconnect();
}
