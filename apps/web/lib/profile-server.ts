import "server-only";
import { headers } from "next/headers";
import { readProfileResponse } from "./profile";
import { backendUrl } from "./env";

export async function getServerProfile() {
  const incoming = await headers();
  const response = await fetch(new URL("/api/profile", backendUrl()), {
    headers: { cookie: incoming.get("cookie") ?? "" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  return readProfileResponse(response);
}
