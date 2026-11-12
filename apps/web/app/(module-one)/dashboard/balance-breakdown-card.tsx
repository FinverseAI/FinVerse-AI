import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money, months } from "./data";
import { Icon, MiniStat, PanelHeading } from "./ui";

export default function BalanceBreakdownCard({
  month,
  onMonth,
  profile,
}: {
  month: number;
  onMonth: (month: number) => void;
  profile: FinancialProfile;
}) {
  const totals = profileTotals(profile);
  return (
    <article id="balance" className="dash-panel flex min-w-0 flex-col p-4">
      <PanelHeading icon="pie" title="Balance Breakdown">
        <div className="flex items-center gap-2">
          <button
            className="dash-icon-button size-7"
            aria-label="Previous chart month"
            onClick={() => onMonth((month + 11) % 12)}
          >
            <Icon name="left" className="size-3" />
          </button>
          <span className="w-[102px] text-center font-mono text-[10px]">
            {months[month]} {new Date().getFullYear()}
          </span>
          <button
            className="dash-icon-button size-7"
            aria-label="Next chart month"
            onClick={() => onMonth((month + 1) % 12)}
          >
            <Icon name="right" className="size-3" />
          </button>
        </div>
      </PanelHeading>
      <div className="mt-5 grid h-[190px] place-items-center text-center text-xs leading-6 text-dash-muted sm:h-[202px]">
        <p>
          No recorded history for {months[month]}.<br />
          Your current monthly plan is shown below.
        </p>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-5 sm:grid-cols-4">
        <MiniStat label="Monthly income" value={money(totals.income, 2)} />
        <MiniStat label="Monthly expenses" value={money(totals.expenses, 2)} />
        <MiniStat label="Savings target" value={money(totals.target, 2)} />
        <MiniStat label="Monthly surplus" value={money(totals.surplus, 2)} />
      </div>
    </article>
  );
}
