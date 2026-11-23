// Stub for next/image: a plain img. The real component only adds
// optimisation and lazy loading, neither of which a render test needs.
import { createElement } from "react";

export default function Image({ src, alt, ...props }) {
  return createElement("img", { src, alt: alt ?? "", ...props });
}
