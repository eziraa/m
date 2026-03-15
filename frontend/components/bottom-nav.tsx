"use client";

import {
  Activity,
  Gamepad2,
  Settings,
  User,
  Users2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AgentBottomNav } from "@/components/agent/agent-bottom-nav";
import { useTranslations } from "next-intl";

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname() || " ";
  const t = useTranslations("bottomNav");

  const navItems = [
    {
      label: t("play"),
      href: "/rooms",
      icon: Gamepad2,
    },
    {
      label: t("wallet"),
      href: "/wallet",
      icon: Wallet,
    },
    {
      label: t("profile"),
      href: "/profile",
      icon: User,
    },
    {
      label: t("settings"),
      href: "/settings",
      icon: Settings,
    },
  ];

  const agentNavItems = [
    {
      label: "Agent",
      href: "/agent",
      icon: Activity,
    },
  ];

  if (!user) return null;

  const isAgent = user.role === "AGENT";
  if (pathname.startsWith("/agent")) {
    return <AgentBottomNav />;
  }

  const allNavItems = isAgent ? [...navItems, ...agentNavItems] : navItems;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 flex justify-center w-full">
      <div className="w-full max-w-100 bg-background/80 backdrop-blur-lg border-t border-white/5 pb-safe">
        <nav className="flex items-center justify-around h-16 px-2">
          {allNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/10",
                  )}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
