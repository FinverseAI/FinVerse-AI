"use client";

import StatusScreen from "../components/status-screen";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <StatusScreen
      label="Something went wrong"
      title="We could not load this page."
      action={
        <button className="dash-primary" onClick={retry}>
          Try again
        </button>
      }
    >
      <p role="alert">
        Please try again. If the problem continues, return home and reopen your
        workspace.
      </p>
    </StatusScreen>
  );
}
