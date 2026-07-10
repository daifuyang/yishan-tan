import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./src/lib/database-url";

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      getDatabaseUrl() ?? "postgres://yishan_tan:change_me_in_production@localhost:5432/yishan_tan",
  },
  verbose: true,
  strict: true,
});
