"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Gift, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetAdminBonusesQuery,
  useUpdateAdminBonusMutation,
} from "@/lib/api";
import { AdminBonusesShell } from "@/components/admin/bonuses/AdminBonusesShell";

export default function AdminBonusSettingsPage() {
  const t = useTranslations("admin.bonuses");
  const {
    data: bonusesData,
    isLoading: settingsLoading,
    refetch,
  } = useGetAdminBonusesQuery();
  const [updateBonus, { isLoading: saving }] = useUpdateAdminBonusMutation();

  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusDescription, setBonusDescription] = useState("");
  const [bonusMessage, setBonusMessage] = useState("");
  const [bonusActive, setBonusActive] = useState(true);

  useEffect(() => {
    if (!bonusesData?.bonuses?.length) return;
    const bonus = bonusesData.bonuses.find((item) => item.slug === "bonus");

    if (bonus) {
      setBonusAmount(String(bonus.amount ?? ""));
      setBonusDescription(bonus.description || "");
      setBonusMessage(bonus.message || "");
      setBonusActive(Boolean(bonus.isActive));
    }
  }, [bonusesData]);

  const handleSaveBonus = async () => {
    try {
      await updateBonus({
        slug: "bonus",
        amount: Number(bonusAmount),
        description: bonusDescription,
        message: bonusMessage,
        isActive: bonusActive,
      }).unwrap();
      toast.success(t("toast.bonusSaved"));
    } catch (error: any) {
      toast.error(error?.data?.error || t("toast.bonusFailed"));
    }
  };

  return (
    <AdminBonusesShell onRefresh={refetch} isRefreshing={settingsLoading}>
      <Card className="bg-white/5 border-white/10 rounded-3xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
            {t("bonus.title")}
          </h2>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          {t("bonus.description")}
        </p>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-xs font-bold text-white">{t("fields.active")}</p>
            <p className="text-[10px] text-white/40">
              {t("fields.activeHint")}
            </p>
          </div>
          <Switch checked={bonusActive} onCheckedChange={setBonusActive} />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
            {t("bonus.amountLabel")}
          </label>
          <Input
            value={bonusAmount}
            onChange={(event) => setBonusAmount(event.target.value)}
            placeholder={t("bonus.amountPlaceholder")}
            className="h-12 rounded-2xl bg-white/5 border-white/10 text-sm"
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
            {t("fields.description")}
          </label>
          <Textarea
            value={bonusDescription}
            onChange={(event) => setBonusDescription(event.target.value)}
            placeholder={t("fields.descriptionPlaceholder")}
            className="min-h-[88px] rounded-2xl bg-white/5 border-white/10 text-sm"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
            {t("bonus.messageLabel")}
          </label>
          <Textarea
            value={bonusMessage}
            onChange={(event) => setBonusMessage(event.target.value)}
            placeholder={t("bonus.messagePlaceholder")}
            className="min-h-[96px] rounded-2xl bg-white/5 border-white/10 text-sm"
          />
          <p className="text-[10px] text-white/35">
            {t("bonus.messageHint", {
              name: "{{name}}",
              amount: "{{amount}}",
            })}
          </p>
        </div>

        <Button
          onClick={handleSaveBonus}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-black shadow-lg shadow-emerald-500/30"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? t("actions.saving") : t("actions.saveBonus")}
        </Button>
      </Card>
    </AdminBonusesShell>
  );
}
