"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { authClient } from "../../../auth/client";
import type { AuthUser } from "../../../auth/types";
import type { ProfileResponse } from "../../../lib/profile";

import { onboardingBudgets } from "../../../lib/onboarding";
import { type Transaction } from "./data";
import { Header, Sidebar } from "./navigation";
import SummaryCards from "./summary-cards";
import BalanceBreakdownCard from "./balance-breakdown-card";
import ExpenseBreakdownCard from "./expense-breakdown-card";
import PlanningCards from "./planning-cards";
import RecentTransactions from "./recent-transactions";
import UpcomingBills, { type Bill } from "./upcoming-bills";
import SpendingAnalysis from "./spending-analysis";
import ReadinessCard from "./readiness-card";
import AiChat from "./ai-chat";
import ExpenseEntry from "./expense-entry";
import { useActivity, activityRequest } from "./use-activity";
import { budgetsWithSpending, dateKey } from "./spending-data";
import {
  billNotifications,
  priceAlertNotifications,
  type DashboardNotification,
} from "../../../lib/notifications";
import type { FiredAlert } from "../../../lib/market";
import { Modal } from "./modal";
import type { DialogKind } from "./dashboard-dialog";

const FinancialProfileForm = dynamic(
  () => import("../onboarding/financial-profile-form"),
  {
    loading: () => <p role="status">Loading financial profile...</p>,
  },
);
const BudgetEditor = dynamic(() => import("./budget-editor"));
const DashboardDialog = dynamic(() =>
  import("./dashboard-dialog").then((module) => module.DashboardDialog),
);

