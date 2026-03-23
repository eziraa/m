"use client";

import {
  FileText,
  Clock,
  BarChart3,
  ChevronLeft,
  Gift,
  Wallet,
  ListTodo,
  Users,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function BottomAdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname() || "";
  const navItems = [
    {
      label: t("posts"),
      href: "/admin/posts",
      icon: FileText,
    },
    {
      label: t("scheduled"),
      href: "/admin/scheduled",
      icon: Clock,
    },
    {
      label: t("analytics"),
      href: "/admin/delivery-log",
      icon: BarChart3,
    },
    {
      label: t("bonuses"),
      href: "/admin/bonuses",
      icon: Gift,
    },
    {
      label: t("withdrawals"),
      href: "/admin/withdrawals",
      icon: Wallet,
    },
    {
      label: t("transactions"),
      href: "/admin/transactions",
      icon: ListTodo,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Rooms",
      href: "/admin/rooms",
      icon: LayoutGrid,
    },
    {
      label: t("gameConfig"),
      href: "/admin/game-config",
      icon: BarChart3,
    },
    {
      label: t("back"),
      href: "/rooms",
      icon: ChevronLeft, // Clear "Back to Game" action
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center w-full">
      <div className="w-full max-w-100 bg-background/80 backdrop-blur-xl border-t border-white/5 pb-safe">
        <nav className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin/posts"
                ? pathname === "/admin/posts" ||
                  pathname.startsWith("/admin/posts/")
                : item.href === "/admin/users"
                  ? pathname.startsWith("/admin/users") ||
                    pathname.startsWith("/admin/admin-users")
                : item.href === "/admin/rooms"
                  ? pathname.startsWith("/admin/rooms") ||
                    pathname.startsWith("/admin/admin-rooms")
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-all duration-200",
                    isActive && "bg-primary/10 scale-110",
                  )}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span
                  className={cn(
                    "text-[10px] transition-all duration-200",
                    isActive ? "font-bold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
