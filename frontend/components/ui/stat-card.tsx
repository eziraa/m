import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <h3 className="text-2xl font-bold">{value}</h3>
            </div>
          </div>
          {trend !== undefined && (
            <div className={cn(
              "text-xs font-semibold px-2 py-1 rounded-full",
              trend >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
