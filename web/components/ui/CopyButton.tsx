"use client";

import { useState } from "react";

interface Props {
  value: string;
  label?: string;
  className?: string;
}

/** Inline copy affordance; flips to a check for ~1.2s after a successful copy. */
export function CopyButton({ value, label, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1 text-muted transition-colors hover:text-ink ${className}`}
      aria-label={label ?? "Copy"}
      title={copied ? "Copied" : "Copy"}
    >
      <span className={copied ? "text-log" : ""}>{copied ? "copied ✓" : "copy"}</span>
    </button>
  );
}
