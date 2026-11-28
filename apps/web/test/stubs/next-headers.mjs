// API calls that require incoming headers use a separate request harness.
export async function headers() {
  throw new Error("next/headers is not available in render tests");
}

export async function cookies() {
  return { get: () => undefined };
}
