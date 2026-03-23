"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  className,
}: {
  value?: number;
  className?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-foreground/10",
        className,
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
