import type { Metadata } from "next";
import { guardProfile } from "../../../auth/profile-guard";
import { readWorkspaceTheme } from "../../../lib/workspace-theme-server";
import Market from "./market";

export const metadata: Metadata = {
  title: "Market",
  robots: { index: false, follow: false },
  description:
    "Market indices, stock search, your watchlist, holdings and portfolio — prices from Yahoo Finance, every number traced to a stored price.",
};

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const result = await guardProfile("market");
  return (
    <Market user={result!.user} initialTheme={await readWorkspaceTheme()} />
  );
}
