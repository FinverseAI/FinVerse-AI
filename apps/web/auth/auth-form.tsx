"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "./client";

type AuthMode = "login" | "sign-up";

const copy = {
  login: {
    eyebrow: "Welcome back",
    title: "Log in to FinVerse.",
    description: "Continue to your personal finance workspace with Google.",
    alternateText: "New to FinVerse?",
    alternateLabel: "Create an account",
    alternateHref: "/auth/sign-up",
  },
  "sign-up": {
    eyebrow: "Get started",
    title: "Create your FinVerse account.",
    description:
      "Use your Google account to start your personal finance workspace.",
    alternateText: "Already have an account?",
    alternateLabel: "Log in",
    alternateHref: "/auth/login",
  },
} as const;

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.19-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.91A6.01 6.01 0 0 1 6.1 12c0-.66.12-1.3.31-1.91V7.5H3.07A10 10 0 0 0 2 12c0 1.61.38 3.13 1.07 4.5l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.87C16.95 2.96 14.7 2 12 2a10 10 0 0 0-8.93 5.5l3.34 2.59C7.2 7.73 9.4 5.97 12 5.97Z"
      />
    </svg>
  );
}

export default function AuthForm({
  mode,
  googleAuthEnabled,
}: {
  mode: AuthMode;
  googleAuthEnabled: boolean;
}) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");
  const content = copy[mode];

  async function signInWithGoogle() {
    setSignInError("");
    setIsSigningIn(true);

    try {
      const { data, error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
        disableRedirect: true,
        fetchOptions: { timeout: 15000 },
      });

      if (error) {
        setSignInError(
          "Google sign-in is unavailable right now. Please try again.",
        );
        setIsSigningIn(false);
        return;
      }

      if (!data?.url) {
        setSignInError(
          "Google sign-in is unavailable right now. Please try again.",
        );
        setIsSigningIn(false);
        return;
      }

      window.location.assign(data.url);
    } catch {
      setSignInError(
        "Could not connect to the sign-in service. Refresh the page and try again.",
      );
      setIsSigningIn(false);
    }
  }

  return (
    <main className="landing-page grid min-h-screen place-items-center px-5 py-10 text-dash-text">
      <section className="w-full max-w-form">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="brand-mark grid size-10 place-items-center text-lg">
            F
          </span>
          FinVerse
        </Link>

        <div className="dash-panel dash-highlight auth-card">
          <p className="finance-panel-title text-dash-muted">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 text-title leading-tight font-medium tracking-tight">
            {content.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-dash-muted">
            {content.description}
          </p>

          <button
            className="google-signin mt-8 flex h-14 w-full items-center justify-center gap-3 border border-dash-border text-sm font-medium text-dash-text transition-colors enabled:hover:border-dash-accent/60 enabled:hover:bg-dash-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            disabled={!googleAuthEnabled || isSigningIn}
            onClick={signInWithGoogle}
          >
            <GoogleMark />
            {isSigningIn ? "Connecting to Google..." : "Continue with Google"}
          </button>

          {signInError ? (
            <p
              role="alert"
              className="mt-4 text-center text-xs leading-5 text-dash-red"
            >
              {signInError}
            </p>
          ) : (
            <p className="mt-4 text-center text-xs leading-5 text-dash-muted">
              {googleAuthEnabled
                ? "Continue securely with your Google account."
                : "Sign-in is currently unavailable. Please try again later."}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-dash-muted">
          {content.alternateText}{" "}
          <Link
            className="text-dash-accent hover:underline"
            href={content.alternateHref}
          >
            {content.alternateLabel}
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-dash-muted">
          <Link className="text-dash-accent hover:underline" href="/">
            ← Back to home
          </Link>
        </p>
      </section>
    </main>
  );
}
