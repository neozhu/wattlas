"use client";

import { useEffect, useRef } from "react";

type Props = {
  width: number;
  min: number;
  max: number;
  onChange: (width: number) => void;
  onCommit?: (width: number) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function InspectorResizer({ width, min, max, onChange, onCommit }: Props) {
  const drag = useRef<{ startX: number; startWidth: number; currentWidth: number } | null>(null);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      const next = clamp(drag.current.startWidth + drag.current.startX - event.clientX, min, max);
      drag.current.currentWidth = next;
      onChange(next);
    };
    const stop = () => {
      if (drag.current) onCommit?.(drag.current.currentWidth);
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [max, min, onChange, onCommit]);

  return <div
    className="inspector-resizer"
    role="separator"
    aria-label="Resize details panel"
    aria-orientation="vertical"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={width}
    tabIndex={0}
    onPointerDown={(event) => {
      drag.current = { startX: event.clientX, startWidth: width, currentWidth: width };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }}
    onKeyDown={(event) => {
      const commit = (next: number) => { onChange(next); onCommit?.(next); };
      if (event.key === "ArrowLeft") { event.preventDefault(); commit(clamp(width + 16, min, max)); }
      if (event.key === "ArrowRight") { event.preventDefault(); commit(clamp(width - 16, min, max)); }
      if (event.key === "Home") { event.preventDefault(); commit(min); }
      if (event.key === "End") { event.preventDefault(); commit(max); }
    }}
  />;
}
