"use client";

import {
  Gamepad2,
  Settings,
  User,
  Wallet,
  History,
  LayoutDashboard,
  ArrowLeft,
  Activity,
  ArrowRightLeft,
  Users,
  Landmark,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth.provider";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const t = useTranslations("bottomNav");

  const isAgent = user?.role === "AGENT" || user?.role === "ADMIN";

  let navItems = [
    { label: t("play"), href: "/", icon: Gamepad2 },
    { label: t("wallet"), href: "/wallet", icon: Wallet },
    { label: t("profile"), href: "/profile", icon: User },
    { label: t("settings"), href: "/settings", icon: Settings },
    ...(isAgent
      ? [{ label: "Dashboard", href: "/agent/rooms", icon: LayoutDashboard }]
      : []),
  ];

  const agentNavItems = [
    { label: "Back", href: "/", icon: ArrowLeft },
    { label: "Rooms", href: "/agent/rooms", icon: Activity },
    {
      label: "Transactions",
      href: "/agent/transactions",
      icon: ArrowRightLeft,
    },
    { label: "Users", href: "/agent/users", icon: Users },
    { label: "Payments", href: "/agent/payments", icon: Landmark },
    { label: "Withdrawals", href: "/agent/withdrawals", icon: Wallet },
  ];

  if (!user) return null;

  if (pathname.includes("game")) return null;
  if (pathname.startsWith("/agent")) navItems = agentNavItems;

  return (
    <div
      className={
        "fixed bottom-2 left-0 right-0 z-50 px-4  flex justify-center pointer-events-none" +
        (pathname.startsWith("/agent") ? " md:hidden" : "")
      }
    >
      <div className="relative w-full max-w-[440px] flex items-center justify-between bg-zinc-950/80 backdrop-blur-3xl border border-white/5 rounded-[32px] px-2 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
        {/* Active Background Notch/Glow (Simulated) */}
        <div className="absolute inset-0 rounded-[32px] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-linear-to-b from-white/2 to-transparent" />
        </div>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
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
                  layoutId="activeCircle"
                  className="absolute -top-8 size-14 bg-blue-600 rounded-full flex flex-col  p-2 items-center justify-center shadow-[0_8px_20px_rgba(37,99,235,0.4)] z-20"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                >
                  <div className="absolute inset-0 rounded-full bg-linear-to-b from-white/20 to-transparent pointer-events-none" />
                  <Icon size={24} className="text-white" strokeWidth={2.5} />

                  {/* Label */}
                  <span
                    className={cn(
                      "text-[10px] font-bold mt-1 transition-all duration-300 tracking-tight",
                      isActive ? "text-white " : "text-zinc-500",
                    )}
                  >
                    {item.label}
                  </span>
                  {/* Outer Glow */}
                  <div className="absolute -inset-2 rounded-full bg-blue-500/20 blur-md -z-10 animate-pulse" />
                </motion.div>
              )}

              {/* Inactive Icon or Spacing for Active */}
              <div
                className={cn(
                  "transition-all duration-300 flex flex-col items-center",
                  isActive ? "opacity-0 scale-50" : "opacity-100 scale-100",
                )}
              >
                <Icon
                  size={22}
                  strokeWidth={2}
                  className="text-zinc-500 group-hover:text-zinc-300 transition-colors"
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-bold mt-1 transition-all duration-300 tracking-tight",
                  isActive
                    ? "hidden "
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
