"use client";

import { Key, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Users, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetAdminUsersQuery,
  useGrantAdminBonusMutation,
  useGetAdminBonusesQuery,
} from "@/lib/api";
import { AdminBonusesShell } from "@/components/admin/bonuses/AdminBonusesShell";

export default function AdminGrantBonusPage() {
  const t = useTranslations("admin.bonuses");
  const {
    data: bonusesData,
    isLoading: settingsLoading,
    refetch,
  } = useGetAdminBonusesQuery();
  const { data: usersData } = useGetAdminUsersQuery();
  const [grantBonus, { isLoading: granting }] = useGrantAdminBonusMutation();
  const users = usersData?.users ?? [];

  const [grantAmount, setGrantAmount] = useState("");
  const [grantMessage, setGrantMessage] = useState("");
  const [grantAll, setGrantAll] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (!bonusesData?.bonuses?.length) return;
    const bonus = bonusesData.bonuses.find((item) => item.slug === "bonus");

    if (bonus) {
      const amountValue = String(bonus.amount ?? "");
      if (!grantAmount) {
        setGrantAmount(amountValue);
      }
      if (!grantMessage) {
        setGrantMessage(bonus.message || "");
      }
    }
  }, [bonusesData, grantAmount, grantMessage]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user: { username: string; firstName: string; email: string }) => {
        return (
          user.username?.toLowerCase().includes(query) ||
          user.firstName?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
        );
      },
    );
  }, [users, userSearch]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleGrantBonus = async () => {
    try {
      if (!grantAll && selectedUserIds.length === 0) {
        toast.error(t("errors.selectUsers"));
        return;
      }

      const amountValue = grantAmount.trim() ? Number(grantAmount) : undefined;

      await grantBonus({
        target: grantAll
          ? "all"
          : selectedUserIds.length > 1
            ? "users"
            : "user",
        userId: grantAll ? undefined : selectedUserIds[0],
        userIds: grantAll ? undefined : selectedUserIds,
        amount: amountValue,
        message: grantMessage.trim() ? grantMessage.trim() : undefined,
      }).unwrap();

      toast.success(grantAll ? t("toast.grantedAll") : t("toast.grantedOne"));
      if (!grantAll) {
        setSelectedUserIds([]);
      }
    } catch (error: any) {
      toast.error(error?.data?.error || t("toast.grantFailed"));
    }
  };

  const selectedLabel = selectedUserIds.length
    ? t("bonus.userSelected", { count: selectedUserIds.length })
    : t("bonus.userSelectPlaceholder");

  return (
    <AdminBonusesShell onRefresh={refetch} isRefreshing={settingsLoading}>
      <Card className="bg-white/5 border-white/10 rounded-3xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-white/50" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
            {t("bonus.title")}
          </h2>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          {t("bonus.description")}
        </p>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-white/50" />
            <div>
              <p className="text-xs font-bold text-white">
                {t("bonus.grantAll")}
              </p>
              <p className="text-[10px] text-white/40">
                {t("bonus.grantAllHint", {
                  count: usersData?.total ?? users.length,
                })}
              </p>
            </div>
          </div>
          <Switch
            checked={grantAll}
            onCheckedChange={(checked) => {
              setGrantAll(checked);
              if (checked) {
                setSelectedUserIds([]);
              }
            }}
          />
        </div>

        {!grantAll && (
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
              {t("bonus.userSearch")}
            </label>
            <Input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder={t("bonus.userSearchPlaceholder")}
              className="h-12 rounded-2xl bg-white/5 border-white/10 text-sm"
            />
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
                {t("bonus.userSelect")}
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-sm justify-between text-white/80 hover:text-white"
                  >
                    <span className="truncate">{selectedLabel}</span>
                    <User className="h-4 w-4 text-white/50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 w-[320px]">
                  {filteredUsers.map(
                    (user: {
                      username: string;
                      firstName: string;
                      email: string;
                      id: string;
                    }) => {
                      const label =
                        user.username ||
                        user.firstName ||
                        user.email ||
                        user.id;
                      return (
                        <DropdownMenuCheckboxItem
                          key={user.id}
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          className="text-white"
                        >
                          {label}
                        </DropdownMenuCheckboxItem>
                      );
                    },
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
            {t("bonus.grantAmountLabel")}
          </label>
          <Input
            value={grantAmount}
            onChange={(event) => setGrantAmount(event.target.value)}
            placeholder={t("bonus.grantAmountPlaceholder")}
            className="h-12 rounded-2xl bg-white/5 border-white/10 text-sm"
          />
          <p className="text-[10px] text-white/35">
            {t("bonus.grantAmountHint")}
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
            {t("bonus.grantMessageLabel")}
          </label>
          <Textarea
            value={grantMessage}
            onChange={(event) => setGrantMessage(event.target.value)}
            placeholder={t("bonus.grantMessagePlaceholder")}
            className="min-h-[96px] rounded-2xl bg-white/5 border-white/10 text-sm"
          />
          <p className="text-[10px] text-white/35">
            {t("bonus.grantMessageHint")}
          </p>
        </div>

        <Button
          onClick={handleGrantBonus}
          disabled={granting}
          className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/30"
        >
          {granting ? t("actions.granting") : t("actions.grant")}
        </Button>
      </Card>
    </AdminBonusesShell>
  );
}
