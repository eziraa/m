"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRightLeft,
  Users,
  Wallet,
  Activity,
  Landmark,
} from "lucide-react";

const adminNavItems = [
  { label: "Back", href: "/", icon: ArrowLeft },
  { label: "Rooms", href: "/admin/rooms", icon: Activity },
  { label: "Transactions", href: "/admin/transactions", icon: ArrowRightLeft },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Payments", href: "/admin/payments", icon: Landmark },
  { label: "Withdrawals", href: "/admin/withdrawals", icon: Wallet },
];

export function AdminBottomNav() {
  const pathname = usePathname() || "";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none md:hidden">
      <div className="relative w-full max-w-[480px] flex items-center justify-between bg-zinc-950/80 backdrop-blur-3xl border border-white/5 rounded-[32px] px-1.5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
        {/* Subtle top highlight */}
        <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-linear-to-b from-white/2 to-transparent" />
        </div>

        {adminNavItems.map((item) => {
          const isBack = item.href === "/";
          const isActive =
            !isBack &&
            (pathname === item.href || pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-full group py-1"
            >
              {/* Active Indicator Circle */}
              {isActive && (
                <motion.div
                  layoutId="adminActiveCircle"
                  className="absolute -top-8 size-14 bg-blue-600 rounded-full flex flex-col p-2 items-center justify-center shadow-[0_8px_20px_rgba(37,99,235,0.4)] z-20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                >
                  <div className="absolute inset-0 rounded-full bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                  <span className="text-[9px] font-bold mt-0.5 text-white tracking-tight">
                    {item.label}
                  </span>
                  <div className="absolute -inset-2 rounded-full bg-blue-500/20 blur-md -z-10 animate-pulse" />
                </motion.div>
              )}

              {/* Inactive / Back icon */}
              <div
                className={cn(
                  "transition-all duration-300 flex flex-col items-center",
                  isActive ? "opacity-0 scale-50" : "opacity-100 scale-100",
                )}
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  className={cn(
                    "transition-colors",
                    isBack
                      ? "text-zinc-400 group-hover:text-white"
                      : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[9px] font-bold mt-1 transition-all duration-300 tracking-tight",
                  isActive
                    ? "hidden"
                    : isBack
                      ? "text-zinc-400 group-hover:text-zinc-300"
                      : "text-zinc-500 group-hover:text-zinc-400",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
