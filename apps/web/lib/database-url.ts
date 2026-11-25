export function databaseUrl(value: string | undefined) {
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Validated once here, at startup, with a clear message — a malformed
    // DATABASE_URL used to throw an opaque TypeError from `new URL` at
    // import time and crash every route importing the auth server with
    // an unexplained 500.
    throw new Error(
      "DATABASE_URL is not a valid database URL. Check the value set for DATABASE_URL.",
    );
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) return value;
  for (const [key, fallback] of Object.entries({
    connection_limit: "5",
    pool_timeout: "15",
    connect_timeout: "20",
  })) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, fallback);
  }
  return url.toString();
}
