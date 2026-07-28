"use client";

import { type ReactNode, type RefObject, useEffect, useId, useRef } from "react";

type Props = {
  id: string;
  title: string;
  open: boolean;
  size?: "compact" | "medium" | "full";
  triggerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function MobileSheet({
  id,
  title,
  open,
  size = "medium",
  triggerRef,
  children,
  footer,
  onClose,
}: Props) {
  const generatedId = useId();
  const titleId = `${id}-${generatedId}-title`;
  const panelRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) triggerRef?.current?.focus();
      wasOpenRef.current = false;
      return;
    }

    wasOpenRef.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const firstControl = panel?.querySelector<HTMLElement>(
      "[data-mobile-sheet-initial], button:not(.mobile-sheet-close), a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    (firstControl ?? panel)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open, triggerRef]);

  if (!open) return null;

  return (
    <div className="mobile-sheet-layer">
      <button
        className="mobile-sheet-backdrop"
        data-testid="mobile-sheet-backdrop"
        type="button"
        aria-label={`Close ${title}`}
        onClick={onClose}
      />
      <section
        ref={panelRef}
        className={`mobile-sheet mobile-sheet-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="mobile-sheet-handle" aria-hidden="true" />
        <header className="mobile-sheet-header">
          <h2 id={titleId}>{title}</h2>
          <button className="mobile-sheet-close" type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button>
        </header>
        <div className="mobile-sheet-body">{children}</div>
        {footer && <footer className="mobile-sheet-footer">{footer}</footer>}
      </section>
    </div>
  );
}
