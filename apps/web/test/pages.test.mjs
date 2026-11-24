import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { renderToString } from "react-dom/server";

await register("./tsx-loader.mjs", import.meta.url);

// The profile guard is stubbed (see ./stubs/profile-guard.mjs): signed in
// with a completed profile everywhere except the auth destination, where
// it returns null. These tests prove each page passes the guard result to
// the right component; the guard's own redirect behaviour is covered by
// the live probes (unauthenticated pages redirect to /auth/login).
const LandingPageRoute = (await import("../app/(module-one)/page.tsx")).default;
const AuthRoute = (await import("../app/(module-one)/auth/page.tsx")).default;
const LoginRoute = (await import("../app/(module-one)/auth/login/page.tsx"))
  .default;
const SignUpRoute = (await import("../app/(module-one)/auth/sign-up/page.tsx"))
  .default;
const OnboardingPage = (await import("../app/(module-one)/onboarding/page.tsx"))
  .default;
const DashboardPage = (await import("../app/(module-one)/dashboard/page.tsx"))
  .default;
const MarketPage = (await import("../app/(module-two)/market/page.tsx"))
  .default;
const StockPageModule =
  await import("../app/(module-two)/market/stock/[symbol]/page.tsx");
const StockPage = StockPageModule.default;

function render(element) {
  return renderToString(element).replaceAll("<!-- -->", "");
}

test("the landing page renders the hero", async () => {
  const html = render(await LandingPageRoute());
  assert.match(html, /Your money\./);
  assert.match(html, /Made clear\./);
});

test("the bare /auth route redirects to sign-up", () => {
  assert.throws(
    () => AuthRoute(),
    (error) => {
      assert.equal(error.digest, "NEXT_REDIRECT;replace;/auth/sign-up;307;");
      return true;
    },
  );
});

test("the login page renders the login form with Google enabled", async () => {
  const html = render(await LoginRoute());
  assert.match(html, /Log in to FinVerse\./);
  assert.match(html, /Continue with Google/);
});

test("the sign-up page renders the sign-up form", async () => {
  const html = render(await SignUpRoute());
  assert.match(html, /Create your FinVerse account\./);
  assert.match(html, /Continue with Google/);
});

test("the onboarding page greets the signed-in user by name", async () => {
  const html = render(await OnboardingPage());
  assert.match(html, /What should we call you\?/);
  assert.match(html, /value="Test User"/);
});

test("the dashboard page renders the dashboard for the signed-in user", async () => {
  const html = render(await DashboardPage());
  for (const section of [
    "Monthly income",
    "Recent Transactions",
    "Upcoming Bills",
    "Investment readiness",
    "Ask FinVerse AI",
  ]) {
    assert.ok(html.includes(section), `expected the page to show ${section}`);
  }
});

test("the market page renders the market sections", async () => {
  const html = render(await MarketPage());
  assert.match(html, /Market overview/);
  assert.match(html, /Benchmarks/);
  assert.match(html, /Loading stock prices and technical indicators…/);
});

test("the stock page uppercases the symbol and renders its profile", async () => {
  const html = render(
    await StockPage({ params: Promise.resolve({ symbol: "reliance" }) }),
  );
  assert.match(html, /Loading RELIANCE…/);
  assert.match(
    html,
    /Explore RELIANCE: price performance, technical signals, and the stories behind the stock\./,
  );
});

test("the stock page metadata uses the uppercased symbol", async () => {
  const metadata = await StockPageModule.generateMetadata({
    params: Promise.resolve({ symbol: "tcs" }),
  });
  assert.equal(metadata.title, "TCS");
  assert.match(metadata.description, /TCS/);
});
