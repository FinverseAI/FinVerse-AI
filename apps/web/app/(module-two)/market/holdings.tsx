"use client";

import { useState } from "react";
import Link from "next/link";
import type { PortfolioSummary, ValuedHolding } from "../../../lib/market";
import {
  formatMoney,
  formatPercent,
  formatPrice,
  totalsByCurrency,
} from "../../../lib/market";
import {
  activityError,
  activityRequest,
} from "../../(module-one)/dashboard/use-activity";
import { Icon, PanelHeading } from "../../(module-one)/dashboard/ui";
import { Modal } from "../../(module-one)/dashboard/modal";
import { HoldingForm, type HoldingFormData } from "./holding-form";

function GainCell({ holding }: { holding: ValuedHolding }) {
  if (!holding.priced || holding.gainLoss === null) {
    return <span className="text-dash-muted">—</span>;
  }
  const up = holding.gainLoss >= 0;
  const currency = holding.currency ?? "INR";
  return (
    <span className={up ? "market-positive" : "market-negative"}>
      {up ? "+" : "−"}
      {formatMoney(Math.abs(holding.gainLoss), currency)}
      {holding.gainLossPercent !== null &&
        ` (${formatPercent(holding.gainLossPercent)})`}
    </span>
  );
}

export function HoldingsSection({
  summary,
  loading,
  error,
  onChanged,
}: {
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string;
  onChanged: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ValuedHolding | null>(null);
  const [removing, setRemoving] = useState<ValuedHolding | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function addHolding(data: HoldingFormData) {
    await activityRequest("/api/holdings", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setActionError("");
    onChanged();
  }

  async function updateHolding(data: HoldingFormData) {
    if (!editing) return;
    await activityRequest(`/api/holdings/${encodeURIComponent(editing.id)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    setActionError("");
    onChanged();
  }

  async function removeHolding() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await activityRequest(
        `/api/holdings/${encodeURIComponent(removing.id)}`,
        { method: "DELETE" },
      );
      setActionError("");
      setRemoving(null);
      onChanged();
    } catch (caught) {
      setActionError(activityError(caught));
    } finally {
      setRemoveBusy(false);
    }
  }

  const holdings = summary?.holdings ?? [];

  return (
    <section id="holdings" aria-label="Holdings" className="scroll-mt-24">
      <PanelHeading icon="wallet" title="Holdings">
        <button
          type="button"
          className="dash-primary h-8 gap-1.5 px-3"
          onClick={() => setShowAdd(true)}
        >
          <Icon name="plus" className="size-3.5" />
          Add holding
        </button>
      </PanelHeading>
      <div className="dash-panel mt-4 overflow-x-auto p-0" tabIndex={0}>
        {loading ? (
          <p role="status" className="p-6 text-sm text-dash-muted">
            Loading holdings…
          </p>
        ) : error ? (
          <p role="alert" className="p-6 text-sm text-dash-red">
            {error}
          </p>
        ) : holdings.length === 0 ? (
          <p className="p-6 text-sm text-dash-muted">
            No holdings yet. Add one to track its value, gains and sector — or
            open a stock page and add it from there with the price prefilled.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border text-xs text-dash-muted">
                <th scope="col" className="px-5 py-3 font-medium">
                  Holding
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Quantity
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Average cost
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Current price
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Current value
                </th>
                <th scope="col" className="px-3 py-3 text-right font-medium">
                  Gain / loss
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dash-border">
              {holdings.map((holding) => (
                <tr key={holding.id}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/market/stock/${encodeURIComponent(holding.symbol)}`}
                      className="font-medium text-dash-text hover:text-dash-accent"
                    >
                      {holding.name ?? holding.symbol}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-dash-muted">
                      {holding.symbol} · bought {holding.buyDate}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {holding.quantity}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {formatPrice(holding.buyPrice, holding.currency ?? "INR")}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {holding.priced && holding.currentPrice !== null ? (
                      <>
                        {formatPrice(
                          holding.currentPrice,
                          holding.currency ?? "INR",
                        )}
                        {holding.stale && (
                          <span className="mt-0.5 block text-xs text-dash-warning">
                            Last known
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-dash-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {holding.priced && holding.currentValue !== null
                      ? formatMoney(
                          holding.currentValue,
                          holding.currency ?? "INR",
                        )
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    <GainCell holding={holding} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none"
                        aria-label={`Edit ${holding.symbol}`}
                        onClick={() => setEditing(holding)}
                      >
                        <Icon name="edit" className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="dash-icon-button !size-7 !min-w-7 !border-transparent !bg-none !shadow-none hover:!text-dash-red"
                        aria-label={`Remove ${holding.symbol}`}
                        onClick={() => setRemoving(holding)}
                      >
                        <Icon name="trash" className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-dash-border font-medium">
                <th className="px-5 py-3 text-left" scope="row">
                  Priced total
                </th>
                <td colSpan={3} />
                <td className="text-right">
                  {holdings.some((h) => h.priced)
                    ? totalsByCurrency(holdings)
                        .map((group) =>
                          formatMoney(group.totalValue, group.currency),
                        )
                        .join(" · ")
                    : "—"}
                </td>
                <td className="px-3 text-right">
                  {holdings.some((h) => h.priced)
                    ? totalsByCurrency(holdings)
                        .map((group) =>
                          formatMoney(group.totalGainLoss, group.currency),
                        )
                        .join(" · ")
                    : "—"}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      {actionError && (
        <p role="alert" className="mt-3 text-sm text-dash-red">
          {actionError}
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-dash-muted">
        One row per symbol: adding the same symbol again is rejected, so edit
        the row instead when you buy more. Values come from the portfolio
        summary, so they always match the totals above. Each holding is valued
        in its own currency — totals are shown per currency, never added across
        currencies.
      </p>

      {showAdd && (
        <HoldingForm
          title="Add a holding"
          submitLabel="Add holding"
          initial={{}}
          onSubmit={addHolding}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <HoldingForm
          title={`Edit ${editing.symbol}`}
          submitLabel="Save changes"
          initial={{
            symbol: editing.symbol,
            name: editing.name ?? undefined,
            sector: editing.sector ?? undefined,
            quantity: editing.quantity,
            buyPrice: editing.buyPrice,
            buyDate: editing.buyDate,
            currency: editing.currency ?? "INR",
          }}
          lockSymbol
          onSubmit={updateHolding}
          onClose={() => setEditing(null)}
        />
      )}
      {removing && (
        <Modal
          title={`Remove ${removing.symbol}?`}
          onClose={() => setRemoving(null)}
          busy={removeBusy}
        >
          <p className="text-sm leading-6 text-dash-muted">
            This deletes the holding record for{" "}
            {removing.name ?? removing.symbol} ({removing.quantity} ×{" "}
            {formatPrice(removing.buyPrice, removing.currency ?? "INR")} bought{" "}
            {removing.buyDate}). Your portfolio totals will update right away.
          </p>
          {actionError && (
            <p role="alert" className="mt-4 text-sm text-dash-red">
              {actionError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="dash-small-button"
              onClick={() => setRemoving(null)}
              disabled={removeBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="dash-primary"
              onClick={removeHolding}
              disabled={removeBusy}
            >
              {removeBusy ? "Removing…" : "Remove holding"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
