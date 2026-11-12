"use client";

import { useState } from "react";
import { authClient } from "../../../auth/client";
import type { AuthUser } from "../../../auth/types";
import type { ProfileResponse } from "../../../lib/profile";
import OnboardingForm from "../onboarding/onboarding-form";
import { type Budget, type Transaction } from "./data";
import { Header, Sidebar } from "./navigation";
import SummaryCards from "./summary-cards";
import BalanceBreakdownCard from "./balance-breakdown-card";
import ExpenseBreakdownCard from "./expense-breakdown-card";
import PlanningCards from "./planning-cards";
import { DashboardDialog, Modal, type DialogKind } from "./ui";

export default function Dashboard({
  user,
  profileData,
}: {
  user?: AuthUser;
  profileData: ProfileResponse;
}) {
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [data, setData] = useState(profileData);
  const [editingProfile, setEditingProfile] = useState(false);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  function addTransaction(transaction: Transaction) {
    setTransactions((current) => [transaction, ...current]);
    if (transaction.amount < 0)
      setBudgets((current) =>
        current.map((budget) =>
          budget.name === transaction.category
            ? { ...budget, spent: budget.spent - transaction.amount }
            : budget,
        ),
      );
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
      window.location.assign("/");
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
      <div className="sm:pl-[92px]">
        <Header
          month={month}
          onMonth={setMonth}
          query={query}
          onQuery={setQuery}
          onSearch={() => setDialog("transactions")}
          onTransactions={() => setDialog("transactions")}
          onAdd={() => setDialog("transaction")}
          onNotifications={() => setDialog("notifications")}
          onReport={() => setDialog("report")}
          user={user}
          onSignOut={signOut}
          isSigningOut={isSigningOut}
          signOutError={signOutError}
        />
        <main id="dashboard-content" className="dashboard-body space-y-5">
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
          />
          <section
            aria-label="Financial breakdown"
            className="grid gap-4 xl:grid-cols-[minmax(0,2.03fr)_minmax(0,1fr)]"
          >
            <BalanceBreakdownCard
              month={month}
              onMonth={setMonth}
              profile={data.profile!}
            />
            <ExpenseBreakdownCard profile={data.profile!} />
          </section>
          <PlanningCards
            budgets={budgets}
            goals={data.goals}
            onManage={() => setDialog("budgets")}
            onAdd={() => setDialog("goal")}
          />
        </main>
      </div>
      {(editingProfile || dialog === "goal") && (
        <Modal
          title={
            dialog === "goal"
              ? "Manage savings goals"
              : "Edit financial profile"
          }
          onClose={() => {
            setEditingProfile(false);
            setDialog(null);
          }}
        >
          <OnboardingForm
            initialData={data}
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
      {dialog && dialog !== "goal" && (
        <DashboardDialog
          kind={dialog}
          onClose={() => setDialog(null)}
          budgets={budgets}
          transactions={transactions}
          query={query}
          onQuery={setQuery}
          profile={data.profile!}
          onTransaction={addTransaction}
          onBudgets={setBudgets}
        />
      )}
    </div>
  );
}
