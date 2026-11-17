import type { CSSProperties } from "react";
import Link from "next/link";
import { money } from "./dashboard/data";
import { Icon } from "./dashboard/ui";
import LandingMotion from "./landing-motion";

const steps = [
  [
    "Start with your income",
    "Add your monthly income and payday. Give each spending category a share, and choose a savings goal.",
  ],
  [
    "Keep a simple record",
    "Log your income and expenses. Add the bills coming up, so your day-to-day commitments stay in view.",
  ],
  [
    "Make room for next month",
    "See which categories use the most money. Compare your spending with your plan, then adjust what needs to change.",
  ],
];
const features = [
  {
    icon: "target" as const,
    title: "A budget with purpose",
    description:
      "Give rent, groceries, travel, and savings their own share of your income. See how much remains in each spending category.",
  },
  {
    icon: "chart" as const,
    title: "Spending you can follow",
    description:
      "Turn your entries into weekly and monthly summaries. Find your biggest spending categories and compare them with the previous period.",
  },
  {
    icon: "calendar" as const,
    title: "Bills you can plan for",
    description:
      "Keep amounts and due dates together. See what is overdue, what is coming up, and which bills already have auto-pay arranged.",
  },
];

function PlanPreview() {
  const allocations = [
    { label: "Rent", amount: 21000, share: 35 },
    { label: "Food & groceries", amount: 15000, share: 25 },
    { label: "Bills & transport", amount: 12000, share: 20 },
    { label: "Savings target", amount: 12000, share: 20 },
  ];
  return (
    <figure
      className="preview-window hero-preview fv-reveal"
      style={{ "--fv-delay": "200ms" } as CSSProperties}
      aria-label="Illustrative monthly budget in rupees"
    >
      <div className="flex items-center justify-between gap-4 border-b border-dash-border/40 pb-5">
        <span className="flex items-center gap-3 text-sm font-medium">
          <Icon name="wallet" className="size-5 text-dash-accent" /> Your
          monthly plan
        </span>
        <span className="dash-badge text-dash-muted">Example plan</span>
      </div>
      <p className="mt-6 text-sm text-dash-muted">Monthly income</p>
      <p className="mt-2 text-3xl font-medium tracking-tight">{money(60000)}</p>
      <dl className="mt-5 space-y-3">
        {allocations.map(({ label, amount, share }) => (
          <div key={label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <dt>{label}</dt>
              <dd className="font-mono">
                {money(amount)}{" "}
                <span className="text-xs text-dash-muted">/ {share}%</span>
              </dd>
            </div>
            <div
              className="progress-track overflow-hidden rounded-full"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-dash-accent"
                style={{ width: `${share}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
      <figcaption className="mt-5 border-t border-dash-border/40 pt-4 text-xs leading-5 text-dash-muted">
        A sample ?60,000 month. Every category has a share.
      </figcaption>
    </figure>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen">
      <LandingMotion />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <main id="main-content">
        <div className="landing-showcase">
          <header className="landing-header flex min-h-20 items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 font-semibold"
              aria-label="FinVerse home"
            >
              <span
                className="brand-mark grid size-10 place-items-center"
                aria-hidden="true"
              >
                F
              </span>
              FinVerse
            </Link>
            <nav
              aria-label="Main navigation"
              className="landing-nav hidden gap-6 text-sm text-dash-muted md:flex"
            >
              <a href="#how-it-works" className="hover:text-dash-text">
                How it works
              </a>
              <a href="#features" className="hover:text-dash-text">
                Features
              </a>
              <a href="#your-data" className="hover:text-dash-text">
                What to expect
              </a>
            </nav>
            <Link href="/auth/login" className="dash-small-button">
              Log in
            </Link>
          </header>
          <section className="landing-hero" aria-labelledby="hero-heading">
            <div className="hero-copy">
              <p className="dash-eyebrow text-dash-accent fv-reveal">
                Your monthly budget, in rupees
              </p>
              <h1 id="hero-heading" className="mt-6 text-display">
                <span className="fv-mask">
                  <span>Your money.</span>
                </span>
                <span className="fv-mask">
                  <span style={{ "--fv-delay": "90ms" } as CSSProperties}>
                    <em className="not-italic">Made clear.</em>
                  </span>
                </span>
              </h1>
              <p
                className="hero-description fv-reveal mt-5 text-sm leading-6"
                style={{ "--fv-delay": "180ms" } as CSSProperties}
              >
                Plan your month. Track everyday spending. Keep bills and savings
                goals in view, all in one place.
              </p>
              <Link
                href="/auth/sign-up"
                className="dash-primary fv-reveal mt-6 gap-3 text-sm"
                style={{ "--fv-delay": "270ms" } as CSSProperties}
              >
                Start your plan
                <Icon name="right" />
              </Link>
              <p
                className="hero-footnote fv-reveal mt-4 text-xs leading-6 text-dash-muted"
                style={{ "--fv-delay": "320ms" } as CSSProperties}
              >
                Sign in with Google. No bank connection needed.
              </p>
            </div>
            <PlanPreview />
          </section>
          <div className="hero-benefits" aria-label="FinVerse at a glance">
            {[
              {
                icon: "wallet" as const,
                label: "One overview",
                detail: "Income and spending",
              },
              {
                icon: "target" as const,
                label: "Category budgets",
                detail: "A limit for each priority",
              },
              {
                icon: "calendar" as const,
                label: "Upcoming bills",
                detail: "Amounts and due dates",
              },
              {
                icon: "chart" as const,
                label: "Spending summaries",
                detail: "Weekly and monthly",
              },
              {
                icon: "pig" as const,
                label: "Savings goals",
                detail: "Targets and deadlines",
              },
            ].map(({ icon, label, detail }, index) => (
              <div
                key={icon}
                className="fv-reveal"
                style={{ "--fv-delay": `${index * 60}ms` } as CSSProperties}
              >
                <Icon name={icon} className="size-4" />
                <p>
                  {label}
                  <br />
                  <span>{detail}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
        <section
          className="page-container section-space border-t border-dash-border/40"
          aria-labelledby="problem-heading"
        >
          <div className="grid gap-6 md:grid-cols-2 md:gap-16">
            <h2
              id="problem-heading"
              className="text-title fv-reveal font-medium leading-tight tracking-tight"
            >
              Know what is left.
              <br />
              Decide what comes next.
            </h2>
            <div
              className="fv-reveal space-y-4 text-base leading-7 text-dash-muted"
              style={{ "--fv-delay": "90ms" } as CSSProperties}
            >
              <p>
                A balance alone cannot tell you what is already spoken for.
                Rent, groceries, bills, and savings all need a place in your
                month.
              </p>
              <p>
                FinVerse puts your plan beside your recorded spending. See where
                your money goes and how much room remains for your priorities.
              </p>
            </div>
          </div>
        </section>
        <section
          id="how-it-works"
          className="page-container section-space grid gap-10 border-t border-dash-border/40 lg:grid-cols-2 lg:gap-16"
          aria-labelledby="steps-heading"
        >
          <div className="fv-reveal">
            <p className="dash-eyebrow text-dash-accent">How it works</p>
            <h2
              id="steps-heading"
              className="mt-4 text-title font-medium tracking-tight"
            >
              Set it up.
              <br />
              Keep it in view.
            </h2>
          </div>
          <ol className="divide-y divide-dash-border/40">
            {steps.map(([title, description], index) => (
              <li
                key={title}
                className="fv-reveal flex gap-5 py-6 first:pt-0"
                style={{ "--fv-delay": `${index * 60}ms` } as CSSProperties}
              >
                <span className="pt-1 font-mono text-sm text-dash-accent">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-medium">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-dash-muted">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section
          id="features"
          className="page-container section-space border-t border-dash-border/40"
          aria-labelledby="features-heading"
        >
          <p className="dash-eyebrow text-dash-accent fv-reveal">
            Built around your month
          </p>
          <h2
            id="features-heading"
            className="text-title fv-reveal mt-4 font-medium tracking-tight"
          >
            Less guesswork. More perspective.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {features.map(({ icon, title, description }, index) => (
              <article
                key={title}
                className="feature-card fv-reveal p-6"
                style={{ "--fv-delay": `${index * 60}ms` } as CSSProperties}
              >
                <Icon name={icon} className="size-6 text-dash-accent" />
                <h3 className="mt-8 text-xl font-medium">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-dash-muted">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="your-data"
          className="page-container section-space grid gap-8 border-t border-dash-border/40 md:grid-cols-2 md:gap-16"
          aria-labelledby="data-heading"
        >
          <div className="fv-reveal">
            <p className="dash-eyebrow text-dash-accent">What to expect</p>
            <h2
              id="data-heading"
              className="mt-4 text-title font-medium tracking-tight"
            >
              A plan you shape.
              <br />A record you control.
            </h2>
          </div>
          <div
            className="fv-reveal space-y-5 text-sm leading-7 text-dash-muted"
            style={{ "--fv-delay": "90ms" } as CSSProperties}
          >
            <p>
              Add your own records and return to them whenever you need. Your
              budgets, transactions, bills, and goals are saved to your account.
            </p>
            <p>
              Spending summaries reflect what you enter. Month-end projections
              are estimates, so you can use them as a guide when reviewing your
              plan.
            </p>
            <p className="border-l-2 border-dash-accent pl-4">
              You stay in charge of payments. Bills track due dates; savings
              goals keep a target and deadline in view.
            </p>
          </div>
        </section>
        <section
          className="page-container section-space border-t border-dash-border/40 text-center"
          aria-labelledby="cta-heading"
        >
          <h2
            id="cta-heading"
            className="text-title fv-reveal font-medium tracking-tight"
          >
            Make next month easier to see.
          </h2>
          <p
            className="fv-reveal mt-4 text-base text-dash-muted"
            style={{ "--fv-delay": "90ms" } as CSSProperties}
          >
            Your income, your priorities, and one clear place to start.
          </p>
          <Link
            href="/auth/sign-up"
            className="dash-primary fv-reveal mt-8 gap-3 text-sm"
            style={{ "--fv-delay": "180ms" } as CSSProperties}
          >
            Start your plan
            <Icon name="right" />
          </Link>
        </section>
      </main>
      <footer className="page-container flex flex-wrap justify-between gap-4 border-t border-dash-border/40 py-8 text-xs text-dash-muted">
        <span>FinVerse</span>
        <span>Personal budgeting in INR</span>
        <a href="#main-content" className="hover:text-dash-text">
          Back to top
        </a>
      </footer>
    </div>
  );
}
