"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../auth/client";
import type { AuthUser } from "../../../auth/types";
import { Icon } from "../../(module-one)/dashboard/ui";
import { ProfileMenu } from "../../(module-one)/dashboard/navigation";

function MarketSidebar({ active }: { active: "market" }) {
  const items = [
    { label: "Dashboard", icon: "grid" as const, href: "/dashboard" },
    { label: "Market", icon: "pie" as const, href: "/market" },
    { label: "Portfolio", icon: "target" as const, href: "/market#portfolio" },
    { label: "Holdings", icon: "wallet" as const, href: "/market#holdings" },
    { label: "Screener", icon: "filter" as const, href: "/market#screener" },
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
          const isActive = active === "market" && item.href === "/market";
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
    <div className="dashboard min-h-screen bg-dash-bg font-sans text-dash-text">
      <a
        href="#market-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-20 focus:z-50 focus:rounded-lg focus:bg-dash-accent focus:p-3 focus:text-dash-bg"
      >
        Skip to market
      </a>
      <MarketSidebar active="market" />
      <div className="sm:pl-24">
        <header className="dashboard-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-dash-border px-7 py-3 max-sm:px-4">
          <div className="flex items-center gap-6">
            <h1 className="whitespace-nowrap text-sm font-semibold">
              FinVerse
            </h1>
            <nav
              aria-label="Market navigation"
              className="hidden items-center gap-1 text-xs text-dash-muted xl:flex"
            >
              <a className="dash-nav" href="/dashboard">
                Dashboard
              </a>
              <a
                href="/market"
                aria-current="page"
                className="rounded-full bg-dash-accent/15 px-3 py-2 text-dash-accent"
              >
                Market
              </a>
              <a className="dash-nav" href="/market#portfolio">
                Portfolio
              </a>
              <a className="dash-nav" href="/market#holdings">
                Holdings
              </a>
              <a className="dash-nav" href="/market#screener">
                Screener
              </a>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
            <ProfileMenu
              user={user}
              onSignOut={signOut}
              isSigningOut={isSigningOut}
              signOutError={signOutError}
            />
          </div>
        </header>
        <main id="market-content" className="dashboard-body space-y-5">
          <section className="dashboard-intro" aria-label="Market introduction">
            <div>
              <p className="dash-eyebrow">{eyebrow}</p>
              <h2>{title}</h2>
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
