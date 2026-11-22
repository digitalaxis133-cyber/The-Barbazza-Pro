"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "action" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  action: "btn-action",
  danger: "btn-logout",
};

export function BusyButton({
  busy = false,
  variant = "primary",
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  variant?: Variant;
}) {
  const base = VARIANT_CLASS[variant];
  const processing = busy ? " btn-processing" : "";
  return (
    <button
      type={type}
      className={`${base}${processing}${className ? ` ${className}` : ""}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
