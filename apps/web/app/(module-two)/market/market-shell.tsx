"use client";

import "./market.css";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../auth/client";
import type { AuthUser } from "../../../auth/types";
import { Icon } from "../../(module-one)/dashboard/ui";
import { ProfileMenu } from "../../(module-one)/dashboard/navigation";

import { sections, useMarketSection } from "./market-workspace";

function MarketSidebar({ active }: { active: string }) {
  const items = [
    { label: "Dashboard", icon: "grid" as const, href: "/dashboard" },
    ...sections.map((section) => ({
      ...section,
      href: `/market#${section.id}`,
    })),
  ];
  return (
    <aside className="dashboard-sidebar fixed z-30 hidden flex-col items-center py-4 sm:flex">
      <a
        href="/market"
        aria-label="Market dashboard"
        className="brand-mark grid size-10 place-items-center text-lg font-semibold"
      >
        F
      </a>
      <nav aria-label="Sidebar" className="mt-6 flex flex-col gap-1">
        {items.map((item) => {
          const isActive = item.href === `/market#${active}`;
          const className = `grid size-9 place-items-center rounded-panel transition-colors ${isActive ? "bg-dash-accent/15 text-dash-accent" : "text-dash-muted hover:bg-dash-raised hover:text-dash-text"}`;
          return (
            <a
              key={item.label}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              <Icon name={item.icon} />
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

export function MarketShell({
  user,
  eyebrow,
  title,
  description,
  children,
}: {
  user?: AuthUser;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const active = useMarketSection();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function signOut() {
    setSignOutError("");
    setIsSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error)
        throw new Error(
          error.message ?? "Unable to log out. Please try again.",
        );
      router.replace("/");
      router.refresh();
    } catch (error) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again.",
      );
      setIsSigningOut(false);
    }
  }

  return (
    <div className="dashboard market-workspace min-h-screen bg-dash-bg font-sans text-dash-text">
      <a
        href="#market-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-20 focus:z-50 focus:rounded-lg focus:bg-dash-accent focus:p-3 focus:text-dash-bg"
      >
        Skip to market
      </a>
      <MarketSidebar active={active.id} />
      <div className="sm:pl-24">
        <header className="dashboard-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-dash-border px-7 py-3 max-sm:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="whitespace-nowrap text-sm font-semibold">
              FinVerse
            </span>
            <span className="text-sm text-dash-muted">/ Investments</span>
            <a className="dash-nav text-xs" href="/dashboard">
              Dashboard
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ProfileMenu
              user={user}
              onSignOut={signOut}
              isSigningOut={isSigningOut}
              signOutError={signOutError}
            />
          </div>
          <nav className="market-section-nav" aria-label="Investment tools">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`/market#${section.id}`}
                aria-current={active.id === section.id ? "page" : undefined}
              >
                <Icon name={section.icon} />
                {section.label}
              </a>
            ))}
          </nav>
        </header>
        <main id="market-content" className="dashboard-body space-y-5">
          <section className="dashboard-intro" aria-label="Market introduction">
            <div>
              <p className="dash-eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
              <p className="mt-3 text-sm leading-6 text-dash-muted">
                {description}
              </p>
            </div>
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}
