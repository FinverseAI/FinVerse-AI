"use client";

import { useEffect } from "react";

/* Port of STUDY-BUDDY's kinetic.js trigger: an IntersectionObserver adds
   `.in` to each masked headline line and scroll-reveal element once it
   enters the viewport. Progressive enhancement only — without JavaScript
   the no-js CSS fallback keeps all text visible. Elements already in the
   viewport on mount (the hero) reveal immediately instead of waiting for
   the observer callback after hydration, so the first paint is never a
   blank hero. */
export default function LandingMotion() {
  useEffect(() => {
    const targets = document.querySelectorAll(".fv-mask, .fv-reveal");
    if (!targets.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((element) => element.classList.add("in"));
      return;
    }
    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    targets.forEach((element) => {
      // Already on screen (the hero): reveal at once instead of waiting
      // for the observer callback after hydration.
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        element.classList.add("in");
        return;
      }
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
