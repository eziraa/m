"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface SchedulePickerProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const t = useTranslations("admin.schedulePicker");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-foreground/70">
        {t("label")}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs border-foreground/20 bg-foreground/5"
          >
            {value ? format(value, "PPP p") : t("immediate")}
            <CalendarIcon className="w-3 h-3 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={(date) => {
              onChange(date ?? null);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
