"use client";

import { cn } from "@/lib/utils";
import { PostStatus } from "@/lib/types";
import { useTranslations } from "next-intl";

interface PostFiltersProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function PostFilters({
  activeStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
}: PostFiltersProps) {
  const t = useTranslations("admin.postFilters");
  const statusFilters = [
    { label: t("status.all"), value: "all" },
    { label: t("status.draft"), value: "draft" },
    { label: t("status.scheduled"), value: "scheduled" },
    { label: t("status.sending"), value: "sending" },
    { label: t("status.sent"), value: "sent" },
    { label: t("status.failed"), value: "failed" },
  ];
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-10 pl-10 pr-4 text-sm bg-foreground/5 border border-foreground/10 rounded-xl outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => onStatusChange(filter.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200",
              activeStatus === filter.value
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
