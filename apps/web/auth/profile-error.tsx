"use client";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <main className="dashboard grid min-h-screen place-items-center bg-dash-bg p-5 text-dash-text">
      <section className="dash-panel max-w-lg space-y-4 p-7" role="alert">
        <h1 className="text-xl font-semibold">
          Unable to load your financial profile
        </h1>
        <p className="text-sm text-dash-muted">
          Please check your connection and try again.
        </p>
        <button className="dash-primary px-4 py-2" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
