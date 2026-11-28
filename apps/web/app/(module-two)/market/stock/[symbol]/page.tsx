import type { Metadata } from "next";
import { guardProfile } from "../../../../../auth/profile-guard";
import { readWorkspaceTheme } from "../../../../../lib/workspace-theme-server";
import StockProfile from "./stock-profile";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: symbol.toUpperCase(),
    robots: { index: false, follow: false },
    description: `Price history, indicators and fundamentals for ${symbol.toUpperCase()}.`,
  };
}

export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const result = await guardProfile("market");
  return (
    <StockProfile
      symbol={symbol.toUpperCase()}
      user={result!.user}
      initialTheme={await readWorkspaceTheme()}
    />
  );
}
