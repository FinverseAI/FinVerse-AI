import { PrismaClient } from "@prisma/client";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = prismaGlobal.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = prisma;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

if (googleClientId && googleClientSecret && !betterAuthSecret) {
  throw new Error(
    "BETTER_AUTH_SECRET is required when Google authentication is configured.",
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  // This fallback keeps the unconfigured local UI buildable. It must never be
  // used once a provider is enabled; the check above enforces that.
  secret:
    betterAuthSecret ??
    "finverse-local-auth-placeholder-do-not-use-in-production-2026",
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {},
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [nextCookies()],
});
