"use client";

import { useMemo, useState } from "react";
import type { HistoryBar } from "../../../lib/market";
import { formatCompact, formatPrice } from "../../../lib/market";
import type { MacdPoint } from "../../../lib/indicators";

/**
 * Hand-rolled SVG charts (no charting library in the repo). All charts share
 * one geometry: a 720-wide viewBox, hover by nearest trading day, and a
 * tooltip that shows the exact values behind the pixel.
 */

// Theme colours from app/globals.css.
const ACCENT = "#ff9b8b";
const TEXT = "#f3f1eb";
const MUTED = "#c0cad5";
const WARNING = "#efd0a2";
const GRID = "#d2e0f133";

const WIDTH = 720;
const PAD_LEFT = 64;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;

const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "2-digit",
});
const fullDateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatChartDate(iso: string) {
  return dayFormat.format(new Date(`${iso}T12:00:00`));
}

function formatFullDate(iso: string) {
  return fullDateFormat.format(new Date(`${iso}T12:00:00`));
}

function xFor(index: number, count: number) {
  if (count <= 1) return PAD_LEFT;
  return PAD_LEFT + (index / (count - 1)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
}

function yFor(value: number, min: number, max: number, height: number) {
  const span = max - min || 1;
  return PAD_TOP + (1 - (value - min) / span) * (height - PAD_TOP - PAD_BOTTOM);
}

/** Builds an SVG path through contiguous non-null runs of a series. */
function linePath(
  values: (number | null)[],
  min: number,
  max: number,
  height: number,
) {
  let path = "";
  let penDown = false;
  values.forEach((value, i) => {
    if (value === null || !Number.isFinite(value)) {
      penDown = false;
      return;
    }
    const x = xFor(i, values.length);
    const y = yFor(value, min, max, height);
    path += penDown
      ? ` L${x.toFixed(1)},${y.toFixed(1)}`
      : ` M${x.toFixed(1)},${y.toFixed(1)}`;
    penDown = true;
  });
  return path;
}

function useHoverIndex(count: number) {
  const [index, setIndex] = useState<number | null>(null);
  return {
    index,
    onMove: (event: React.MouseEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      const i = Math.round(
        ((x - PAD_LEFT) / (WIDTH - PAD_LEFT - PAD_RIGHT)) * (count - 1),
      );
      setIndex(Math.max(0, Math.min(count - 1, i)));
    },
    onLeave: () => setIndex(null),
    // Keyboard access: the chart is focusable (tabIndex 0) and the arrow
    // keys step through trading days; Home/End jump to the ends.
    onKeyDown: (event: React.KeyboardEvent<SVGSVGElement>) => {
      if (
        event.key === "ArrowRight" ||
        event.key === "ArrowLeft" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        event.preventDefault();
        setIndex((current) => {
          if (event.key === "Home") return 0;
          if (event.key === "End") return count - 1;
          const start = current ?? (event.key === "ArrowRight" ? -1 : count);
          const next = event.key === "ArrowRight" ? start + 1 : start - 1;
          return Math.max(0, Math.min(count - 1, next));
        });
      }
    },
    onFocus: () => setIndex((current) => current ?? count - 1),
    onBlur: () => setIndex(null),
  };
}

function Tooltip({
  index,
  count,
  children,
}: {
  index: number;
  count: number;
  children: React.ReactNode;
}) {
  const left = Math.max(14, Math.min(86, (xFor(index, count) / WIDTH) * 100));
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-dash-border bg-dash-raised px-3 py-2 text-xs"
      style={{ left: `${left}%` }}
    >
      {children}
    </div>
  );
}

function AxisLabels({
  dates,
  min,
  max,
  height,
  formatValue,
}: {
  dates: string[];
  min: number;
  max: number;
  height: number;
  formatValue: (value: number) => string;
}) {
  const ticks = [0, 1, 2, 3, 4].map((step) => min + ((max - min) * step) / 4);
  const dateTicks = [0, 1, 2, 3, 4].map((step) =>
    Math.min(dates.length - 1, Math.round(((dates.length - 1) * step) / 4)),
  );
  return (
    <>
      {ticks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yFor(tick, min, max, height)}
            y2={yFor(tick, min, max, height)}
            stroke={GRID}
            strokeWidth="1"
          />
          <text
            x={PAD_LEFT - 8}
            y={yFor(tick, min, max, height) + 4}
            textAnchor="end"
            fontSize="11"
            fill={MUTED}
          >
            {formatValue(tick)}
          </text>
        </g>
      ))}
      {dateTicks.map((tick, i) => (
        <text
          key={i}
          x={xFor(tick, dates.length)}
          y={height - 8}
          textAnchor="middle"
          fontSize="11"
          fill={MUTED}
        >
          {formatChartDate(dates[tick]!)}
        </text>
      ))}
    </>
  );
}

export type ChartOverlay = {
  label: string;
  values: (number | null)[];
  color: string;
};

