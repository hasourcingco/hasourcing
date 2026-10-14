import type { Metadata } from "next";
import { env } from "./env";
export function publicMetadata(
  path: string,
  title: string,
  description?: string,
): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: new URL(path, env.SITE_URL).href },
  };
}
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\u003c");
}
