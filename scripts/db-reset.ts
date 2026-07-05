import { readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const migrationsDir = path.resolve("db/migrations");
const journalPath = path.join(migrationsDir, "meta/_journal.json");

const sql = postgres(databaseUrl, { connect_timeout: 5, onnotice: () => {} });

try {
  console.log("[reset] dropping schemas...");
  await sql.unsafe("drop schema if exists public cascade");
  await sql.unsafe("drop schema if exists drizzle cascade");
  await sql.unsafe("create schema public");
  await sql.unsafe("grant all on schema public to public");
  console.log("[reset] schemas reset");

  console.log("[reset] clearing migration files...");
  for (const entry of await readdir(migrationsDir, { withFileTypes: true })) {
    if (entry.isFile() && (entry.name.endsWith(".sql") || entry.name.endsWith(".json"))) {
      await rm(path.join(migrationsDir, entry.name));
    }
  }
  for (const entry of await readdir(path.join(migrationsDir, "meta"), { withFileTypes: true })) {
    if (entry.isFile()) {
      await rm(path.join(migrationsDir, "meta", entry.name));
    }
  }
  await writeFile(
    journalPath,
    `${JSON.stringify({ version: "7", dialect: "postgresql", entries: [] }, null, 2)}\n`,
  );
  console.log("[reset] journal cleared");
} finally {
  await sql.end({ timeout: 1 });
}
