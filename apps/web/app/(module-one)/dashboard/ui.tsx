import type { ReactNode } from "react";
import type { Tone } from "./data";

const paths = {
  grid: "M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z",
  card: "M3 5h18v14H3z M3 10h18",
  chart: "M4 3v18h17 M8 16v-5 M13 16V6 M18 16V9",
  bulb: "M9 18h6 M10 21h4 M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2",
  wallet: "M20 8V5H5a2 2 0 0 0 0 4h16v11H5a2 2 0 0 1-2-2V7 M21 12h-5v4h5",
  file: "M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8 M8 16h8",
  user: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 18c1-5 13-5 14 0",
  search: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0 M15 15l5 5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
  plus: "M12 5v14 M5 12h14",
  pie: "M12 3v9h9 M9 3.5A9 9 0 1 0 20.5 15 M15 3.5a9 9 0 0 1 5.5 5.5H15z",
  filter: "M3 5h18 M6 12h12 M10 19h4",
  target:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0",
  pig: "M5 8 4 4l5 2c4-2 9 0 10 4h3v5h-3l-2 5h-3v-3H9v3H6l-2-5c-3-1-3-5-1-5 M15 9h.01 M10 3h4",
  calendar: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2",
  left: "m14 6-6 6 6 6",
  right: "m10 6 6 6-6 6",
  close: "m6 6 12 12 M6 18 18 6",
};
export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "size-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-inset min-w-0 border px-3 py-2.5">
      <p className="font-mono text-xs leading-4 tracking-widest text-dash-muted uppercase">
        {label}
      </p>
      <p className="mt-0.5 break-words font-mono text-xs font-medium text-dash-text">
        {value}
      </p>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  tone = "accent",
}: {
  value: number;
  label: string;
  tone?: Tone;
}) {
  return (
    <div
      className="progress-track overflow-hidden rounded-full"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(100, Math.max(0, Math.round(value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-current transition-[width] duration-300 motion-reduce:transition-none"
        data-tone={tone}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PanelHeading({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-7 flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide">
        <Icon name={icon} className="size-4 text-dash-accent" />
        {title}
      </h2>
      {children}
    </div>
  );
}
