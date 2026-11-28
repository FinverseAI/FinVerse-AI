"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../../../auth/types";
import {
  workspaceThemeCookie,
  type WorkspaceTheme,
} from "../../../lib/workspace-theme";
import { Icon, type IconName } from "./ui";
import { shiftMonth } from "./spending-data";
import styles from "./dashboard.module.css";

type HeaderProps = {
  month: string;
  onMonth: (month: string) => void;
  query: string;
  onQuery: (query: string) => void;
  onSearch: () => void;
  onAdd: () => void;
  onNotifications: () => void;
  /** Bills needing attention (overdue or due within a week); shows a badge on the bell. */
  notificationCount?: number;
};

type ProfileMenuProps = {
  user?: AuthUser;
  onSignOut: () => void;
  isSigningOut: boolean;
  signOutError: string;
  placement?: "toolbar" | "rail";
};

export function ProfileMenu({
  user,
  onSignOut,
  isSigningOut,
  signOutError,
  placement = "toolbar",
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const signOut = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [isOpen]);
  const name = user?.name || user?.email || "Profile";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="relative"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
          trigger.current?.focus();
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            requestAnimationFrame(() => signOut.current?.focus());
          } else if (event.target === trigger.current) signOut.current?.focus();
          else trigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setIsOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        aria-label="Open profile menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="grid size-8 place-items-center overflow-hidden rounded-full border border-dash-border bg-dash-raised text-xs font-semibold text-dash-text transition-colors hover:border-dash-accent/60"
      >
        {user?.image && placement !== "rail" ? (
          <Image
            src={user.image}
            alt=""
            width={32}
            height={32}
            unoptimized
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute z-30 w-56 rounded-xl border border-dash-border bg-dash-surface p-1.5 ${placement === "rail" ? styles.railMenu : "right-0 top-10"}`}
        >
          <div className="border-b border-dash-border px-3 py-2.5">
            <p className="truncate text-xs font-medium text-dash-text">
              {name}
            </p>
            {user?.email && (
              <p className="mt-1 truncate text-xs text-dash-muted">
                {user.email}
              </p>
            )}
          </div>
          <button
            type="button"
            ref={signOut}
            onClick={onSignOut}
            disabled={isSigningOut}
            className="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-dash-muted transition-colors hover:bg-dash-raised hover:text-dash-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Logging out..." : "Log out"}
          </button>
          {signOutError && (
            <p role="alert" className="px-3 pb-1 pt-1 text-xs text-dash-red">
              {signOutError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Header({
  month,
  onMonth,
  query,
  onQuery,
  onSearch,
  onAdd,
  onNotifications,
  notificationCount = 0,
}: HeaderProps) {
  return (
    <section
      aria-label="FinVerse activity tools"
      className={styles.activityTools}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="dash-icon-button !size-8 !min-w-8"
            aria-label="Previous month"
            disabled={month <= "1900-01"}
            onClick={() => onMonth(shiftMonth(month, -1))}
          >
            <Icon name="left" className="size-3.5" />
          </button>
          <label className="relative">
            <span className="mr-2 text-xs text-dash-muted">Activity month</span>
            <input
              type="month"
              min="1900-01"
              max="9999-12"
              value={month}
              onChange={(event) => {
                if (
                  event.target.validity.valid &&
                  /^\d{4}-\d{2}$/.test(event.target.value)
                )
                  onMonth(event.target.value);
              }}
              className="dash-input py-2 text-xs text-dash-muted"
            />
          </label>
          <button
            type="button"
            className="dash-icon-button !size-8 !min-w-8"
            aria-label="Next month"
            disabled={month >= "9999-12"}
            onClick={() => onMonth(shiftMonth(month, 1))}
          >
            <Icon name="right" className="size-3.5" />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
          className="surface-inset flex h-10 min-w-36 flex-1 items-center gap-2 border border-dash-border px-3"
        >
          <Icon name="search" className="size-4 shrink-0 text-dash-muted" />
          <input
            aria-label="Search transactions"
            placeholder="Search transactions…"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            className="min-w-0 w-full bg-transparent text-xs outline-none placeholder:text-dash-muted"
          />
          <button type="submit" className="text-xs text-dash-text">
            Search
          </button>
        </form>
        <button
          className="dash-icon-button relative"
          aria-label={
            notificationCount > 0
              ? `Notifications, ${notificationCount} bill${notificationCount === 1 ? "" : "s"} need${notificationCount === 1 ? "s" : ""} attention`
              : "Notifications"
          }
          onClick={onNotifications}
        >
          <Icon name="bell" />
          {notificationCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-dash-accent px-1 text-xs font-semibold text-dash-bg"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
        <button
          className="dash-primary h-8 gap-1.5 px-3 max-sm:ml-auto"
          onClick={onAdd}
        >
          <Icon name="plus" className="size-3.5" />
          Add transaction
        </button>
      </div>
    </section>
  );
}

type RailItem = {
  label: string;
  icon: IconName;
  active?: boolean;
} & ({ href: string } | { action: () => void });

type RailControls = {
  user?: AuthUser;
  onSignOut?: () => void;
  isSigningOut?: boolean;
  signOutError?: string;
  theme: WorkspaceTheme;
  onToggleTheme: () => void;
};

export function useWorkspaceTheme(initialTheme: WorkspaceTheme) {
  const [theme, setTheme] = useState(initialTheme);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.cookie = `${workspaceThemeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.cookie = `${workspaceThemeCookie}=; Path=/dashboard; Max-Age=0; SameSite=Lax`;
    setTheme(next);
  }

  return { theme, toggleTheme };
}

export function WorkspaceRail({
  items,
  brandHref,
  brandLabel,
  navigationLabel,
  user,
  onSignOut,
  isSigningOut = false,
  signOutError = "",
  theme,
  onToggleTheme,
}: RailControls & {
  items: readonly RailItem[];
  brandHref: string;
  brandLabel: string;
  navigationLabel: string;
}) {
  const themeAction = theme === "dark" ? "Light mode" : "Dark mode";
  return (
    <aside className={styles.trackerRail}>
      <a
        href={brandHref}
        aria-label={brandLabel}
        className={styles.railBrand}
      >
        F
      </a>
      <nav aria-label={navigationLabel}>
        {items.map((item) => {
          const className = `${styles.railButton} ${item.active ? styles.railActive : ""}`;
          return "href" in item ? (
            <a
              key={item.label}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={item.active ? "page" : undefined}
              className={className}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </a>
          ) : (
            <button
              key={item.label}
              type="button"
              title={item.label}
              aria-label={item.label}
              className={className}
              onClick={item.action}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className={styles.railFooter}>
        {onSignOut && (
          <ProfileMenu
            user={user}
            onSignOut={onSignOut}
            isSigningOut={isSigningOut}
            signOutError={signOutError}
            placement="rail"
          />
        )}
        <button
          type="button"
          className={styles.themeButton}
          title={themeAction}
          onClick={onToggleTheme}
        >
          <span className="sr-only">{themeAction}</span>
        </button>
      </div>
    </aside>
  );
}

export function Sidebar({
  onTransactions,
  onReport,
  ...controls
}: RailControls & {
  onTransactions: () => void;
  onReport: () => void;
}) {
  return (
    <WorkspaceRail
      {...controls}
      brandHref="#overview"
      brandLabel="Personal Finance dashboard"
      navigationLabel="Dashboard navigation"
      items={[
        { label: "Dashboard", icon: "grid", href: "#overview", active: true },
        { label: "Market", icon: "chart", href: "/market" },
        { label: "Transactions", icon: "card", action: onTransactions },
        { label: "Analytics", icon: "pie", href: "#spending-analysis" },
        { label: "Insights", icon: "bulb", href: "#insights" },
        { label: "Planning", icon: "wallet", href: "#planning" },
        { label: "Reports", icon: "file", action: onReport },
      ]}
    />
  );
}
