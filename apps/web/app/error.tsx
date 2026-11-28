"use client";

import StatusScreen from "../components/status-screen";
import { useEffect } from "react";

export default function ErrorPage({
  retry,
  reset,
  error,
}: {
  retry?: () => void;
  reset?: () => void;
  error?: Error & { digest?: string };
}) {
  useEffect(() => {
    if (error) console.error("FinVerse page failed", error.digest ?? error);
  }, [error]);
  return (
    <StatusScreen
      label="Something went wrong"
      title="We could not load this page."
      action={
        <button className="dash-primary" onClick={retry ?? reset}>
          Try again
        </button>
      }
    >
      <p role="alert">
        Please try again. If the problem continues, return home and reopen your
        dashboard.
      </p>
      {error?.digest && (
        <p className="font-mono text-xs">Reference {error.digest}</p>
      )}
    </StatusScreen>
  );
}
