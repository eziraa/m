"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableContainerProps {
  children: ReactNode;
  className?: string;
}

export function TableContainer({
  children,
  className,
}: TableContainerProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto overflow-y-auto custom-scrollbar",
        className,
      )}
    >
      {children}
    </div>
  );
}
