import { profileTotals, type FinancialProfile } from "../../../lib/profile";
import { money } from "./data";
import { reportedNetWorth } from "./spending-data";
import styles from "./tracker-overview.module.css";

export default function SummaryCards({
  onReport,
  profile,
}: {
  onReport?: () => void;
  profile: FinancialProfile;
}) {
  const { savings } = profileTotals(profile);
  const netWorth = reportedNetWorth(profile);

  return (
    <section aria-labelledby="account-snapshot">
      <div className={styles.panelHeading}>
        <h2 id="account-snapshot">Account snapshot</h2>
        {onReport && (
          <button
            type="button"
            className="dash-small-button"
            onClick={onReport}
          >
            View report
          </button>
        )}
      </div>
      <dl className={styles.snapshotStats}>
        <div>
          <dt>Total savings · reported</dt>
          <dd>
            {profile.current_savings === null
              ? "Not recorded"
              : money(savings, 2)}
          </dd>
        </div>
        <div>
          <dt>Net worth · reported</dt>
          <dd title="Saved balances plus reported investments minus reported debt">
            {netWorth === null ? "Incomplete profile" : money(netWorth, 2)}
          </dd>
        </div>
        {profile.payday != null && (
          <div className={styles.snapshotPayday}>
            <dt>Payday</dt>
            <dd>Day {profile.payday} of each month</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
