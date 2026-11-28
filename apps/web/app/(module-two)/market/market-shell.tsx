"use client";

import "./market.css";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../auth/client";
import type { AuthUser } from "../../../auth/types";
import type { WorkspaceTheme } from "../../../lib/workspace-theme";
import {
  useWorkspaceTheme,
  WorkspaceRail,
} from "../../(module-one)/dashboard/navigation";
import styles from "../../(module-one)/dashboard/dashboard.module.css";

import { sections, useMarketSection } from "./market-workspace";

export function MarketShell({
  user,
  initialTheme = "dark",
  eyebrow,
  title,
  description,
  children,
}: {
  user?: AuthUser;
  initialTheme?: WorkspaceTheme;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const active = useMarketSection();
  const { theme, toggleTheme } = useWorkspaceTheme(initialTheme);
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
    <div
      data-theme={theme}
      className={`${styles.root} dashboard market-workspace min-h-screen bg-dash-bg font-sans text-dash-text`}
    >
      <a
        href="#market-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-20 focus:z-50 focus:rounded-lg focus:bg-dash-accent focus:p-3 focus:text-dash-bg"
      >
        Skip to market
      </a>
      <div className={styles.trackerBody}>
        <WorkspaceRail
          items={[
            { label: "Dashboard", icon: "grid", href: "/dashboard" },
            ...sections.map((section) => ({
              label: section.label,
              icon: section.icon,
              href: `/market#${section.id}`,
              active: section.id === active.id,
            })),
          ]}
          brandHref="/market"
          brandLabel="Market dashboard"
          navigationLabel="Investment tools"
          user={user}
          onSignOut={signOut}
          isSigningOut={isSigningOut}
          signOutError={signOutError}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main id="market-content" className={`${styles.trackerMain} space-y-3`}>
          <header className="market-intro">
            <p className="finance-panel-title">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="text-sm leading-6 text-dash-muted">{description}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
