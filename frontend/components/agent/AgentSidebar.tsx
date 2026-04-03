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
  CreditCard,
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function AgentSidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Rooms",
      href: "/agent/rooms",
      icon: Activity,
    },
    {
      label: "Transactions",
      href: "/agent/transactions",
      icon: ArrowRightLeft,
    },
    {
      label: "Users",
      href: "/agent/users",
      icon: Users,
    },
    {
      label: "Payments",
      href: "/agent/payments",
      icon: Landmark,
    },
    {
      label: "Pay details",
      href: "/agent/payment-methods",
      icon: CreditCard,
    },
    {
      label: "Withdrawals",
      href: "/agent/withdrawals",
      icon: Wallet,
    },
  ];

  return (
    <div
      className={cn(
        "z-40 flex h-full w-64 flex-col border-r bg-background text-foreground",
        className,
      )}
    >
      <div className="flex h-16 items-center border-b px-6">
        <Link
          href="/agent"
          onClick={onNavigate}
          className="flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <span className="text-2xl text-primary">A</span>
          <span>Bingo Agent</span>
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
          href="/"
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          Back to App
        </Link>
      </div>
    </div>
  );
}
