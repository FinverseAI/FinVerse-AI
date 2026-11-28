import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatPill } from "./components.jsx";
import { balanceSeries, compactEuros, euros, months } from "./data.js";

const chartInset = { top: 4, right: 3, bottom: 0, left: 3 };
const tooltipCursor = { fill: "var(--chart-hover)" };

export function BalanceSparkline({ data }) {
  const gradient = useId();
  const [lowest, highest] = data.reduce(
    ([min, max], { value }) => [Math.min(min, value), Math.max(max, value)],
    [Infinity, -Infinity],
  );
  return (
    <div className="sparkline" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 7, left: 2, right: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-muted)"
                stopOpacity={0.37}
              />
              <stop
                offset="100%"
                stopColor="var(--chart-muted)"
                stopOpacity={0.13}
              />
            </linearGradient>
          </defs>
          <YAxis hide domain={[lowest - 90, highest + 90]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-muted)"
            strokeWidth={1.3}
            fill={`url(#${gradient})`}
            animationDuration={200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExpenseTooltip({ active, payload, range = false }) {
  const group = payload?.[0]?.payload;
  if (!active || !group) return null;
  return (
    <div className="chart-tooltip">
      <strong>{group.name}</strong>
      {range ? (
        <>
          <p>
            Smallest <span>{euros(group.range[0])}</span>
          </p>
          <p>
            Largest <span>{euros(group.range[1])}</span>
          </p>
        </>
      ) : (
        <>
          <p>
            Actual <span>{euros(group.actual)}</span>
          </p>
          <p>
            Budget <span>{euros(group.budget)}</span>
          </p>
        </>
      )}
    </div>
  );
}

function RangeStem({ x = 0, y = 0, width = 0, height = 0 }) {
  const center = x + width / 2;
  return (
    <g>
      <line
        x1={center}
        x2={center}
        y1={y - 4}
        y2={y + height + 4}
        stroke="var(--chart-muted)"
        opacity={0.24}
      />
      <line
        x1={center}
        x2={center}
        y1={y}
        y2={y + height}
        stroke="var(--chart-cyan)"
        opacity={0.47}
      />
      <circle cx={center} cy={y} r={2.2} fill="var(--chart-cyan)" />
      <circle cx={center} cy={y + height} r={2.2} fill="var(--chart-cyan)" />
    </g>
  );
}

export function ExpenseBreakdown({ expenses, stats }) {
  return (
    <section
      className="expense-panel glass-panel lift"
      id="expense-breakdown"
      aria-labelledby="expense-title"
    >
      <h2 className="eyebrow" id="expense-title">
        Expense Breakdown
      </h2>
      <div className="expense-values" aria-label="Actual expenses and budgets">
        {expenses.map(({ name, actual, budget }) => (
          <div
            key={name}
            aria-label={`${name}, actual ${euros(actual)}, budget ${euros(budget)}`}
          >
            <strong>{compactEuros(actual)}</strong>
            <span>{compactEuros(budget)}</span>
          </div>
        ))}
      </div>
      <div className="grouped-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={expenses} barGap={3} barSize={12} margin={chartInset}>
            <XAxis dataKey="name" hide />
            <YAxis
              hide
              domain={[0, (maximum) => Math.ceil(maximum / 200) * 200]}
            />
            <Tooltip cursor={tooltipCursor} content={<ExpenseTooltip />} />
            <Bar
              dataKey="actual"
              fill="var(--chart-cyan)"
              radius={[1.5, 1.5, 0, 0]}
              animationDuration={200}
            />
            <Bar
              dataKey="budget"
              fill="var(--chart-blue)"
              radius={[1.5, 1.5, 0, 0]}
              animationDuration={200}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="expense-categories">
        {expenses.map(({ name }) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div
        className="range-chart"
        aria-label="Smallest and largest expenses per category"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={expenses}
            barSize={18}
            margin={{ ...chartInset, top: 10, bottom: 7 }}
          >
            <XAxis dataKey="name" hide />
            <YAxis
              hide
              domain={[
                0,
                (maximum) => Math.max(500, Math.ceil(maximum / 100) * 100),
              ]}
            />
            <Tooltip
              cursor={tooltipCursor}
              content={<ExpenseTooltip range />}
            />
            <Bar
              dataKey="range"
              shape={<RangeStem />}
              animationDuration={200}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="expense-stats">
        {stats.map(({ count, label }) => (
          <StatPill key={label} value={count} label={label} />
        ))}
      </div>
    </section>
  );
}

function BalanceTooltip({ active, payload }) {
  const point = payload?.[0]?.payload;
  if (!active || point?.value == null) return null;
  return (
    <div className="chart-tooltip">
      <strong>{point.month}</strong>
      <p>
        Balance <span>{euros(point.value)}</span>
      </p>
    </div>
  );
}

function BalanceDot({ cx, cy, payload, peak }) {
  if (cx == null || cy == null || payload?.value == null) return null;
  const labelOffset = months.indexOf(payload.month) >= 10 ? -62 : 8;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={payload.month === peak ? 3.4 : 1.8}
        fill="var(--chart-teal)"
      />
      {payload.month === peak && (
        <g
          className="peak-tag"
          transform={`translate(${cx + labelOffset},${cy - 15})`}
        >
          <rect x={0} y={0} width={54} height={19} rx={4} />
          <text x={27} y={13} textAnchor="middle">
            {compactEuros(payload.value)}
          </text>
        </g>
      )}
    </g>
  );
}

export function BalanceDevelopment({ activeMonth, snapshot }) {
  const [gross, setGross] = useState(false);
  const data = balanceSeries(activeMonth, gross);
  const peak = data
    .slice(0, activeMonth + 1)
    .reduce((highest, point) =>
      point.value > highest.value ? point : highest,
    );
  return (
    <section
      className="development-panel glass-panel lift"
      id="balance-development"
      aria-labelledby="development-title"
    >
      <div className="development-header">
        <h2 className="eyebrow" id="development-title">
          Balance Development
        </h2>
        <div className="development-stats">
          <StatPill
            value={euros(snapshot.highestIncome)}
            label="Highest Income Item"
          />
          <StatPill
            value={euros(snapshot.largestExpense)}
            label="Biggest Spending"
          />
        </div>
      </div>
      <div
        className="development-chart"
        aria-label={gross ? "Gross balance by month" : "Net balance by month"}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 24, right: 15, bottom: 0, left: 15 }}
          >
            <CartesianGrid
              stroke="var(--chart-grid)"
              strokeDasharray="3 4"
              horizontal={false}
            />
            <XAxis
              dataKey="month"
              height={24}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tick={{ fill: "var(--chart-muted)", fontSize: 9 }}
            />
            <YAxis hide domain={["dataMin - 200", "dataMax + 240"]} />
            <Tooltip
              cursor={{ stroke: "var(--chart-muted)", strokeDasharray: "3 5" }}
              content={<BalanceTooltip />}
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="var(--chart-muted)"
              dot={false}
              strokeDasharray="3 4"
              strokeOpacity={0.35}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke="var(--chart-muted)"
              dot={false}
              strokeDasharray="3 4"
              strokeOpacity={0.35}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-teal)"
              strokeWidth={2}
              dot={<BalanceDot peak={peak.month} />}
              activeDot={{
                r: 4,
                fill: "var(--chart-teal)",
                stroke: "var(--chart-ink)",
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="balance-mode">
        <span data-active={!gross}>Net</span>
        <button
          className="switch"
          type="button"
          role="switch"
          aria-label="Gross balance"
          aria-checked={gross}
          onClick={() => setGross((current) => !current)}
        >
          <span />
        </button>
        <span data-active={gross}>Gross</span>
      </div>
    </section>
  );
}
