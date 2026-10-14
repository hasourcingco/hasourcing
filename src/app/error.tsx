"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="empty">
      <h1>요청을 처리하지 못했습니다.</h1>
      <p>DB 연결 상태를 확인하거나 잠시 후 다시 시도해주세요.</p>
      <button className="btn" onClick={reset}>
        다시 시도
      </button>
    </section>
  );
}
