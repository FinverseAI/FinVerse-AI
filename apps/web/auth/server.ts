import { PrismaClient } from "@prisma/client";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { webOrigin } from "../lib/env";
import { databaseUrl } from "../lib/database-url";

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  prismaGlobal.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl(process.env.DATABASE_URL),
  });
prismaGlobal.prisma = prisma;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
export const googleAuthEnabled = Boolean(googleClientId && googleClientSecret);

if (
  (googleAuthEnabled || process.env.NODE_ENV === "production") &&
  (!betterAuthSecret || betterAuthSecret.length < 32)
) {
  throw new Error(
    "BETTER_AUTH_SECRET must contain at least 32 characters when authentication is configured or in production.",
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: webOrigin(),
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
