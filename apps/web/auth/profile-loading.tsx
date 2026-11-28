export default function ProfileLoading({
  label = "Loading your financial profile...",
}: {
  label?: string;
}) {
  return (
    <main
      className="dashboard grid min-h-screen place-items-center bg-dash-bg p-5 text-dash-text"
      role="status"
    >
      <div className="dash-panel flex items-center gap-3 p-6">
        <span
          aria-hidden="true"
          className="size-4 rounded-full border-2 border-dash-border border-t-dash-accent motion-safe:animate-spin"
        />
        {label}
      </div>
    </main>
  );
}