export default function Dashboard({
  user,
  profileData,
}: {
  user?: AuthUser;
  profileData: ProfileResponse;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(() => dateKey(new Date()).slice(0, 7));
  const [data, setData] = useState(profileData);
  const [editingProfile, setEditingProfile] = useState(false);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogKind | "budgets" | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [returnToTransactions, setReturnToTransactions] = useState(false);
  const budgets = useMemo(
    () => onboardingBudgets(data.profile!),
    [data.profile],
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const activity = useActivity<Transaction>("/api/transactions");
  const transactions = activity.items;
  // The bills fetch lives here so the same data feeds the bills panel,
  // the notification badge, and the notification centre.
  const bills = useActivity<Bill>("/api/bills");
  // Fired price alerts join the same centre. This is a cheap
  // database-only read (no quote fetching); evaluation happens on the
  // market-overview load. Fail-open: a failed fetch just leaves the
  // alerts out — the bills still notify, and the market page still
  // shows the fired alerts.
  const firedAlerts = useActivity<FiredAlert>("/api/market/alerts");
  const today = dateKey(new Date());
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" },
  );
  const notifications: DashboardNotification[] = useMemo(
    () => [
      ...billNotifications(bills.items, today),
      ...priceAlertNotifications(firedAlerts.items),
    ],
    [bills.items, firedAlerts.items, today],
  );
  // Budgets spend against the selected month: a past month counts its
  // whole month, the current month counts up to today.
  const budgetAsOf = useMemo(() => {
    const [year, monthIndex] = month.split("-").map(Number);
    const monthEnd = new Date(year!, monthIndex!, 0);
    const now = new Date(`${today}T12:00:00`);
    return dateKey(monthEnd) < today ? monthEnd : now;
  }, [month, today]);
  const currentBudgets = useMemo(
    () => budgetsWithSpending(budgets, transactions, budgetAsOf),
    [budgets, transactions, budgetAsOf],
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [autoPayNotice, setAutoPayNotice] = useState("");
  const autoPayRan = useRef(false);
  // Stable callbacks, destructured so the auto-pay effect can list
  // them as dependencies without re-running when the dashboard
  // re-renders (the activity objects themselves are new each render).
  const retryTransactions = activity.retry;
  const retryBills = bills.retry;
  const retryAlerts = firedAlerts.retry;
  const retryNotifications = useCallback(() => {
    retryBills();
    retryAlerts();
  }, [retryBills, retryAlerts]);

  // Auto-pay runs once per dashboard load: due auto-pay bills are
  // recorded as paid (payment + matching expense transaction). It is
  // best-effort — a failed run must never break the dashboard, and
  // the bills stay visible with their due labels either way. The run
  // records payments in FinVerse; it does not pay the provider.
  useEffect(() => {
    if (autoPayRan.current) return;
    autoPayRan.current = true;
    activityRequest<{ paid: { billId: string; name: string }[] }>(
      "/api/bills/auto-pay",
      {
        method: "POST",
        body: JSON.stringify({ today: dateKey(new Date()) }),
      },
    )
      .then(({ paid }) => {
        if (!paid.length) return;
        setAutoPayNotice(
          `Auto-pay recorded ${paid.length === 1 ? "a payment" : `${paid.length} payments`} just now: ${paid.map((item) => item.name).join(", ")}.`,
        );
        retryBills();
        retryTransactions();
      })
      .catch(() => {
        // Swallowed on purpose: see the comment above.
      });
    // Both retry callbacks are stable, so this runs once; the ref
    // guard makes the run once-only even if they ever change.
  }, [retryBills, retryTransactions]);

  async function addTransaction(transaction: Omit<Transaction, "id">) {
    await activity.add(transaction);
  }

  async function updateTransaction(
    id: string,
    transaction: Omit<Transaction, "id">,
  ) {
    await activity.update(id, transaction);
  }

  async function removeTransaction(id: string) {
    await activity.remove(id);
  }

  function openTransactionEditor(
    transaction: Transaction,
    kind: "edit-transaction" | "remove-transaction",
  ) {
    setSelectedTransaction(transaction);
    setReturnToTransactions(dialog === "transactions");
    setDialog(kind);
  }

  function closeDialog() {
    if (
      (dialog === "edit-transaction" || dialog === "remove-transaction") &&
      returnToTransactions
    ) {
      setSelectedTransaction(null);
      setReturnToTransactions(false);
      setDialog("transactions");
    } else {
      setSelectedTransaction(null);
      setDialog(null);
    }
  }

  // Balance-history jump: set the dashboard month to the chosen
  // month, then scroll to and focus that month's transactions.
  function jumpToMonthTransactions(targetMonth: string) {
    setMonth(targetMonth);
    window.setTimeout(() => {
      const section = document.getElementById("recent-transactions");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      section?.focus({ preventScroll: true });
    }, 60);
  }

  async function signOut() {
    setSignOutError("");
    setIsSigningOut(true);

    try {
      const { error } = await authClient.signOut();
      if (error)
        throw new Error(
          error.message ?? "Unable to log out. Please try again.",
        );
      router.replace("/");
      router.refresh();
    } catch (error) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : "Unable to log out. Please try again.",
      );
      setIsSigningOut(false);
    }
  }

  return (
    <div
      id="overview"
      className="dashboard min-h-screen bg-dash-bg font-sans text-dash-text"
    >
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-20 focus:z-50 focus:rounded-lg focus:bg-dash-accent focus:p-3 focus:text-dash-bg"
      >
        Skip to dashboard
      </a>
      <Sidebar
        onTransactions={() => setDialog("transactions")}
        onReport={() => setDialog("report")}
      />
      <div className="sm:pl-24">
        <Header
          month={month}
          onMonth={setMonth}
          query={query}
          onQuery={setQuery}
          onSearch={() => setDialog("transactions")}
          onTransactions={() => setDialog("transactions")}
          onAdd={() => setDialog("transaction")}
          onNotifications={() => setDialog("notifications")}
          notificationCount={notifications.length}
          onReport={() => setDialog("report")}
          user={user}
          onSignOut={signOut}
          isSigningOut={isSigningOut}
          signOutError={signOutError}
        />
        <main id="dashboard-content" className="dashboard-body space-y-5">
          {autoPayNotice && (
            <div
              role="status"
              className="flex items-start justify-between gap-3 rounded-panel border border-dash-accent/50 bg-dash-accent/10 px-4 py-3"
            >
              <p className="text-sm leading-6">
                <strong className="font-semibold">Auto-pay:</strong>{" "}
                {autoPayNotice} These payments were recorded in FinVerse and
                appear as expense transactions below.
              </p>
              <button
                type="button"
                className="dash-small-button shrink-0"
                onClick={() => setAutoPayNotice("")}
                aria-label="Dismiss auto-pay notice"
              >
                Dismiss
              </button>
            </div>
          )}
          <section
            className="dashboard-intro"
            aria-label="Welcome to your dashboard"
          >
            <div>
              <p className="dash-eyebrow">
                Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </p>
              <h2>Your money, in perspective.</h2>
              <p className="mt-3 text-sm leading-6 text-dash-muted">
                A little clarity for today. A little more room for tomorrow.
              </p>
              <p
                role="status"
                className="mt-2 text-xs leading-5 text-dash-muted"
              >
                Showing {monthLabel} across the dashboard — summary, budgets,
                spending and transactions all follow this month. Change it with
                the month picker above.
              </p>
            </div>
            <button
              className="dash-small-button"
              onClick={() => setEditingProfile(true)}
            >
              Edit financial profile
            </button>
          </section>
          <SummaryCards
            onReport={() => setDialog("report")}
            profile={data.profile!}
            transactions={transactions}
            month={month}
            loading={activity.loading}
            error={activity.error}
            onRetry={activity.retry}
          />
          <section
            aria-label="Financial breakdown"
            className="grid gap-4 xl:grid-cols-dashboard"
          >
            <BalanceBreakdownCard
              transactions={transactions}
              loading={activity.loading}
              error={activity.error}
              onRetry={activity.retry}
              month={month}
              onMonth={setMonth}
              onJumpToMonth={jumpToMonthTransactions}
              profile={data.profile!}
            />
            <ExpenseBreakdownCard profile={data.profile!} />
          </section>
          <PlanningCards
            budgets={currentBudgets}
            loading={activity.loading}
            error={activity.error}
            onRetry={activity.retry}
            month={month}
            goals={data.goals}
            onManage={() => setDialog("budgets")}
            onAdd={() => setDialog("goal")}
            onGoalSavedAmount={(goalId, savedAmount) =>
              setData((current) => ({
                ...current,
                goals: current.goals.map((goal) =>
                  goal.id === goalId
                    ? { ...goal, saved_amount: savedAmount }
                    : goal,
                ),
              }))
            }
          />
          <ExpenseEntry
            onTransaction={addTransaction}
            disabled={activity.loading || !!activity.error}
            loadError={activity.error}
            loading={activity.loading}
            onRetryLoad={activity.retry}
          />
          <section
            aria-label="Transactions and bills"
            className="grid gap-4 xl:grid-cols-dashboard"
          >
            <RecentTransactions
              transactions={transactions}
              loading={activity.loading}
              error={activity.error}
              onRetry={activity.retry}
              month={month}
              onAdd={() => setDialog("transaction")}
              onSeeAll={() => {
                setQuery("");
                setDialog("transactions");
              }}
              onEdit={(transaction) =>
                openTransactionEditor(transaction, "edit-transaction")
              }
              onRemove={(transaction) =>
                openTransactionEditor(transaction, "remove-transaction")
              }
            />
            <UpcomingBills
              activity={bills}
              onPaymentRecorded={activity.retry}
              autoPayNotice={autoPayNotice}
            />
          </section>
          <SpendingAnalysis
            transactions={transactions}
            bills={bills.items}
            loading={activity.loading}
            error={activity.error}
            onRetry={activity.retry}
            month={month}
          />
          <ReadinessCard />
          <AiChat />
        </main>
      </div>
      {(editingProfile || dialog === "goal") && (
        <Modal
          title={
            dialog === "goal"
              ? "Manage savings goals"
              : "Edit financial profile"
          }
          busy={profileSaving}
          onClose={() => {
            setEditingProfile(false);
            setDialog(null);
          }}
        >
          <FinancialProfileForm
            initialData={data}
            onSavingChange={setProfileSaving}
            initialStep={dialog === "goal" ? 2 : 0}
            onCancel={() => {
              setEditingProfile(false);
              setDialog(null);
            }}
            onSaved={(updated) => {
              setData(updated);
              setEditingProfile(false);
              setDialog(null);
            }}
          />
        </Modal>
      )}
      {dialog === "budgets" && (
        <BudgetEditor
          data={data}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setData(updated);
            setDialog(null);
          }}
        />
      )}
      {dialog && dialog !== "goal" && dialog !== "budgets" && (
        <DashboardDialog
          kind={dialog}
          onClose={closeDialog}
          transactions={transactions}
          transactionsLoading={activity.loading}
          transactionsError={activity.error}
          onRetryTransactions={activity.retry}
          notifications={notifications}
          notificationsLoading={bills.loading}
          notificationsError={bills.error}
          onRetryNotifications={retryNotifications}
          query={query}
          onQuery={setQuery}
          profile={data.profile!}
          month={month}
          bills={bills.items}
          onTransaction={addTransaction}
          editingTransaction={selectedTransaction}
          onEditTransaction={(transaction) =>
            openTransactionEditor(transaction, "edit-transaction")
          }
          onRemoveTransaction={(transaction) =>
            openTransactionEditor(transaction, "remove-transaction")
          }
          onTransactionEdit={updateTransaction}
          onTransactionRemove={removeTransaction}
        />
      )}
    </div>
  );
}
