"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked = false,
  onCheckedChange,
  className,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "inline-flex h-4 w-4 items-center justify-center rounded border border-foreground/20 bg-background text-primary",
        checked && "bg-primary text-primary-foreground",
        className,
      )}
    >
      {checked ? <Check className="h-3 w-3" /> : null}
    </button>
  );
}
