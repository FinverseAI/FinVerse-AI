// Stub for next/navigation. redirect() throws the same digest-shaped error
// the real one throws, so tests can assert the destination; the router
// methods are no-ops that record nothing.
const noop = () => {};
const asyncNoop = async () => {};

export function useRouter() {
  return {
    push: noop,
    replace: noop,
    refresh: noop,
    back: noop,
    forward: noop,
    prefetch: asyncNoop,
  };
}

export function usePathname() {
  return "/";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function redirect(url) {
  const error = new Error(`NEXT_REDIRECT;replace;${url};307;`);
  error.digest = `NEXT_REDIRECT;replace;${url};307;`;
  throw error;
}

export function notFound() {
  const error = new Error("NEXT_NOT_FOUND");
  error.digest = "NEXT_NOT_FOUND";
  throw error;
}
