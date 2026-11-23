// Stub for next/dynamic. A server render never resolves the lazy import
// synchronously, so the stub renders the loading fallback when one was
// given and nothing otherwise — the same first paint the real component
// produces before its chunk arrives.
import { createElement } from "react";

export default function dynamic(_loader, options = {}) {
  const Loading = options.loading;
  return function DynamicStub(props) {
    return Loading ? createElement(Loading, props) : null;
  };
}
