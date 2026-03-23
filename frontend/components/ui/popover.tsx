"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PopoverContext = React.createContext<{
  open: boolean;
  setOpen: (value: boolean) => void;
} | null>(null);

export function Popover({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <PopoverContext.Provider value={{ open, setOpen: onOpenChange }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) {
  const context = React.useContext(PopoverContext);
  if (!context) return children;

  return React.cloneElement(children, {
    onClick: () => context.setOpen(!context.open),
  });
}

export function PopoverContent({
  className,
  align,
  children,
}: {
  className?: string;
  align?: "start" | "center" | "end";
  children: React.ReactNode;
}) {
  const context = React.useContext(PopoverContext);
  if (!context?.open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 rounded-md border bg-background p-3 shadow-lg",
        align === "end" && "right-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
