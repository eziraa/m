"use client";

import * as React from "react";

export function Calendar({
  selected,
  onSelect,
}: {
  mode?: "single";
  selected?: Date;
  onSelect?: (date?: Date) => void;
  initialFocus?: boolean;
}) {
  const value = selected ? selected.toISOString().slice(0, 16) : "";

  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(event) => {
        const next = event.target.value ? new Date(event.target.value) : undefined;
        onSelect?.(next);
      }}
      className="rounded-md border bg-background px-3 py-2 text-sm"
    />
  );
}
