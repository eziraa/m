"use client";

import { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FilterSortModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onApply: () => void;
  onReset: () => void;
  applyLabel?: string;
  resetLabel?: string;
  triggerLabel?: string;
  children: ReactNode;
}

export function FilterSortModal({
  open,
  onOpenChange,
  title,
  description,
  onApply,
  onReset,
  applyLabel = "Apply",
  resetLabel = "Reset",
  triggerLabel = "Filter ",
  children,
}: FilterSortModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="min-h-[44px] gap-2 rounded-lg px-4 text-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">{children}</div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={onReset}
          >
            {resetLabel}
          </Button>
          <Button type="button" className="min-h-[44px]" onClick={onApply}>
            {applyLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
