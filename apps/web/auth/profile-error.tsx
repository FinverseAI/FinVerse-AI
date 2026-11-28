"use client";

import Link from "next/link";
import { useEffect } from "react";

export type RouteErrorProps = {
  retry?: () => void;
  reset?: () => void;
  error?: Error & { status?: number; digest?: string };
};

export default function ProfileError({
  retry,
  reset,
  error,
  title = "Unable to load your financial profile",
  backHref = "/",
  backLabel = "Back to home",
}: RouteErrorProps & {
  title?: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    if (error) console.error("FinVerse route failed", error.digest ?? error);
  }, [error]);
  // A backend outage reaches this boundary as the 503 ProfileApiError
  // from getServerProfile (B57). The error's message survives the
  // server-to-client boundary; its custom `status` may not, so the
  // service-unavailable state is keyed on the message, not the status.
  const unavailable =
    error?.status === 503 ||
    (typeof error?.message === "string" &&
      error.message.includes("unavailable"));
  const onRetry = retry ?? reset ?? (() => window.location.reload());
  return (
    <main className="dashboard grid min-h-screen place-items-center bg-dash-bg p-5 text-dash-text">
      <section className="dash-panel max-w-lg space-y-4 p-7" role="alert">
        <h1 className="text-xl font-semibold">
          {unavailable ? "The account service is unavailable" : title}
        </h1>
        <p className="text-sm text-dash-muted">
          {unavailable
            ? "FinVerse could not reach the account service. Your data is safe — please try again in a moment."
            : "Please check your connection and try again."}
        </p>
        {error?.digest && (
          <p className="font-mono text-xs text-dash-muted">
            Reference {error.digest}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button className="dash-primary px-4 py-2" onClick={onRetry}>
            Try again
          </button>
          <Link href={backHref} className="dash-small-button px-4 py-2">
            {backLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
