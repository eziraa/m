"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const agentNavItems = [
  { label: "Dashboard", href: "/agent", icon: LayoutDashboard },
  { label: "Sessions", href: "/agent/sessions", icon: Activity },
  { label: "Players", href: "/agent/players", icon: Users },
];

export function AgentBottomNav() {
  const pathname = usePathname() || "";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 flex justify-center w-full">
      <div className="w-full max-w-100 bg-background/80 backdrop-blur-lg border-t border-white/5 pb-safe">
        <nav className="flex items-center justify-around h-16 px-2">
          {agentNavItems.map((item) => {
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
