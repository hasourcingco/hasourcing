"use client";
import Image from "next/image";
import { useState } from "react";
export function ProductImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [bad, setBad] = useState(false);
  return (
    <Image
      unoptimized
      className={className}
      src={bad ? "/images/unavailable.svg" : src}
      alt={bad ? "이미지를 불러올 수 없습니다." : alt}
      width={400}
      height={400}
      loading="lazy"
      onError={() => setBad(true)}
    />
  );
}
