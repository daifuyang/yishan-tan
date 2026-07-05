import { apiKey } from "@better-auth/api-key";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";

declare global {
  var __YISHAN_TAN_AUTH__: ReturnType<typeof buildAuth> | undefined;
}

function buildAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    secret: process.env.BETTER_AUTH_SECRET ?? "yishan-tan-install-mode-secret-placeholder-000000",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    trustedOrigins: [
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? []),
      process.env.BETTER_AUTH_URL,
      "http://localhost:3000",
    ].filter(Boolean) as string[],
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    advanced: {
      cookiePrefix: "yishantan",
      useSecureCookies: process.env.NODE_ENV === "production",
      database: { generateId: "uuid" },
    },
    plugins: [
      apiKey({
        apiKeyHeaders: ["x-api-key"],
        enableMetadata: true,
        defaultPrefix: "yishantan_",
        rateLimit: { enabled: false },
      }),
      tanstackStartCookies(),
    ],
    user: {
      additionalFields: {
        username: { type: "string", required: true, input: true },
        displayName: { type: "string", required: false, input: true },
        phone: { type: "string", required: false, input: true },
        role: { type: "string", required: false, input: false },
      },
    },
  });
}

export const auth = new Proxy({} as ReturnType<typeof buildAuth>, {
  get(_target, prop, receiver) {
    let real = globalThis.__YISHAN_TAN_AUTH__;
    if (!real) {
      real = buildAuth();
      globalThis.__YISHAN_TAN_AUTH__ = real;
    }
    return Reflect.get(real, prop, receiver);
  },
});

export type Auth = ReturnType<typeof buildAuth>;
