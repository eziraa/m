"use client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApproveDepositMutation } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";

type DepositFormValues = {
  amount: string;
  sms: string;
  promoCode?: string;
};

export function DepositForm() {
  const { user } = useAuth();
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<"telebirr" | "cbe">("telebirr");
  const t = useTranslations("depositForm");

  const submitDepositSchema = useMemo(
    () =>
      z.object({
        amount: z
          .string()
          .min(1, t("errors.amountRequired"))
          .refine((val) => Number(val) >= 1, {
            message: t("errors.minimumDeposit"),
          }),
        sms: z.string().min(10, t("errors.smsRequired")),
        promoCode: z
          .string()
          .max(64, t("errors.promoTooLong"))
          .optional()
          .or(z.literal("")),
      }),
    [t],
  );

  const [approveDeposit] = useApproveDepositMutation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DepositFormValues>({
    resolver: zodResolver(submitDepositSchema),
  });

  const onSubmit = async (data: DepositFormValues) => {
    setLoading(true);
    try {
      const normalizedPromoCode = data.promoCode?.trim()
        ? data.promoCode.trim().toUpperCase()
        : undefined;

      const res = await approveDeposit({
        amount: +data.amount,
        sms_content: data.sms,
        user_id: user?.id || "",
        promoCode: normalizedPromoCode,
      }).unwrap();

      if (res.success) {
        toast.success(t("toast.approved", { amount: res.payment.amount }));
        reset();
      } else {
        toast.error(res.message || t("errors.approveFailed"));
      }
    } catch (error) {
      toast.error(t("errors.invalidSms"));
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (data: { sms: string }) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms_content: data.sms }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(t("toast.submitted"));
        reset();
      } else {
        toast.error(result.error || t("errors.submitFailed"));
      }
    } catch (error) {
      toast.error(t("errors.network"));
    }
    setLoading(false);
  };

  const handleCopy = () => {
    const valueToCopy = isCbe ? "1000485490478" : "0935878383";
    navigator.clipboard.writeText(valueToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1200);
  };

  const isCbe = useMemo(() => channel === "cbe", [channel]);

  return (
    <Card className="bg-[#050816] border border-[#111827] rounded-2xl p-0 w-full text-foreground shadow-xl shadow-black/40">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 p-4"
      >
        <div className="flex flex-col gap-1 ">
          <h2 className="text-xl font-semibold text-foreground/70 tracking-wide">
            {t("title")}
          </h2>
          <p className="text-[11px] text-foreground/40 font-medium">
            {t("subtitle")}
          </p>
        </div>

        {/* Channel Toggle */}
        <div className="flex rounded-2xl bg-[#020617] p-1 text-xs font-semibold text-foreground/60">
          <button
            type="button"
            onClick={() => setChannel("telebirr")}
            className={`flex-1 py-1.5 rounded-2xl transition-all ${
              !isCbe
                ? "bg-[#111827] text-foreground shadow-inner shadow-black/40"
                : "text-foreground/40"
            }`}
          >
            {t("channels.telebirr")}
          </button>
          <button
            type="button"
            onClick={() => setChannel("cbe")}
            className={`flex-1 py-1.5 rounded-2xl transition-all ${
              isCbe
                ? "bg-[#111827] text-foreground shadow-inner shadow-black/40"
                : "text-foreground/40"
            }`}
          >
            {t("channels.cbe")}
          </button>
        </div>

        {/* Account Card */}
        <div className="relative rounded-2xl bg-linear-to-r from-blue-500 to-blue-600 p-4 overflow-hidden">
          <div className="absolute -right-10 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col gap-2">
            <div className="text-[10px] font-semibold tracking-wide text-indigo-100/80">
              {t("account.ownerLabel")}
            </div>
            <div className="text-sm font-semibold text-white">
              {isCbe ? "Muluken Kasawmar" : "Muluken Kasawmar"}
            </div>

            <div className=" flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-indigo-100/80 font-medium">
                  {t("account.numberLabel")}
                </span>
                <span className="text-base font-semibold tracking-[0.16em] text-white">
                  {isCbe ? "1000 4854 904 78" : "09 35 87 83 83"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={copySuccess}
                className="inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 transition-colors p-2"
                aria-label={t("account.copy")}
              >
                {copySuccess ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={2} />
                ) : (
                  <Copy className="w-4 h-4 text-white" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[11px] font-medium text-foreground/60">
            {t("amount.label")}
          </label>
          <div className="flex items-center gap-2  bg-[#020617]  px-3 py-2.5">
            <Input
              placeholder={t("amount.placeholder")}
              type="number"
              autoComplete="off"
              {...register("amount")}
              className="  bg-transparent p-3 rounded-[12px] leading-[150%] border border-blue-600/50  font-semibold  focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
            />
            <span className="ml-auto text-[11px] font-semibold text-foreground/50">
              {t("amount.currency")}
            </span>
          </div>
          {errors.amount && (
            <span className="text-[11px] text-destructive mt-0.5">
              {errors.amount.message}
            </span>
          )}
        </div>

        {/* SMS */}
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[11px] font-medium text-foreground/60">
            {t("promo.label")}
          </label>
          <Input
            placeholder={t("promo.placeholder")}
            autoComplete="off"
            maxLength={64}
            {...register("promoCode")}
            className="bg-[#020617] p-3 rounded-[12px] leading-[150%] border border-blue-600/50 font-semibold uppercase focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
          />
          <p className="text-[10px] text-foreground/45">{t("promo.hint")}</p>
          {errors.promoCode && (
            <span className="text-[11px] text-destructive mt-0.5">
              {errors.promoCode.message}
            </span>
          )}
        </div>

        {/* SMS */}
        <div className="flex flex-col gap-1 mt-1">
          <label className="text-[11px] font-medium text-foreground/60">
            {t("sms.label")}
          </label>
          <Textarea
            placeholder={t("sms.placeholder")}
            autoComplete="off"
            {...register("sms")}
            className="min-h-[96px] text-sm font-medium bg-[#020617] border border-blue-600/50 rounded-md resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {errors.sms && (
            <span className="text-[11px] text-destructive mt-0.5">
              {errors.sms.message}
            </span>
          )}
        </div>

        <Button
          className="mt-1 w-full rounded-xl text-sm font-semibold h-11 bg-blue-600/90 hover:bg-blue-600 text-white shadow-lg shadow-indigo-500/30"
          variant="default"
          type="submit"
          disabled={isSubmitting || loading}
        >
          {loading ? t("cta.loading") : t("cta.submit")}
        </Button>

        <p className="mt-1 text-[10px] leading-relaxed text-foreground/40">
          {t("notice")}
        </p>
      </form>
    </Card>
  );
}
