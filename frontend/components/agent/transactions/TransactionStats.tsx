"use client";

import { useGetAgentTransactionStatsQuery } from "@/lib/api";
import {
  Loader2,
  Gift,
  TrendingUp,
  Wallet,
  Archive,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export default function TransactionStats() {
  const { data: stats, isLoading, error } = useGetAgentTransactionStatsQuery();

  if (isLoading)
    return (
      <div className="w-full h-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  if (error) return <div className="text-destructive">Error loading stats</div>;
  if (!stats) return <div>No stats found.</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total Deposits"
        value={`${stats.totalDeposit.toLocaleString()} ETB`}
        icon={Wallet}
        trend={12} // Mock trend for now
        className=""
      />
      <StatCard
        label="Total Withdrawals"
        value={`${(stats.totalWithdrawal || 0).toLocaleString()} ETB`}
        icon={Archive}
        trend={-5}
        className=""
      />
      <StatCard
        label="Net Profit"
        value={`${stats.netProfit.toLocaleString()} ETB`}
        icon={TrendingUp}
        trend={8.5}
        className=""
      />
      <StatCard
        label="Total Bonus"
        value={`${stats.totalBonus.toLocaleString()} ETB`}
        icon={Gift}
      />

      {/* Total Bonus */}
      <StatCard
        label="Total Commission"
        value={`${stats.totalCommission.toLocaleString()} ETB`}
        icon={Gift}
      />

      <StatCard
        label="Total Reward"
        value={`${stats.totalReward.toLocaleString()} ETB`}
        icon={Gift}
      />

      {/* Total referalBonus */}
      <StatCard
        label="Total Referral Bonus"
        value={`${stats.totalReferralReward.toLocaleString()} ETB`}
        icon={Gift}
      />
      {/* 
       // Keeping these simpler cards for secondary stats if needed, or removing them to clean up.
       // For now, let's focus on the main 4 financial KPIs above.
       // We can add a secondary row for others later if requested.
       */}
    </div>
  );
}
