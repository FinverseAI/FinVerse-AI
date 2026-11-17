import Link from "next/link";
import type { ReactNode } from "react";

export default function StatusScreen({
  label,
  title,
  children,
  action,
}: {
  label: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-dash-bg p-5 text-dash-text">
      <section className="dash-panel w-full max-w-form space-y-5 p-8">
        <p className="dash-eyebrow text-dash-accent">{label}</p>
        <h1 className="text-title font-medium tracking-tight">{title}</h1>
        <div className="text-sm leading-7 text-dash-muted">{children}</div>
        <div className="flex flex-wrap gap-3">
          {action}
          <Link href="/" className="dash-small-button">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
