"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowRightLeft,
  Users,
  Wallet,
  Activity,
  Landmark,
  ArrowLeft,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Rooms",
      href: "/admin/rooms",
      icon: Activity,
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
      label: "Payments",
      href: "/admin/payments",
      icon: Landmark,
    },

    {
      label: "Withdrawals",
      href: "/admin/withdrawals",
      icon: Wallet,
    },
  ];

  return (
    <div
      className={cn(
        "hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 border-r bg-sidebar text-sidebar-foreground z-40",
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
            const isActive = pathname?.startsWith(item.href);

            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border"
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

      {/* Back to App */}
      <div className="border-t px-2 py-3">
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 transition-colors text-muted-foreground group-hover:text-foreground" />
          Back to App
        </Link>
      </div>
    </div>
  );
}
