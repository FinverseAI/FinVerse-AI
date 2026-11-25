"use client";

import { useSyncExternalStore } from "react";
import type { IconName } from "../../(module-one)/dashboard/ui";

export const sections = [
  {
    id: "overview",
    label: "Market",
    icon: "chart",
    title: "Market overview",
    description:
      "Follow Indian equities, gold and silver, and the biggest moves across your stocks.",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: "wallet",
    title: "Your portfolio",
    description: "Track the value, returns and exposure of your holdings.",
  },
  {
    id: "watchlist",
    label: "Watchlist",
    icon: "bell",
    title: "Your watchlist",
    description:
      "Keep your research notes and price targets alongside the latest quotes.",
  },
  {
    id: "screener",
    label: "Smart Screener",
    icon: "filter",
    title: "Smart Screener",
    description: "Find stocks by valuation, momentum and moving-average trend.",
  },
  {
    id: "optimizer",
    label: "Optimizer",
    icon: "target",
    title: "Optimizer",
    description:
      "Explore how changes to your holdings affect portfolio allocation.",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  title: string;
  description: string;
  icon: IconName;
}>;

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function currentSection() {
  const hash = window.location.hash.slice(1);
  if (hash === "holdings") return sections[1];
  return sections.find((section) => section.id === hash) ?? sections[0];
}

export function useMarketSection() {
  return useSyncExternalStore(subscribe, currentSection, () => sections[0]);
}
