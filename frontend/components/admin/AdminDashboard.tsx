"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  FileText,
  Gift,
  LayoutGrid,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

import {
  useGetAdminRoomsQuery,
  useGetAdminUsersQuery,
  useGetAdminWithdrawalsQuery,
  useGetGameConfigQuery,
  useGetPostsQuery,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function DashboardMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {helper}
      </CardContent>
    </Card>
  );
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return "Default value";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminDashboard() {
  const usersQuery = useGetAdminUsersQuery({ page: 1, pageSize: 1 });
  const withdrawalsQuery = useGetAdminWithdrawalsQuery({
    page: 1,
    pageSize: 1,
    status: "pending",
  });
  const postsQuery = useGetPostsQuery({ page: 1, pageSize: 1 });
  const roomsQuery = useGetAdminRoomsQuery({ page: 1, pageSize: 1 });
  const configQuery = useGetGameConfigQuery();

  const managementCards = [
    {
      title: "Posts",
      description: "Create broadcasts, manage deliveries, and review scheduled sends.",
      href: "/admin/posts",
      icon: FileText,
    },
    {
      title: "Users",
      description: "Review members, promote agents, and manage admin access.",
      href: "/admin/admin-users",
      icon: Users,
    },
    {
      title: "Rooms",
      description: "Inspect available rooms and verify live game setup.",
      href: "/admin/rooms",
      icon: LayoutGrid,
    },
    {
      title: "Bonuses",
      description: "Adjust welcome credit and run bonus campaigns.",
      href: "/admin/bonuses/welcome",
      icon: Gift,
    },
    {
      title: "Withdrawals",
      description: "Approve or reject payout requests waiting on admin review.",
      href: "/admin/withdrawals",
      icon: Wallet,
    },
    {
      title: "Game Settings",
      description: "Update runtime config values for rewards, fees, and timers.",
      href: "/admin/game-config",
      icon: Settings,
    },
  ];

  const recentConfigs = (configQuery.data?.configs ?? []).slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Badge variant="outline" className="w-fit">
          Admin dashboard
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight">Operations Overview</h1>
        <p className="max-w-3xl text-muted-foreground">
          Use this dashboard as the control center for content, users, rooms, withdrawals, and runtime settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          label="Users"
          value={String(usersQuery.data?.total ?? 0)}
          helper="Total accounts available for support and role management."
        />
        <DashboardMetric
          label="Pending withdrawals"
          value={String(withdrawalsQuery.data?.total ?? 0)}
          helper="Requests currently waiting for an approval decision."
        />
        <DashboardMetric
          label="Posts"
          value={String(postsQuery.data?.total ?? 0)}
          helper="Published and draft broadcast posts in the system."
        />
        <DashboardMetric
          label="Rooms"
          value={String(roomsQuery.data?.total ?? 0)}
          helper="Configured game rooms currently available to manage."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Management</CardTitle>
            <CardDescription>
              Jump directly into the admin sections you use most often.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {managementCards.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} className="block">
                  <Card className="h-full border-border/70 transition-colors hover:border-primary/40 hover:bg-muted/30">
                    <CardHeader className="gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-base">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Config Snapshot</CardTitle>
                <CardDescription>
                  Recent runtime settings exposed on the admin dashboard.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/game-config">Manage</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {configQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))
            ) : recentConfigs.length > 0 ? (
              recentConfigs.map((config) => (
                <div
                  key={config.key}
                  className="rounded-xl border border-border/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {config.key}
                      </div>
                    </div>
                    <Badge variant="outline">{config.value}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{config.description}</span>
                    <span className="whitespace-nowrap">{formatUpdatedAt(config.updatedAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No runtime settings are available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <CardTitle>Admin workflow</CardTitle>
          </div>
          <CardDescription>
            A simple sequence for daily admin operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-muted/40 p-4 text-sm">
            Review pending withdrawals and user requests before starting room operations.
          </div>
          <div className="rounded-xl bg-muted/40 p-4 text-sm">
            Confirm bonus values, service charge, and session timing in game settings.
          </div>
          <div className="rounded-xl bg-muted/40 p-4 text-sm">
            Publish or schedule posts once operations and rewards are up to date.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
