// Stub for next/link: a plain anchor. The real Link only adds prefetching
// and client-side navigation, neither of which a render test needs.
import { createElement } from "react";

export default function Link({ href, children, ...props }) {
  return createElement("a", { href, ...props }, children);
}
