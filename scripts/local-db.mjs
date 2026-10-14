import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
if (process.env.APP_ENV === "production") throw new Error("개발 전용 실행기");
mkdirSync(".local-db", { recursive: true });
const pg = new EmbeddedPostgres({
  databaseDir: ".local-db/data",
  user: "b2b",
  password: "b2b_local_only",
  port: 5432,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1"],
});
if (!existsSync(".local-db/data/PG_VERSION")) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const check = await client.query(
  "SELECT 1 FROM pg_database WHERE datname='b2b'",
);
if (!check.rowCount) await pg.createDatabase("b2b");
await client.end();
console.log("Development PostgreSQL running on 127.0.0.1:5432");
process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await pg.stop();
  process.exit(0);
});
setInterval(() => {}, 60000);
