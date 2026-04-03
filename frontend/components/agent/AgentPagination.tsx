"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AgentPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
  pageSizeOptions?: number[];
  summaryText: string;
  perPageLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  renderPageSizeOption?: (size: number) => ReactNode;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function AgentPagination({
  page,
  pageSize,
  total,
  totalPages,
  pageSizeOptions = [10, 20, 50, 100],
  summaryText,
  perPageLabel = "Per page:",
  previousLabel = "Prev",
  nextLabel = "Next",
  renderPageSizeOption,
  onPageChange,
  onPageSizeChange,
  className,
}: AgentPaginationProps) {
  const resolvedTotalPages = totalPages ?? Math.max(1, Math.ceil(total / pageSize));

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="text-sm text-muted-foreground">{summaryText}</div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{perPageLabel}</span>
          <select
            value={pageSize}
            onChange={(event) => {
              onPageSizeChange(Number(event.target.value));
              onPageChange(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {renderPageSizeOption ? renderPageSizeOption(size) : size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            {previousLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= resolvedTotalPages}
            onClick={() => onPageChange(Math.min(resolvedTotalPages, page + 1))}
          >
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
