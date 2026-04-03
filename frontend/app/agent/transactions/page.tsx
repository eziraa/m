import { Suspense } from "react";
import TransactionTable from "@/components/agent/transactions/TransactionTable";
import { Loader2 } from "lucide-react";

import { useTranslations } from "next-intl";

export default function AgentTransactionsPage() {
  const t = useTranslations("agent.nav");
  return (
    <div className="flex flex-col gap-4 px-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("transactions")}
        </h1>
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
