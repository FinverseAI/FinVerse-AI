import { useState } from "react";
import {
  BalanceDevelopment,
  BalanceSparkline,
  ExpenseBreakdown,
} from "./charts.jsx";
import {
  BalanceCard,
  Header,
  KpiCard,
  SavingProgress,
  Sidebar,
} from "./components.jsx";
import { months, snapshots } from "./data.js";

export default function PersonalFinanceTracker() {
  const [activeMonth, setActiveMonth] = useState(months.indexOf("Jun"));
  const [extraContrast, setExtraContrast] = useState(false);
  const snapshot = snapshots[activeMonth];

  return (
    <main className="page-stage">
      <div className="tracker-frame" data-contrast={extraContrast}>
        <div className="tracker-shell" id="overview">
          <Header activeMonth={activeMonth} onMonth={setActiveMonth} />
          <div className="tracker-layout">
            <Sidebar
              extraContrast={extraContrast}
              onToggleTheme={() => setExtraContrast((current) => !current)}
            />
            <div className="tracker-content">
              <div className="primary-column">
                <div className="sparkline-stage">
                  <BalanceSparkline data={snapshot.sparkline} />
                  <BalanceCard
                    balance={snapshot.balance}
                    change={snapshot.balanceChange}
                  />
                </div>
                <div className="kpi-grid">
                  {snapshot.metrics.map((metric) => (
                    <KpiCard key={metric.name} {...metric} />
                  ))}
                </div>
                <BalanceDevelopment
                  activeMonth={activeMonth}
                  snapshot={snapshot}
                />
              </div>
              <div className="secondary-column">
                <ExpenseBreakdown
                  expenses={snapshot.expenses}
                  stats={snapshot.expenseStats}
                />
                <SavingProgress goals={snapshot.goals} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
