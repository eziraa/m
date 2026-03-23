"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Save, Sparkles } from "lucide-react";
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

export default function AdminWelcomeBonusPage() {
  const t = useTranslations("admin.bonuses");
  const {
    data: bonusesData,
    isLoading: settingsLoading,
    refetch,
  } = useGetAdminBonusesQuery();
  const [updateBonus, { isLoading: saving }] = useUpdateAdminBonusMutation();

  const [welcomeAmount, setWelcomeAmount] = useState("");
  const [welcomeDescription, setWelcomeDescription] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [welcomeActive, setWelcomeActive] = useState(true);

  useEffect(() => {
    if (!bonusesData?.bonuses?.length) return;
    const welcome = bonusesData.bonuses.find(
      (item) => item.slug === "welcome_bonus",
    );

    if (welcome) {
      setWelcomeAmount(String(welcome.amount ?? ""));
      setWelcomeDescription(welcome.description || "");
      setWelcomeMessage(welcome.message || "");
      setWelcomeActive(Boolean(welcome.isActive));
    }
  }, [bonusesData]);

  const handleSaveWelcome = async () => {
    try {
      await updateBonus({
        slug: "welcome_bonus",
        amount: Number(welcomeAmount),
        description: welcomeDescription,
        message: welcomeMessage,
        isActive: welcomeActive,
      }).unwrap();
      toast.success(t("toast.welcomeSaved"));
    } catch (error: any) {
      toast.error(error?.data?.error || t("toast.welcomeFailed"));
    }
  };

  return (
    <AdminBonusesShell onRefresh={refetch} isRefreshing={settingsLoading}>
      <Card className="bg-white/5 border-white/10 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white/60">
            {t("welcome.title")}
          </h2>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          {t("welcome.description")}
        </p>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-xs font-bold text-white">{t("fields.active")}</p>
            <p className="text-[10px] text-white/40">
              {t("fields.activeHint")}
            </p>
          </div>
          <Switch checked={welcomeActive} onCheckedChange={setWelcomeActive} />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
            {t("welcome.amountLabel")}
          </label>
          <Input
            value={welcomeAmount}
            onChange={(event) => setWelcomeAmount(event.target.value)}
            placeholder={t("welcome.amountPlaceholder")}
            className="h-12 rounded-2xl bg-white/5 border-white/10 text-sm"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
            {t("fields.description")}
          </label>
          <Textarea
            value={welcomeDescription}
            onChange={(event) => setWelcomeDescription(event.target.value)}
            placeholder={t("fields.descriptionPlaceholder")}
            className="min-h-[88px] rounded-2xl bg-white/5 border-white/10 text-sm"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">
            {t("welcome.messageLabel")}
          </label>
          <Textarea
            value={welcomeMessage}
            onChange={(event) => setWelcomeMessage(event.target.value)}
            placeholder={t("welcome.messagePlaceholder")}
            className="min-h-[96px] rounded-2xl bg-white/5 border-white/10 text-sm"
          />
          <p className="text-[10px] text-white/35">
            {t("welcome.messageHint")}
          </p>
        </div>
        <Button
          onClick={handleSaveWelcome}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-primary text-foreground font-black shadow-lg shadow-primary/20"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? t("actions.saving") : t("actions.saveWelcome")}
        </Button>
      </Card>
    </AdminBonusesShell>
  );
}
