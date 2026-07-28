"use client";

import { type ReactNode, useId } from "react";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function MobileDetailSheet({ open, title, children, onClose }: Props) {
  const generatedId = useId();
  const titleId = `mobile-detail-${generatedId}`;
  const label = `${title} details`;
  return (
    <>
      {open && <button className="mobile-detail-backdrop" type="button" aria-label={`Dismiss ${label}`} onClick={onClose} />}
      <section
        className={open ? "mobile-detail-shell open" : "mobile-detail-shell"}
        {...(open ? { role: "dialog", "aria-modal": true, "aria-labelledby": titleId } : {})}
      >
        <div className="mobile-detail-handle" aria-hidden="true" />
        <div className="mobile-detail-header">
          <h2 id={titleId}>{label}</h2>
          <button type="button" aria-label={`Close ${label}`} onClick={onClose}>×</button>
        </div>
        {children}
      </section>
    </>
  );
}
