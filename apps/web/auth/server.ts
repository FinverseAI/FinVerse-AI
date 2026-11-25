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
  process.env.NODE_ENV !== "development" &&
  (!betterAuthSecret || betterAuthSecret.length < 32)
) {
  // Fail closed everywhere except an explicit local development run:
  // the placeholder below is repo-public, so any other environment
  // (production, an unset NODE_ENV on a deploy, staging, test) without
  // a real secret must refuse to boot instead of signing sessions
  // with a secret anyone can read.
  throw new Error(
    "BETTER_AUTH_SECRET must contain at least 32 characters outside local development.",
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: webOrigin(),
  secret:
    betterAuthSecret ??
    // Repo-public placeholder, usable only in explicit local
    // development — the guard above throws before this is reached
    // anywhere else.
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
