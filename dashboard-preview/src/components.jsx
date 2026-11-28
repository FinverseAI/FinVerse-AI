import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  CreditCard,
  Moon,
  Sun,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { euros, months } from "./data.js";

export function MonthTabs({ activeMonth, onMonth }) {
  return (
    <div className="month-tabs" role="group" aria-label="Select a month">
      {months.map((month, index) => (
        <button
          className="month-tab"
          key={month}
          type="button"
          aria-pressed={activeMonth === index}
          onClick={() => onMonth(index)}
        >
          {month}
        </button>
      ))}
    </div>
  );
}

export function Header({ activeMonth, onMonth }) {
  return (
    <header className="tracker-header">
      <h1 className="eyebrow">Personal Finance Tracker</h1>
      <MonthTabs activeMonth={activeMonth} onMonth={onMonth} />
    </header>
  );
}

const sections = [
  { label: "Overview", href: "#overview", icon: Activity },
  {
    label: "Balance development",
    href: "#balance-development",
    icon: TrendingUp,
  },
  {
    label: "Expense breakdown",
    href: "#expense-breakdown",
    icon: ArrowLeftRight,
  },
  { label: "Dashboard", href: "#overview", icon: Wallet },
];

export function Sidebar({ extraContrast, onToggleTheme }) {
  const [active, setActive] = useState("Dashboard");
  return (
    <aside className="sidebar">
      <div className="flex items-center gap-[4px]" aria-hidden="true">
        <span className="size-[6px] rounded-full bg-teal/70" />
        <span className="size-[6px] rounded-full bg-text/70" />
        <span className="size-[6px] rounded-full bg-amber/80" />
      </div>
      <nav className="sidebar-navigation" aria-label="Dashboard sections">
        {sections.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            aria-label={label}
            aria-current={active === label ? "location" : undefined}
            onClick={() => setActive(label)}
          >
            <span className="sidebar-icon">
              <Icon size={17} strokeWidth={1.65} />
            </span>
            {label === "Dashboard" && (
              <span className="sidebar-label">Dashboard</span>
            )}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="avatar" aria-label="Account avatar" role="img">
          AL
        </span>
        <button
          type="button"
          className="theme-toggle"
          aria-label="Toggle deeper contrast"
          aria-pressed={extraContrast}
          onClick={onToggleTheme}
        >
          <Sun size={11} />
          <span className="theme-dot" />
          <Moon size={10} />
        </button>
      </div>
    </aside>
  );
}

export function BalanceCard({ balance, change }) {
  const [showDigits, setShowDigits] = useState(true);
  const positive = change >= 0;
  return (
    <section className="balance-card lift" aria-labelledby="balance-card-title">
      <div className="balance-card-top">
        <CreditCard size={15} strokeWidth={1.55} aria-hidden="true" />
        <span className="visa" aria-label="Visa">
          VISA
        </span>
      </div>
      <div>
        <h2 className="eyebrow" id="balance-card-title">
          Available Balance
        </h2>
        <p className="card-amount">{euros(balance).replace("€", "€ ")}</p>
        <p className={`card-change ${positive ? "text-green" : "text-coral"}`}>
          <ArrowUpRight
            size={10}
            aria-hidden="true"
            className={positive ? "" : "rotate-90"}
          />
          <span>
            {positive ? "+" : "−"}
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-muted">vs last month</span>
        </p>
      </div>
      <div className="balance-card-bottom">
        <div>
          <span className="card-pan">
            {showDigits ? "•••• 4789" : "•••• ••••"}
          </span>
          <span className="card-chip" aria-hidden="true" />
        </div>
        <div className="card-type">
          <span>Debit Card</span>
          <button
            type="button"
            className="card-switch switch"
            role="switch"
            aria-label="Show last four card digits"
            aria-checked={showDigits}
            onClick={() => setShowDigits((current) => !current)}
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  );
}

export function KpiCard({ name, tone, actual, target, limitLabel = "Target" }) {
  const percent = (actual / target) * 100;
  return (
    <section
      className="kpi-card glass-panel lift"
      data-tone={tone}
      aria-label={name}
    >
      <h2 className="eyebrow">{name}</h2>
      <dl className="kpi-figures">
        <div>
          <dt>Actual</dt>
          <dd>{euros(actual)}</dd>
        </div>
        <div>
          <dt>{limitLabel}</dt>
          <dd>{euros(target)}</dd>
        </div>
      </dl>
      <p className="kpi-value">{percent.toFixed(1)}%</p>
      <div
        className="kpi-track"
        role="meter"
        aria-label={`${name} as a percentage of the monthly limit`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percent)}
        style={{ "--progress": `${Math.min(100, percent)}%` }}
      >
        <span className="kpi-fill" />
        <span className="kpi-thumb" />
      </div>
    </section>
  );
}

export function StatPill({ value, label }) {
  return (
    <div className="stat-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function SavingProgress({ goals }) {
  return (
    <section
      className="saving-panel glass-panel lift"
      aria-labelledby="saving-title"
    >
      <h2 className="eyebrow" id="saving-title">
        Saving Progress
      </h2>
      <div className="goal-grid">
        {goals.map(({ name, percent }) => (
          <div className="goal-row" key={name}>
            <span className="goal-label">{name}</span>
            <div
              className="goal-track"
              style={{ "--progress": `${percent}%` }}
              role="progressbar"
              aria-label={name}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span />
            </div>
          </div>
        ))}
        <div className="goal-axis" aria-hidden="true">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </section>
  );
}
