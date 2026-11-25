"use client";

export default function ProfileError({
  retry,
  reset,
  error,
}: {
  retry?: () => void;
  reset?: () => void;
  error?: Error & { status?: number; digest?: string };
}) {
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
          {unavailable
            ? "The account service is unavailable"
            : "Unable to load your financial profile"}
        </h1>
        <p className="text-sm text-dash-muted">
          {unavailable
            ? "FinVerse could not reach the account service. Your data is safe — please try again in a moment."
            : "Please check your connection and try again."}
        </p>
        <button className="dash-primary px-4 py-2" onClick={onRetry}>
          Try again
        </button>
      </section>
    </main>
  );
}
