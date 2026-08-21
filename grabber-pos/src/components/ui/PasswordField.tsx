"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: string;
};

/** Accessible password input with show/hide toggle (44px hit target). */
export function PasswordField({
  label,
  hint,
  id,
  className = "",
  ...inputProps
}: Props) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label
        className="block text-sm font-medium text-text-body"
        htmlFor={fieldId}
      >
        {label}
      </label>
      <div className="relative mt-2">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          className="w-full rounded-2xl border border-line bg-surface-2 py-3 pe-12 ps-4 text-text-strong outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 end-0 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-e-2xl text-text-dim transition hover:text-text-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOffIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      {hint ? <p className="mt-1.5 text-xs text-text-dim">{hint}</p> : null}
    </div>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z"
      />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M9.88 9.88A2.75 2.75 0 0 0 12 14.75c.5 0 .97-.13 1.38-.36M6.53 6.53C4.4 7.86 2.8 9.9 2.25 12c0 0 3.75 6.75 9.75 6.75 1.7 0 3.22-.4 4.52-1.02M10.73 5.4A10.4 10.4 0 0 1 12 5.25c6 0 9.75 6.75 9.75 6.75a17.3 17.3 0 0 1-2.35 3.1"
      />
    </svg>
  );
}
