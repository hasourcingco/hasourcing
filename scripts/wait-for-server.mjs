const url = new URL(
  "/api/health",
  process.env.SITE_URL ?? "http://127.0.0.1:3001",
);
let ready = false;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (r.ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) throw new Error("웹앱 health check를 통과하지 못했습니다.");
console.log("웹앱과 데이터베이스 준비 완료");
