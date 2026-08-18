"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { springSnappy } from "@/lib/motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-[0_4px_14px_-4px_color-mix(in_oklch,var(--accent)_55%,transparent)] hover:bg-accent-strong hover:shadow-[0_6px_18px_-4px_color-mix(in_oklch,var(--accent)_65%,transparent)] disabled:opacity-60 disabled:shadow-none",
  secondary:
    "border border-line bg-surface-2/80 text-text-strong backdrop-blur-sm hover:border-accent hover:text-accent",
  ghost:
    "border border-line text-text-dim hover:border-accent hover:text-accent hover:bg-surface-2/40",
  danger:
    "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
};

const SIZE: Record<Size, string> = {
  sm: "min-h-9 rounded-[10px] px-2.5 py-1.5 text-xs",
  md: "min-h-10 rounded-[14px] px-4 py-2.5 text-sm",
  lg: "min-h-11 rounded-[14px] px-5 py-3 text-sm font-semibold",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const { disabled, onDrag, onDragStart, onDragEnd, onAnimationStart, ...buttonRest } =
    rest;

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={reduced || disabled ? undefined : { scale: 0.97 }}
      transition={springSnappy}
      className={`inline-flex items-center justify-center font-semibold transition duration-150 ease-out disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...buttonRest}
    >
      {children}
    </motion.button>
  );
}
