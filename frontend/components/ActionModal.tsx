"use client";

import { useEffect } from "react";

export function ActionModal({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  return (
    <div
      className="action-modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className={`action-modal admin-card${wide ? " action-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="action-modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="action-modal-close"
            onClick={() => {
              if (!busy) onClose();
            }}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="action-modal-body">{children}</div>
      </div>
    </div>
  );
}
