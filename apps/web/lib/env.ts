import "server-only";

function configuredUrl(name: "BETTER_AUTH_URL" | "BACKEND_URL", local: string) {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required in production.`);
  }
  let url: URL;
  try {
    url = new URL(value || local);
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL.`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(`${name} must be an HTTP(S) URL without credentials.`);
  }
  if (
    name === "BETTER_AUTH_URL" &&
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  }
  return url;
}

export function webOrigin() {
  return configuredUrl("BETTER_AUTH_URL", "http://localhost:3000").origin;
}
export function backendUrl() {
  return configuredUrl("BACKEND_URL", "http://localhost:3001");
}
