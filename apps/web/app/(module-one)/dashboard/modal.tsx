"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./ui";

export function Modal({
  title,
  onClose,
  children,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-busy={busy}
      className="dashboard glass-dialog fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto border p-6 text-dash-text sm:p-8"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (!busy && event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <button
          type="button"
          className="dash-icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
