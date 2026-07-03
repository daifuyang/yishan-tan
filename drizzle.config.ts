export * from "./schema";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://yishan_tan:change_me_in_production@localhost:5432/yishan_tan",
  },
  verbose: true,
  strict: true,
});
