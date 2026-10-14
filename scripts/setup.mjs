import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
if (!existsSync(".env"))
  writeFileSync(
    ".env",
    readFileSync(".env.example", "utf8").replace(
      "replace-with-a-random-secret-of-at-least-32-characters",
      randomBytes(32).toString("hex"),
    ),
  );
dotenv.config();
const run = (file, args) => {
  const r = spawnSync(process.execPath, [file, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (r.error) {
    console.error(r.error.message);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run("node_modules/prisma/build/index.js", ["generate"]);
run("node_modules/prisma/build/index.js", ["migrate", "deploy"]);
if (
  ["local", "demo"].includes(process.env.APP_ENV) &&
  process.env.DEMO_ENABLED === "true"
)
  run("node_modules/tsx/dist/cli.mjs", ["prisma/seed.ts"]);
else console.log("운영 환경: seed 생략");
