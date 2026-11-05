import styles from "./page.module.css";

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

export default function Home() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="FinVerse home">
          <span className={styles.brandMark}>F</span>
          <span>FinVerse</span>
        </a>

        <nav className={styles.nav} aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#roadmap">Roadmap</a>
        </nav>

        <span className={styles.status}>Dashboard coming next</span>
      </header>

      <section className={styles.hero} id="top">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span /> Personal finance, made clear
          </p>
          <h1>
            Know where your money goes. <em>Plan what comes next.</em>
          </h1>
          <p className={styles.lead}>
            FinVerse is a personal finance workspace being built to help you
            track spending, manage budgets, grow savings, and understand your
            financial habits without the clutter.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryAction} href="#features">
              Explore features <span aria-hidden="true">→</span>
            </a>
            <a className={styles.secondaryAction} href="#how-it-works">
              See how it works
            </a>
          </div>
          <p className={styles.helperText}>
            Module one in progress · Authentication will be added later
          </p>
        </div>

        <div
          className={styles.previewShell}
          aria-label="FinVerse dashboard preview"
        >
          <div className={styles.previewTopbar}>
            <div className={styles.previewBrand}>
              <span className={styles.miniMark}>F</span>
              <span>Overview</span>
            </div>
            <span className={styles.month}>November 2026</span>
          </div>

          <div className={styles.metricGrid}>
            <article>
              <span>Monthly income</span>
              <strong>₹68,400</strong>
              <small className={styles.positive}>+8.4% this month</small>
            </article>
            <article>
              <span>Monthly expenses</span>
              <strong>₹31,260</strong>
              <small>46% of income</small>
            </article>
            <article>
              <span>Saved this month</span>
              <strong>₹18,900</strong>
              <small className={styles.positive}>On track</small>
            </article>
          </div>

          <div className={styles.previewBody}>
            <div className={styles.chartCard}>
              <div className={styles.cardHeading}>
                <span>Cash flow</span>
                <small>Last 6 months</small>
              </div>
              <div className={styles.chart} aria-hidden="true">
                <span style={{ height: "38%" }} />
                <span style={{ height: "54%" }} />
                <span style={{ height: "46%" }} />
                <span style={{ height: "70%" }} />
                <span style={{ height: "61%" }} />
                <span style={{ height: "86%" }} />
              </div>
              <div className={styles.chartLabels}>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
              </div>
            </div>

            <div className={styles.budgetCard}>
              <div className={styles.cardHeading}>
                <span>Budget status</span>
                <small>November</small>
              </div>
              <div className={styles.budgetItem}>
                <div>
                  <span>Food</span>
                  <small>₹5,200 / ₹8,000</small>
                </div>
                <div className={styles.progress}>
                  <span style={{ width: "65%" }} />
                </div>
              </div>
              <div className={styles.budgetItem}>
                <div>
                  <span>Transport</span>
                  <small>₹2,100 / ₹4,000</small>
                </div>
                <div className={styles.progress}>
                  <span style={{ width: "52%" }} />
                </div>
              </div>
              <div className={styles.budgetItem}>
                <div>
                  <span>Shopping</span>
                  <small>₹4,600 / ₹6,000</small>
                </div>
                <div className={styles.progress}>
                  <span className={styles.warning} style={{ width: "77%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>
            <span /> One place for the essentials
          </p>
          <h2>A calmer way to manage everyday money.</h2>
          <p>
            Start with reliable records and useful summaries. Add intelligence
            only where it genuinely helps.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article className={styles.featureCard} key={feature.number}>
              <span className={styles.featureNumber}>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.workflow} id="how-it-works">
        <div className={styles.workflowIntro}>
          <p className={styles.eyebrow}>
            <span /> A simple routine
          </p>
          <h2>From transaction to useful context.</h2>
        </div>
        <div className={styles.steps}>
          {steps.map(([title, description], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.roadmap} id="roadmap">
        <div>
          <p className={styles.eyebrow}>
            <span /> Building in focused stages
          </p>
          <h2>The foundation first. Smarter features next.</h2>
        </div>
        <div className={styles.roadmapItems}>
          <span className={styles.current}>
            <b>01</b> Landing page
          </span>
          <span>
            <b>02</b> Personal dashboard
          </span>
          <span>
            <b>03</b> Smart finance tools
          </span>
        </div>
      </section>

      <footer className={styles.footer}>
        <a className={styles.brand} href="#top">
          <span className={styles.brandMark}>F</span>
          <span>FinVerse</span>
        </a>
        <p>Built as a final-year B.Tech CSE (AI/ML) major project.</p>
        <span>Module 1 · Personal Finance</span>
      </footer>
    </main>
  );
}
