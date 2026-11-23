// Stub for next/headers. The render tests never call these (the modules
// that use them are stubbed at a higher level); if one ever is called it
// fails loudly instead of silently returning the wrong thing.
export async function headers() {
  throw new Error("next/headers is not available in render tests");
}

export async function cookies() {
  throw new Error("next/headers is not available in render tests");
}
