"use client";

import { useEffect } from "react";

// Only content below the initial viewport receives a scroll entrance.
export default function LandingMotion() {
  useEffect(() => {
    const targets = document.querySelectorAll(".fv-reveal");
    if (!targets.length) return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("waiting");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    targets.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight) return;
      element.classList.add("waiting");
      observer.observe(element);
    });
    return () => {
      observer.disconnect();
      targets.forEach((element) => element.classList.remove("waiting"));
    };
  }, []);
  return null;
}
