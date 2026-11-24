"use client";

import { useState } from "react";
import { Modal } from "../../(module-one)/dashboard/modal";
import { activityError } from "../../(module-one)/dashboard/use-activity";

export type HoldingFormData = {
  symbol: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  name?: string;
  sector?: string;
};

export function HoldingForm({
  title,
  submitLabel,
  initial,
  lockSymbol = false,
  onSubmit,
  onClose,
}: {
  title: string;
  submitLabel: string;
  initial: Partial<HoldingFormData>;
  lockSymbol?: boolean;
  onSubmit: (data: HoldingFormData) => Promise<void>;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [symbol, setSymbol] = useState(initial.symbol ?? "");
  const [name, setName] = useState(initial.name ?? "");
  const [sector, setSector] = useState(initial.sector ?? "");
  const [quantity, setQuantity] = useState(
    initial.quantity === undefined ? "" : String(initial.quantity),
  );
  const [buyPrice, setBuyPrice] = useState(
    initial.buyPrice === undefined ? "" : String(initial.buyPrice),
  );
  const [buyDate, setBuyDate] = useState(initial.buyDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const quantityValue = Number(quantity);
    const buyPriceValue = Number(buyPrice);
    if (!symbol.trim()) {
      setError("Enter a symbol, for example RELIANCE.NS.");
      return;
    }
    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (!Number.isFinite(buyPriceValue) || buyPriceValue <= 0) {
      setError("Buy price must be greater than zero.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(buyDate) || buyDate > today) {
      setError("Buy date must be a valid date, not in the future.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        symbol: symbol.trim().toUpperCase(),
        quantity: quantityValue,
        buyPrice: buyPriceValue,
        buyDate,
        name: name.trim() || undefined,
        sector: sector.trim() || undefined,
      });
      onClose();
    } catch (caught) {
      setError(activityError(caught));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <form className="dash-form" onSubmit={submit}>
        <label>
          Symbol
          <input
            className="dash-input"
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}

            maxLength={20}
            readOnly={lockSymbol}
            autoFocus={!lockSymbol}
            aria-describedby="holding-symbol-help"
          />
          <span id="holding-symbol-help" className="text-xs text-dash-muted">
            NSE symbols end in .NS, BSE in .BO — for example RELIANCE.NS or
            TCS.NS.
          </span>
        </label>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <label>
            Quantity
            <input
              className="dash-input"
              type="number"
              min="0"
              step="0.0001"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label>
            Average purchase cost (₹)
            <input
              className="dash-input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={buyPrice}
              onChange={(event) => setBuyPrice(event.target.value)}
            />
          </label>
        </div>
        <label>
          Buy date
          <input
            className="dash-input"
            type="date"
            max={today}
            value={buyDate}
            onChange={(event) => setBuyDate(event.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <label>
            Company name <span className="text-dash-muted">(optional)</span>
            <input
              className="dash-input"
              value={name}
              onChange={(event) => setName(event.target.value)}

              maxLength={120}
            />
          </label>
          <label>
            Sector <span className="text-dash-muted">(optional)</span>
            <input
              className="dash-input"
              value={sector}
              onChange={(event) => setSector(event.target.value)}

              maxLength={80}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-dash-red">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="dash-small-button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="dash-primary" disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
