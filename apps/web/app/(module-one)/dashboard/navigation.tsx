"use client";

import { useState } from "react";
import type { AuthUser } from "../../../auth/types";
import { Icon, type IconName } from "./ui";

import { months } from "./data";

type HeaderProps = {
  month: number;
  onMonth: (month: number) => void;
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

function ProfileMenu({
  user,
  onSignOut,
  isSigningOut,
  signOutError,
}: Pick<HeaderProps, "user" | "onSignOut" | "isSigningOut" | "signOutError">) {
  const [isOpen, setIsOpen] = useState(false);
  const name = user?.name || user?.email || "Profile";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open profile menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="grid size-8 place-items-center overflow-hidden rounded-full border border-dash-border bg-dash-raised text-[10px] font-semibold text-dash-text transition-colors hover:border-dash-accent/60"
      >
        {user?.image ? (
          <img src={user.image} alt="" className="size-full object-cover" />
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
              <p className="mt-1 truncate text-[10px] text-dash-muted">
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
            <p className="px-3 pb-1 pt-1 text-[10px] text-dash-red">
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
        <h1 className="whitespace-nowrap text-[13px] font-semibold">
          FinVerse
        </h1>
        <nav
          aria-label="Dashboard navigation"
          className="hidden items-center gap-1 text-[11px] text-dash-muted min-[1200px]:flex"
        >
          <a
            href="#overview"
            aria-current="page"
            className="rounded-full bg-dash-accent/15 px-3 py-2 text-dash-accent"
          >
            Dashboard
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
          <span className="sr-only">Chart month</span>
          <select
            value={month}
            onChange={(event) => onMonth(Number(event.target.value))}
            className="dash-input h-8 appearance-none py-0 pr-7 font-mono text-[10px] text-dash-muted"
          >
            {months.map((name, index) => (
              <option key={name} value={index}>
                {name.slice(0, 3)} {new Date().getFullYear()}
              </option>
            ))}
          </select>
          <Icon
            name="down"
            className="pointer-events-none absolute right-2 top-2.5 size-3 text-dash-muted"
          />
        </label>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
          className="clay-inset hidden h-10 w-44 items-center gap-2 border border-dash-border px-3 md:flex"
        >
          <Icon name="search" className="size-4 shrink-0 text-dash-muted" />
          <input
            aria-label="Search transactions"
            placeholder="Search transactions…"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            className="min-w-0 w-full bg-transparent text-[11px] outline-none placeholder:text-dash-muted"
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
          <span className="absolute right-1.5 top-1 size-1.5 rounded-full bg-dash-accent" />
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

const items: { label: string; icon: IconName; target?: string }[] = [
  { label: "Dashboard", icon: "grid", target: "overview" },
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
        className="glass-brand grid size-10 place-items-center text-lg font-semibold"
      >
        F
      </a>
      <nav aria-label="Sidebar" className="mt-6 flex flex-col gap-1">
        {items.map((item, index) => {
          const className = `grid size-9 place-items-center rounded-[10px] transition-colors ${index === 0 ? "bg-dash-accent/15 text-dash-accent" : "text-dash-muted hover:bg-dash-raised hover:text-dash-text"}`;
          return item.target ? (
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
      <div className="mt-auto flex flex-col items-center gap-5 text-dash-muted">
        <span title="Settings — dashboard preview" aria-label="Settings">
          <Icon name="settings" />
        </span>
        <span
          title="Personal account"
          className="grid size-9 place-items-center rounded-full border border-dash-border"
        >
          <Icon name="user" className="size-8" />
        </span>
      </div>
    </aside>
  );
}
