import { Suspense } from "react";
import TransactionTable from "@/components/admin/transactions/TransactionTable";
import TransactionStats from "@/components/admin/transactions/TransactionStats";

export default function AdminTransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        {/* Action buttons could go here */}
      </div>

      <TransactionStats />

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <Suspense
          fallback={
            <div className="p-8 text-center text-muted-foreground">
              Loading transactions...
            </div>
          }
        >
          <TransactionTable />
        </Suspense>
      </div>
    </div>
  );
}