export function PriceChart({
  bars,
  overlays = [],
  currency = "INR",
}: {
  bars: HistoryBar[];
  overlays?: ChartOverlay[];
  currency?: string;
}) {
  const height = 300;
  const hover = useHoverIndex(bars.length);
  const closes = useMemo(() => bars.map((bar) => bar.close), [bars]);
  const dates = useMemo(() => bars.map((bar) => bar.date), [bars]);
  const { min, max } = useMemo(() => {
    const all = [...closes];
    for (const overlay of overlays) {
      for (const value of overlay.values) {
        if (value !== null && Number.isFinite(value)) all.push(value);
      }
    }
    let low = Math.min(...all);
    let high = Math.max(...all);
    const pad = (high - low || 1) * 0.05;
    low -= pad;
    high += pad;
    return { min: low, max: high };
  }, [closes, overlays]);

  if (bars.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-dash-muted">
        Not enough price history to draw a chart yet.
      </p>
    );
  }

  const hovered = hover.index !== null ? bars[hover.index] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full"
        role="img"
        tabIndex={0}
        aria-label={`Price chart, ${bars.length} trading days from ${formatFullDate(dates[0]!)} to ${formatFullDate(dates[dates.length - 1]!)}, low ${formatPrice(Math.min(...closes), currency)}, high ${formatPrice(Math.max(...closes), currency)}${hovered ? `. Selected: ${formatFullDate(hovered.date)}, close ${formatPrice(hovered.close, currency)}` : ". Focus the chart and use the left and right arrow keys to inspect a day."}`}
        onMouseMove={hover.onMove}
        onMouseLeave={hover.onLeave}
        onKeyDown={hover.onKeyDown}
        onFocus={hover.onFocus}
        onBlur={hover.onBlur}
      >
        <AxisLabels
          dates={dates}
          min={min}
          max={max}
          height={height}
          formatValue={(value) => formatCompact(value, currency)}
        />
        {overlays.map((overlay) => (
          <path
            key={overlay.label}
            d={linePath(overlay.values, min, max, height)}
            fill="none"
            stroke={overlay.color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          d={linePath(closes, min, max, height)}
          fill="none"
          stroke={ACCENT}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {hover.index !== null && hovered && (
          <g>
            <line
              x1={xFor(hover.index, bars.length)}
              x2={xFor(hover.index, bars.length)}
              y1={PAD_TOP}
              y2={height - PAD_BOTTOM}
              stroke={MUTED}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={xFor(hover.index, bars.length)}
              cy={yFor(hovered.close, min, max, height)}
              r="4"
              fill={ACCENT}
              stroke={TEXT}
              strokeWidth="1"
            />
          </g>
        )}
      </svg>
      {hover.index !== null && hovered && (
        <Tooltip index={hover.index} count={bars.length}>
          <p className="font-medium text-dash-text">
            {formatFullDate(hovered.date)}
          </p>
          <p className="mt-1 text-dash-muted">
            Close{" "}
            <span className="text-dash-text">
              {formatPrice(hovered.close, currency)}
            </span>
          </p>
          {overlays.map((overlay) => {
            const value = overlay.values[hover.index!];
            if (value === null || value === undefined) return null;
            return (
              <p key={overlay.label} className="mt-0.5 text-dash-muted">
                {overlay.label}{" "}
                <span className="text-dash-text">
                  {formatPrice(value, currency)}
                </span>
              </p>
            );
          })}
        </Tooltip>
      )}
      {overlays.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-dash-muted">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-4 rounded-full"
              style={{ background: ACCENT }}
            />
            Close
          </span>
          {overlays.map((overlay) => (
            <span key={overlay.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4 rounded-full"
                style={{ background: overlay.color }}
              />
              {overlay.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RsiChart({
  values,
  dates,
}: {
  values: (number | null)[];
  dates: string[];
}) {
  const height = 160;
  const hover = useHoverIndex(values.length);
  const defined = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (defined.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-dash-muted">
        RSI needs at least 15 trading days of history.
      </p>
    );
  }
  const hovered = hover.index !== null ? (values[hover.index] ?? null) : null;
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full"
        role="img"
        tabIndex={0}
        aria-label={`RSI (14) chart, latest value ${defined[defined.length - 1]!.toFixed(1)}${hovered !== null && hover.index !== null ? `. Selected: ${formatFullDate(dates[hover.index]!)}, RSI ${hovered.toFixed(1)}` : ". Focus the chart and use the left and right arrow keys to inspect a day."}`}
        onMouseMove={hover.onMove}
        onMouseLeave={hover.onLeave}
        onKeyDown={hover.onKeyDown}
        onFocus={hover.onFocus}
        onBlur={hover.onBlur}
      >
        <AxisLabels
          dates={dates}
          min={0}
          max={100}
          height={height}
          formatValue={(value) => `${Math.round(value)}`}
        />
        {[30, 70].map((level) => (
          <line
            key={level}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yFor(level, 0, 100, height)}
            y2={yFor(level, 0, 100, height)}
            stroke={WARNING}
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}
        <path
          d={linePath(values, 0, 100, height)}
          fill="none"
          stroke={ACCENT}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {hover.index !== null && hovered !== null && (
          <g>
            <line
              x1={xFor(hover.index, values.length)}
              x2={xFor(hover.index, values.length)}
              y1={PAD_TOP}
              y2={height - PAD_BOTTOM}
              stroke={MUTED}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={xFor(hover.index, values.length)}
              cy={yFor(hovered, 0, 100, height)}
              r="4"
              fill={ACCENT}
              stroke={TEXT}
              strokeWidth="1"
            />
          </g>
        )}
      </svg>
      {hover.index !== null && hovered !== null && (
        <Tooltip index={hover.index} count={values.length}>
          <p className="font-medium text-dash-text">
            {formatFullDate(dates[hover.index]!)}
          </p>
          <p className="mt-1 text-dash-muted">
            RSI (14){" "}
            <span className="text-dash-text">{hovered.toFixed(1)}</span>
          </p>
        </Tooltip>
      )}
    </div>
  );
}

export function MacdChart({
  values,
  dates,
}: {
  values: (MacdPoint | null)[];
  dates: string[];
}) {
  const height = 180;
  const hover = useHoverIndex(values.length);
  const { min, max } = useMemo(() => {
    const all: number[] = [0];
    for (const point of values) {
      if (!point) continue;
      all.push(point.macd, point.signal, point.histogram);
    }
    let low = Math.min(...all);
    let high = Math.max(...all);
    const pad = (high - low || 1) * 0.1;
    return { min: low - pad, max: high + pad };
  }, [values]);
  const defined = values.filter((point): point is MacdPoint => point !== null);
  if (defined.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-dash-muted">
        MACD needs at least 35 trading days of history.
      </p>
    );
  }
  const macdLine = values.map((point) => point?.macd ?? null);
  const signalLine = values.map((point) => point?.signal ?? null);
  const zeroY = yFor(0, min, max, height);
  const barWidth = Math.max(
    1,
    ((WIDTH - PAD_LEFT - PAD_RIGHT) / values.length) * 0.6,
  );
  const hovered = hover.index !== null ? values[hover.index] : null;
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full"
        role="img"
        tabIndex={0}
        aria-label={`MACD (12, 26, 9) chart, latest MACD ${defined[defined.length - 1]!.macd.toFixed(2)}${hovered && hover.index !== null ? `. Selected: ${formatFullDate(dates[hover.index]!)}, MACD ${hovered.macd.toFixed(2)}, signal ${hovered.signal.toFixed(2)}` : ". Focus the chart and use the left and right arrow keys to inspect a day."}`}
        onMouseMove={hover.onMove}
        onMouseLeave={hover.onLeave}
        onKeyDown={hover.onKeyDown}
        onFocus={hover.onFocus}
        onBlur={hover.onBlur}
      >
        <AxisLabels
          dates={dates}
          min={min}
          max={max}
          height={height}
          formatValue={(value) => value.toFixed(1)}
        />
        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={zeroY}
          y2={zeroY}
          stroke={MUTED}
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {values.map((point, i) => {
          if (!point) return null;
          const x = xFor(i, values.length);
          const y = yFor(point.histogram, min, max, height);
          return (
            <rect
              key={i}
              x={x - barWidth / 2}
              y={Math.min(y, zeroY)}
              width={barWidth}
              height={Math.max(1, Math.abs(zeroY - y))}
              fill={point.histogram >= 0 ? ACCENT : MUTED}
              opacity={point.histogram >= 0 ? 0.9 : 0.55}
            />
          );
        })}
        <path
          d={linePath(macdLine, min, max, height)}
          fill="none"
          stroke={TEXT}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={linePath(signalLine, min, max, height)}
          fill="none"
          stroke={WARNING}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {hover.index !== null && hovered && (
          <line
            x1={xFor(hover.index, values.length)}
            x2={xFor(hover.index, values.length)}
            y1={PAD_TOP}
            y2={height - PAD_BOTTOM}
            stroke={MUTED}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
      </svg>
      {hover.index !== null && hovered && (
        <Tooltip index={hover.index} count={values.length}>
          <p className="font-medium text-dash-text">
            {formatFullDate(dates[hover.index]!)}
          </p>
          <p className="mt-1 text-dash-muted">
            MACD{" "}
            <span className="text-dash-text">{hovered.macd.toFixed(2)}</span>
          </p>
          <p className="mt-0.5 text-dash-muted">
            Signal{" "}
            <span className="text-dash-text">{hovered.signal.toFixed(2)}</span>
          </p>
          <p className="mt-0.5 text-dash-muted">
            Histogram{" "}
            <span className="text-dash-text">
              {hovered.histogram.toFixed(2)}
            </span>
          </p>
        </Tooltip>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-dash-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full"
            style={{ background: TEXT }}
          />
          MACD
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full"
            style={{ background: WARNING }}
          />
          Signal
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: ACCENT }}
          />
          Histogram
        </span>
      </div>
    </div>
  );
}
