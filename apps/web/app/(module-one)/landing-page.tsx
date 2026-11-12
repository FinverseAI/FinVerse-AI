import Link from "next/link";
import { landingPreview, money } from "./dashboard/data";

const features = [
  {
    number: "01",
    title: "Track with clarity",
    description:
      "Keep income, expenses, categories, and recurring bills together in one simple view.",
  },
  {
    number: "02",
    title: "Plan with purpose",
    description:
      "Create practical budgets and savings goals, then follow progress month by month.",
  },
  {
    number: "03",
    title: "Understand the story",
    description:
      "Turn day-to-day transactions into useful trends, comparisons, and financial insights.",
  },
];

const steps = [
  ["Add", "Record income and expenses in a few clear fields."],
  ["Review", "See cash flow, spending categories, and upcoming bills."],
  ["Improve", "Use budgets and insights to make the next month better."],
];

export default function LandingPage() {
  return (
    <main className="landing-page min-h-screen bg-dash-bg text-dash-text selection:bg-dash-accent selection:text-dash-bg">
      <header className="landing-header mx-auto flex min-h-19 w-[calc(100%_-_3rem)] max-w-[1280px] items-center justify-between max-md:w-[calc(100%_-_2rem)]">
        <a
          className="inline-flex items-center gap-2.5 font-[650] tracking-[-0.02em]"
          href="#top"
          aria-label="FinVerse home"
        >
          <span className="glass-brand grid size-9 place-items-center font-semibold">
            F
          </span>
          <span>FinVerse</span>
        </a>

        <nav
          className="glass-nav flex gap-8 text-xs text-dash-muted max-md:hidden"
          aria-label="Main navigation"
        >
          <a
            className="transition-colors hover:text-dash-text"
            href="#features"
          >
            Features
          </a>
          <a
            className="transition-colors hover:text-dash-text"
            href="#how-it-works"
          >
            How it works
          </a>
          <a className="transition-colors hover:text-dash-text" href="#roadmap">
            Roadmap
          </a>
        </nav>

        <Link className="dash-small-button px-5" href="/auth/login">
          Log in →
        </Link>
      </header>

      <section
        className="landing-hero mx-auto grid w-[calc(100%_-_3rem)] max-w-[1280px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-10 max-[1000px]:grid-cols-1 max-md:w-[calc(100%_-_2rem)] max-md:gap-10"
        id="top"
      >
        <div className="max-w-[760px]">
          <p className="flex items-center gap-2.5 text-[10px] tracking-[0.18em] text-dash-text uppercase">
            <span className="h-px w-5.5 bg-current" /> Personal finance, made
            clear
          </p>
          <h1 className="mt-7 max-w-[650px] text-[clamp(46px,5.3vw,76px)] max-md:text-[clamp(42px,11vw,64px)]">
            A little clarity.{" "}
            <em className="block text-dash-accent not-italic">
              A lot more possibility.
            </em>
          </h1>
          <p className="hero-description mt-7 text-[15px] leading-7">
            Bring your income, spending, and savings into focus. A calmer space
            to understand your money and plan for what matters to you.
          </p>
          <div className="mt-8.5 flex items-center gap-3 max-md:flex-col max-md:items-stretch">
            <Link
              className="dash-primary min-h-12 gap-5 px-6 text-sm"
              href="/auth/sign-up"
            >
              Find your balance{" "}
              <svg
                aria-hidden="true"
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 18 18 6M6 6h12v12" />
              </svg>
            </Link>
            <a
              className="dash-small-button min-h-12 px-5 text-sm"
              href="#features"
            >
              Explore features
            </a>
          </div>
          <p className="mt-4.5 text-xs text-dash-muted">
            Your finances. A little more in focus.
          </p>
        </div>

        <div
          className="preview-window relative p-3.5 min-[1001px]:[transform:perspective(1200px)_rotateY(-3deg)_rotateX(2deg)] max-[1000px]:w-full max-[1000px]:max-w-[720px] max-md:p-2.5"
          aria-label="FinVerse dashboard preview"
        >
          <div className="flex h-12 items-center justify-between px-2 text-xs text-dash-text">
            <div className="flex items-center gap-2">
              <span className="glass-brand grid size-7 place-items-center text-[11px]">
                F
              </span>
              <span>Overview</span>
            </div>
            <span className="rounded-lg border border-dash-border px-2.5 py-1.5 text-dash-muted">
              November 2026
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 max-md:grid-cols-1">
            <article className="flex min-h-28 flex-col rounded-xl border border-dash-border bg-dash-surface p-4 max-md:min-h-23">
              <span className="text-[10px] text-dash-muted">
                Monthly income
              </span>
              <strong className="my-3 text-xl font-[570] tracking-[-0.03em]">
                {money(landingPreview.income)}
              </strong>
              <small className="text-[9px] text-dash-accent">
                +8.4% this month
              </small>
            </article>
            <article className="flex min-h-28 flex-col rounded-xl border border-dash-border bg-dash-surface p-4 max-md:min-h-23">
              <span className="text-[10px] text-dash-muted">
                Monthly expenses
              </span>
              <strong className="my-3 text-xl font-[570] tracking-[-0.03em]">
                {money(landingPreview.expenses)}
              </strong>
              <small className="text-[9px] text-dash-red">46% of income</small>
            </article>
            <article className="flex min-h-28 flex-col rounded-xl border border-dash-border bg-dash-surface p-4 max-md:min-h-23">
              <span className="text-[10px] text-dash-muted">
                Saved this month
              </span>
              <strong className="my-3 text-xl font-[570] tracking-[-0.03em]">
                {money(landingPreview.savings)}
              </strong>
              <small className="text-[9px] text-dash-accent">On track</small>
            </article>
          </div>

          <div className="mt-2 grid grid-cols-[1.1fr_0.9fr] gap-2 max-md:grid-cols-1">
            <div className="min-h-57.5 rounded-xl border border-dash-border bg-dash-surface p-4">
              <div className="flex items-center justify-between text-[11px] text-dash-text">
                <span>Cash flow</span>
                <small className="text-[10px] text-dash-muted">
                  Last 6 months
                </small>
              </div>
              <div className="mt-5 flex h-33 items-end justify-between gap-2.5 border-b border-dash-border landing-chart-grid px-2">
                <span className="h-[38%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[54%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[46%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[70%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[61%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
                <span className="h-[86%] w-[13%] rounded-t-md bg-linear-to-t from-dash-accent/20 to-dash-accent" />
              </div>
              <div className="mt-2 flex justify-between text-[8px] text-dash-muted">
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
              </div>
            </div>

            <div className="min-h-57.5 rounded-xl border border-dash-border bg-dash-surface p-4">
              <div className="flex items-center justify-between text-[11px] text-dash-text">
                <span>Budget status</span>
                <small className="text-[10px] text-dash-muted">November</small>
              </div>
              {landingPreview.budgets.map(({ name, spent, limit, color }) => (
                <div className="mt-5.5" key={name}>
                  <div className="mb-2 flex justify-between text-[9px] text-dash-text">
                    <span>{name}</span>
                    <small className="text-dash-muted">
                      {money(spent)} / {money(limit)}
                    </small>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-dash-track">
                    <span
                      className={`block h-full rounded-full ${color}`}
                      style={{ width: (spent / limit) * 100 + "%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="landing-features border-t border-dash-border px-[max(1.5rem,calc((100%_-_1180px)/2))] py-26 max-md:py-20"
        id="features"
      >
        <div className="max-w-[650px]">
          <p className="flex items-center gap-2.5 font-mono text-xs tracking-[0.08em] text-dash-accent uppercase">
            <span className="h-px w-5.5 bg-current" /> One place for the
            essentials
          </p>
          <h2 className="mt-4 text-[clamp(34px,4vw,52px)] leading-[1.08] font-[580] tracking-[-0.045em]">
            A calmer way to manage everyday money.
          </h2>
          <p className="mt-4.5 leading-7 text-dash-muted">
            Start with reliable records and useful summaries. Add intelligence
            only where it genuinely helps.
          </p>
        </div>
        <div className="mt-15 grid grid-cols-3 gap-3.5 max-md:mt-10.5 max-md:grid-cols-1">
          {features.map((feature) => (
            <article
              className="feature-card flex min-h-62.5 flex-col justify-end border p-7 max-md:min-h-55"
              key={feature.number}
            >
              <span className="mb-auto font-mono text-[11px] text-dash-accent">
                {feature.number}
              </span>
              <h3 className="mt-14 text-[21px] font-[570]">{feature.title}</h3>
              <p className="mt-3.5 text-sm leading-6.5 text-dash-muted">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mx-auto grid w-[calc(100%_-_3rem)] max-w-[1180px] grid-cols-[0.8fr_1.2fr] gap-22.5 py-27.5 max-[1000px]:grid-cols-1 max-[1000px]:gap-12.5 max-md:w-[calc(100%_-_2rem)] max-md:py-21.5"
        id="how-it-works"
      >
        <div className="max-w-[450px]">
          <p className="flex items-center gap-2.5 font-mono text-xs tracking-[0.08em] text-dash-accent uppercase">
            <span className="h-px w-5.5 bg-current" /> A simple routine
          </p>
          <h2 className="mt-4 text-[clamp(34px,4vw,52px)] leading-[1.08] font-[580] tracking-[-0.045em]">
            From transaction to useful context.
          </h2>
        </div>
        <div className="border-t border-dash-border">
          {steps.map(([title, description], index) => (
            <article
              className="grid grid-cols-[54px_1fr] border-b border-dash-border py-6.5"
              key={title}
            >
              <span className="font-mono text-[11px] text-dash-accent">
                0{index + 1}
              </span>
              <div>
                <h3 className="text-lg font-[560]">{title}</h3>
                <p className="mt-2 text-sm leading-6.5 text-dash-muted">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="roadmap-panel mx-auto mb-6 w-[calc(100%_-_3rem)] max-w-[1180px] border border-dash-border p-13.5 max-md:w-[calc(100%_-_2rem)] max-md:p-8 max-md:px-6"
        id="roadmap"
      >
        <p className="flex items-center gap-2.5 font-mono text-xs tracking-[0.08em] text-dash-accent uppercase">
          <span className="h-px w-5.5 bg-current" /> Building in focused stages
        </p>
        <h2 className="mt-4 max-w-[650px] text-[clamp(30px,3.6vw,46px)] leading-[1.08] font-[580] tracking-[-0.045em]">
          The foundation first. Smarter features next.
        </h2>
        <div className="mt-10.5 grid grid-cols-3 gap-2 max-md:grid-cols-1">
          <span className="rounded-[10px] border border-dash-accent/35 bg-dash-accent/8 p-4 text-[13px] text-dash-accent">
            <b className="mr-2.5 font-mono text-[10px] text-dash-accent">01</b>{" "}
            Landing page
          </span>
          <span className="rounded-[10px] border border-dash-border p-4 text-[13px] text-dash-muted">
            <b className="mr-2.5 font-mono text-[10px] text-dash-muted">02</b>{" "}
            Personal dashboard
          </span>
          <span className="rounded-[10px] border border-dash-border p-4 text-[13px] text-dash-muted">
            <b className="mr-2.5 font-mono text-[10px] text-dash-muted">03</b>{" "}
            Smart finance tools
          </span>
        </div>
      </section>

      <footer className="mx-auto flex min-h-27.5 w-[calc(100%_-_3rem)] max-w-[1180px] items-center justify-between text-xs text-dash-muted max-md:w-[calc(100%_-_2rem)] max-md:flex-col max-md:items-start max-md:gap-4.5 max-md:py-7">
        <a
          className="inline-flex items-center gap-2.5 font-[650] tracking-[-0.02em] text-dash-text"
          href="#top"
        >
          <span className="glass-brand grid size-9 place-items-center">F</span>
          <span>FinVerse</span>
        </a>
        <p>Built as a final-year B.Tech CSE (AI/ML) major project.</p>
        <span>Module 1 · Personal Finance</span>
      </footer>
    </main>
  );
}
