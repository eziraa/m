"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  House,
  FileText,
  ArrowRightLeft,
  Users,
  Settings,
  LayoutGrid,
  Gift,
  Wallet,
  Clock3,
  BarChart3,
  ChevronLeft,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function AdminSidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: House,
    },
    {
      label: "Posts",
      href: "/admin/posts",
      icon: FileText,
    },
    {
      label: "Transactions",
      href: "/admin/transactions",
      icon: ArrowRightLeft,
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
      label: "Bonuses",
      href: "/admin/bonuses",
      icon: Gift,
    },
    {
      label: "Withdrawals",
      href: "/admin/withdrawals",
      icon: Wallet,
    },
    {
      label: "Scheduled",
      href: "/admin/scheduled",
      icon: Clock3,
    },
    {
      label: "Deliveries",
      href: "/admin/delivery-log",
      icon: BarChart3,
    },
    {
      label: "Game Config",
      href: "/admin/game-config",
      icon: Settings,
    },
  ];

  return (
    <div
      className={cn(
        "h-full w-64 flex-col border-r bg-background text-foreground z-40",
        className,
      )}
    >
      <div className="flex h-16 items-center border-b px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-bold text-xl tracking-tight"
        >
          <span className="text-primary text-2xl">⚡</span>
          <span>Bingo Admin</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-2">
          {navItems.map((item, index) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={index}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <Link
          href="/rooms"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Game
        </Link>
      </div>
    </div>
  );
}
