import Link from "next/link";
import { Icon } from "./dashboard/ui";
import LandingMotion from "./landing-motion";
import LandingPreview from "./landing-preview";
import styles from "./landing.module.css";

const workspaces = [
  {
    id: "money",
    label: "Money",
    icon: "wallet",
    title: "Give every rupee a job.",
    description:
      "Set a monthly plan and compare it with what you actually spend. See what’s left after expenses and what’s going toward your goals.",
    tools: [
      "Category budgets and transaction history",
      "Bill reminders and upcoming due dates",
      "Savings targets and contribution tracking",
    ],
    href: "/dashboard",
    action: "Open the dashboard",
  },
  {
    id: "markets",
    label: "Markets",
    icon: "chart",
    title: "Look closer at the market.",
    description:
      "Research Indian stocks alongside your personal finances. Follow prices and company filings, then see how your holdings fit together.",
    tools: [
      "Price charts with SMA, EMA, RSI and MACD",
      "Watchlists, price alerts and a stock screener",
      "Portfolio returns, concentration and allocation",
    ],
    href: "/market",
    action: "Open the market workspace",
  },
  {
    id: "ai",
    label: "FinVerse AI",
    icon: "bulb",
    title: "Ask why. See the numbers.",
    description:
      "Ask what drove a change in your spending, what a stock’s news says, or which factors affect your investment readiness. See the figures and sources behind the explanation.",
    tools: [
      "Questions about your budget and recorded activity",
      "Stock and news explanations with supporting evidence",
      "Investment readiness based on cash flow and portfolio risk",
    ],
    href: "/dashboard#insights",
    action: "Open FinVerse AI",
  },
] as const;

export default function LandingPage() {
  return (
    <div className={`landing-page min-h-screen ${styles.home}`}>
      <LandingMotion />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" aria-label="FinVerse home" className={styles.wordmark}>
            <span className="brand-mark" aria-hidden="true">
              F
            </span>
            FinVerse
          </Link>
          <nav aria-label="Main navigation" className={styles.navigation}>
            {workspaces.map(({ id, label }) => (
              <a key={id} href={`#${id}`}>
                {label}
              </a>
            ))}
          </nav>
          <Link href="/auth/login" className={styles.login}>
            Log in <Icon name="right" />
          </Link>
        </div>
      </header>
      <main id="main-content" className={styles.container}>
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroCopy}>
            <h1 id="hero-heading">
              Your money.
              <span>Made clear.</span>
            </h1>
            <p>
              Budget in rupees, research Indian stocks, and ask FinVerse AI
              what’s behind the numbers.
            </p>
            <div className={styles.heroActions}>
              <Link href="/auth/sign-up" className="dash-primary">
                Get started <Icon name="right" />
              </Link>
              <a href="#workspaces" className={styles.textLink}>
                Explore FinVerse
              </a>
            </div>
          </div>
          <LandingPreview />
        </section>
        <div id="workspaces" className={styles.workspaces}>
          {workspaces.map(
            ({ id, label, icon, title, description, tools, href, action }) => (
              <section
                key={id}
                id={id}
                className={`${styles.workspace} fv-reveal`}
                data-workspace={id}
                aria-labelledby={`${id}-heading`}
              >
                <p className={styles.workspaceLabel}>
                  <Icon name={icon} />
                  {label}
                </p>
                <div className={styles.workspaceCopy}>
                  <h2 id={`${id}-heading`}>{title}</h2>
                  <p>{description}</p>
                </div>
                <div className={styles.workspaceTools}>
                  <ul>
                    {tools.map((tool) => (
                      <li key={tool}>{tool}</li>
                    ))}
                  </ul>
                  <Link href={href} className={styles.textLink}>
                    {action} <Icon name="right" />
                  </Link>
                </div>
              </section>
            ),
          )}
        </div>
        <section className={styles.start} aria-labelledby="start-heading">
          <div>
            <h2 id="start-heading">Start with what you know.</h2>
            <p>
              Sign in with Google and add the income and expenses you want to
              track. No bank connection is needed.
            </p>
          </div>
          <Link href="/auth/sign-up" className="dash-primary">
            Create an account <Icon name="right" />
          </Link>
        </section>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}>
        <Link href="/">FinVerse</Link>
        <a href="#main-content">Back to top</a>
      </footer>
    </div>
  );
}
