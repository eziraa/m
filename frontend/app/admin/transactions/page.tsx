import { Suspense } from "react";
import TransactionTable from "@/components/admin/transactions/TransactionTable";
import TransactionStats from "@/components/admin/transactions/TransactionStats";
import { Loader2 } from "lucide-react";

export default function AdminTransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
      </div>

      {/* <TransactionStats /> */}

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <Suspense
          fallback={
            <div className="p-8 text-center text-muted-foreground">
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            </div>
          }
        >
          <TransactionTable />
        </Suspense>
      </div>
    </div>
  );
}
