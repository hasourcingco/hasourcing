import "dotenv/config";
import { cpSync, existsSync, mkdirSync, symlinkSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const target = resolve(".next/standalone");
if (!existsSync(target + "/server.js"))
  throw new Error("먼저 npm run build를 실행해주세요.");
const uploads = resolve("public/uploads");
mkdirSync(uploads, { recursive: true });
cpSync("public", target + "/public", {
  recursive: true,
  filter: (source) => resolve(source) !== uploads,
});
if (!existsSync(target + "/public/uploads"))
  symlinkSync(
    uploads,
    target + "/public/uploads",
    process.platform === "win32" ? "junction" : "dir",
  );
process.env.STORAGE_PATH = resolve(
  process.env.STORAGE_PATH ?? "storage/private",
);
cpSync(".next/static", target + "/.next/static", { recursive: true });
process.env.HOSTNAME = "127.0.0.1";
process.env.PORT ??=
  new URL(process.env.SITE_URL ?? "http://localhost:3000").port || "3000";
await import(pathToFileURL(target + "/server.js").href);
