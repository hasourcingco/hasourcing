import { publicMetadata } from "@/lib/seo";
import Link from "next/link";
import { db } from "@/lib/db";
export const metadata = publicMetadata("/guides", "소싱 가이드");
export default async function Guides() {
  const list = await db.content.findMany({
    where: { kind: "GUIDE", published: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <>
      <div className="page-heading">
        <h1>소싱 가이드</h1>
        <p>상품 선택부터 원가 계산, 자료 활용까지 실무 기준을 확인하세요.</p>
      </div>
      <div className="guide-grid">
        {list.map((g, i) => (
          <Link className="guide-card" href={"/guides/" + g.slug} key={g.id}>
            <span>GUIDE 0{i + 1}</span>
            <h3>{g.title}</h3>
            <p>{g.body.slice(0, 100)}...</p>
          </Link>
        ))}
      </div>
    </>
  );
}
