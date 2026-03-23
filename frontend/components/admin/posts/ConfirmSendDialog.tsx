"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Send, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConfirmSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  target?: "users" | "channel";
}

export function ConfirmSendDialog({
  open,
  onOpenChange,
  onConfirm,
  target = "users",
}: ConfirmSendDialogProps) {
  const t = useTranslations("admin.confirmSend");
  const isChannel = target === "channel";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-foreground/10 max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Send className="w-6 h-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-base font-bold text-center">
            {isChannel ? t("title.channel") : t("title.users")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground text-center">
            {isChannel ? t("description.channel") : t("description.users")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{isChannel ? t("warning.channel") : t("warning.users")}</span>
        </div>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel className="text-xs rounded-xl flex-1">
            {t("actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex-1 gap-1.5"
            onClick={onConfirm}
          >
            <Send className="w-3.5 h-3.5" />
            {t("actions.sendNow")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
