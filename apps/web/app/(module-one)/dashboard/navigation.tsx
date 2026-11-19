"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { AuthUser } from "../../../auth/types";
import { Icon, type IconName } from "./ui";

type HeaderProps = {
  month: string;
  onMonth: (month: string) => void;
  query: string;
  onQuery: (query: string) => void;
  onSearch: () => void;
  onAdd: () => void;
  onNotifications: () => void;
  onReport: () => void;
  onTransactions: () => void;
  user?: AuthUser;
  onSignOut: () => void;
  isSigningOut: boolean;
  signOutError: string;
};

export function ProfileMenu({
  user,
  onSignOut,
  isSigningOut,
  signOutError,
}: Pick<HeaderProps, "user" | "onSignOut" | "isSigningOut" | "signOutError">) {
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
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
        {user?.image ? (
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
        <div className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-dash-border bg-dash-surface p-1.5 shadow-xl shadow-black/30">
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
  onReport,
  onTransactions,
  user,
  onSignOut,
  isSigningOut,
  signOutError,
}: HeaderProps) {
  return (
    <header className="dashboard-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-dash-border px-7 py-3 max-sm:px-4">
      <div className="flex items-center gap-6">
        <h1 className="whitespace-nowrap text-sm font-semibold">FinVerse</h1>
        <nav
          aria-label="Dashboard navigation"
          className="hidden items-center gap-1 text-xs text-dash-muted xl:flex"
        >
          <a
            href="#overview"
            aria-current="page"
            className="rounded-full bg-dash-accent/15 px-3 py-2 text-dash-accent"
          >
            Dashboard
          </a>
          <a className="dash-nav" href="/market">
            Market
          </a>
          <button className="dash-nav" onClick={onTransactions}>
            Transactions
          </button>
          <a className="dash-nav" href="#balance">
            Analytics
          </a>
          <a className="dash-nav" href="#expenses">
            Insights
          </a>
          <button className="dash-nav" onClick={onReport}>
            Reports
          </button>
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
        <label className="relative">
          <span className="sr-only">Cash flow month</span>
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
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
          className="surface-inset hidden h-10 w-44 items-center gap-2 border border-dash-border px-3 md:flex"
        >
          <Icon name="search" className="size-4 shrink-0 text-dash-muted" />
          <input
            aria-label="Search transactions"
            placeholder="Search transactions…"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            className="min-w-0 w-full bg-transparent text-xs outline-none placeholder:text-dash-muted"
          />
        </form>
        <button
          className="dash-icon-button md:hidden"
          aria-label="Search transactions"
          onClick={onTransactions}
        >
          <Icon name="search" />
        </button>
        <button
          className="dash-icon-button relative"
          aria-label="Notifications"
          onClick={onNotifications}
        >
          <Icon name="bell" />
        </button>
        <ProfileMenu
          user={user}
          onSignOut={onSignOut}
          isSigningOut={isSigningOut}
          signOutError={signOutError}
        />
        <button
          className="dash-primary h-8 gap-1.5 px-3 max-sm:ml-auto"
          onClick={onAdd}
        >
          <Icon name="plus" className="size-3.5" />
          Add Transaction
        </button>
      </div>
    </header>
  );
}

const items: {
  label: string;
  icon: IconName;
  target?: string;
  href?: string;
}[] = [
  { label: "Dashboard", icon: "grid", target: "overview" },
  { label: "Market", icon: "pie", href: "/market" },
  { label: "Transactions", icon: "card" },
  { label: "Analytics", icon: "chart", target: "balance" },
  { label: "Insights", icon: "bulb", target: "expenses" },
  { label: "Planning", icon: "wallet", target: "planning" },
  { label: "Reports", icon: "file" },
];
export function Sidebar({
  onTransactions,
  onReport,
}: {
  onTransactions: () => void;
  onReport: () => void;
}) {
  return (
    <aside className="dashboard-sidebar fixed z-30 hidden flex-col items-center py-4 sm:flex">
      <a
        href="#overview"
        aria-label="Personal Finance dashboard"
        className="brand-mark grid size-10 place-items-center text-lg font-semibold"
      >
        F
      </a>
      <nav aria-label="Sidebar" className="mt-6 flex flex-col gap-1">
        {items.map((item, index) => {
          const className = `grid size-9 place-items-center rounded-panel transition-colors ${index === 0 ? "bg-dash-accent/15 text-dash-accent" : "text-dash-muted hover:bg-dash-raised hover:text-dash-text"}`;
          return item.href ? (
            <a
              key={item.label}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={className}
            >
              <Icon name={item.icon} />
            </a>
          ) : item.target ? (
            <a
              key={item.label}
              href={`#${item.target}`}
              title={item.label}
              aria-label={item.label}
              className={className}
            >
              <Icon name={item.icon} />
            </a>
          ) : (
            <button
              key={item.label}
              type="button"
              title={item.label}
              aria-label={item.label}
              className={className}
              onClick={
                item.label === "Transactions" ? onTransactions : onReport
              }
            >
              <Icon name={item.icon} />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
