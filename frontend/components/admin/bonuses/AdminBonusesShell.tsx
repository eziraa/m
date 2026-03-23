"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Gift, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BottomAdminNav } from "@/components/admin/posts/BottomAdminNav";

interface AdminBonusesShellProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminBonusesShell({
  children,
  onRefresh,
  isRefreshing,
}: AdminBonusesShellProps) {
  const t = useTranslations("admin.bonuses");
  const pathname = usePathname();

  const tabs = [
    { key: "welcome", href: "/admin/bonuses/welcome" },
    { key: "bonus", href: "/admin/bonuses/bonus" },
    { key: "grant", href: "/admin/bonuses/grant" },
  ];

  return (
    <div className="bg-background min-h-svh h-screen max-h-screen overflow-y-auto custom-scrollbar transition-colors duration-500">
      <div className="w-full max-w-[430px] mx-auto min-h-svh bg-[#0f111a] text-white pb-28 relative overflow-x-hidden">
        <div className="fixed inset-0 z-0 opacity-[0.04] pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 3px 3px, rgba(255,255,255,0.15) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <header className="relative z-10 px-6 pt-10 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  {t("title")}
                </h1>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-white"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 p-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={cn(
                    "flex-1 text-center text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl py-2 transition-colors",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white",
                  )}
                >
                  {t(`tabs.${tab.key}`)}
                </Link>
              );
            })}
          </div>
        </header>

        <div className="relative z-10 px-6 space-y-6">{children}</div>

        <BottomAdminNav />
      </div>
    </div>
  );
}
