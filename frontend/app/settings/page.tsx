"use client";

import { useAuth } from "@/providers/auth.provider";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import {
  Volume2,
  Music,
  Vibrate,
  Bell,
  Monitor,
  Moon,
  Shield,
  LogOut,
  Trash2,
  ChevronRight,
  Sun,
  Laptop,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLogoutMutation } from "@/lib/api";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n/config";
import { setLocaleCookie, setStoredLocale } from "@/lib/i18n/locale";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [logout, { isLoading: logoutLoading }] = useLogoutMutation();
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();

  // Mount handling to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!user) return null;

  async function handleLogout() {
    try {
      // Call logout endpoint (which handles localStorage.removeItem("auth_token"))
      await logout(undefined).unwrap();

      // Redirect to login
      window.location.href = "/login";
    } catch (err) {
      // Even if logout endpoint fails, clear local state and redirect
      localStorage.removeItem("auth_token");
      toast.error(t("logoutFailed"));
      window.location.href = "/login";
    }
  }

  function handleLanguageChange(value: string) {
    if (value === locale) return;
    const nextLocale = value as Locale;
    setStoredLocale(nextLocale);
    setLocaleCookie(nextLocale);
    // Get current path without locale prefix
    const path = window.location.pathname;
    const pathWithoutLocale = path.replace(/^\/(en|am)(\/|$)/, "/");
    // Navigate to the same path with new locale
    router.push(`/${nextLocale}${pathWithoutLocale}${window.location.search}`);
  }

  const sections = [
    {
      title: t("sections.audio.title"),
      items: [
        {
          icon: <Volume2 size={18} />,
          label: t("sections.audio.soundEffects.label"),
          desc: t("sections.audio.soundEffects.desc"),
          type: "switch",
          default: true,
          color: "text-blue-400",
        },
        {
          icon: <Music size={18} />,
          label: t("sections.audio.backgroundMusic.label"),
          desc: t("sections.audio.backgroundMusic.desc"),
          type: "switch",
          default: false,
          color: "text-purple-400",
        },
        {
          icon: <Vibrate size={18} />,
          label: t("sections.audio.haptics.label"),
          desc: t("sections.audio.haptics.desc"),
          type: "switch",
          default: true,
          color: "text-orange-400",
        },
      ],
    },
    {
      title: t("sections.notifications.title"),
      items: [
        {
          icon: <Bell size={18} />,
          label: t("sections.notifications.gameInvites.label"),
          desc: t("sections.notifications.gameInvites.desc"),
          type: "switch",
          default: true,
          color: "text-green-400",
        },
        {
          icon: <Monitor size={18} />,
          label: t("sections.notifications.push.label"),
          desc: t("sections.notifications.push.desc"),
          type: "switch",
          default: true,
          color: "text-cyan-400",
        },
      ],
    },
    // {
    //   title: "Appearance",
    //   items: [
    //     {
    //       icon: <Moon size={18} />,
    //       label: "Theme",
    //       desc: "Choose your preferred appearance",
    //       type: "theme-select",
    //       color: "text-white",
    //     },
    //   ],
    // },
  ];

  return (
    <div className="max-w-[90%] mx-auto  pb-12 px-4 flex flex-col flex-1">
      <div className="mb-6 pt-6">
        <h1 className="text-3xl font-black tracking-tight ">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-8 ">
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
              {section.title}
            </h3>
            <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
              {section.items.map((item, i) => (
                <div key={item.label}>
                  <div className="p-2  flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg bg-white/5 ${item.color}`}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    {item.type === "switch" ? (
                      <Switch defaultChecked={(item as any).default} />
                    ) : item.type === "theme-select" && mounted ? (
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger className="w-35 h-8 text-xs">
                          <SelectValue placeholder={t("theme.placeholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2">
                              <Sun size={14} /> Light
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2">
                              <Moon size={14} /> Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2">
                              <Laptop size={14} /> System
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <ChevronRight size={18} />
                      </Button>
                    )}
                  </div>
                  {i < section.items.length - 1 && (
                    <div className="h-px bg-white/5 mx-4" />
                  )}
                </div>
              ))}
            </Card>
          </div>
        ))}

        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
            {t("language.title")}
          </h3>
          <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-white/5 text-blue-400">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="font-bold text-sm">{t("language.label")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("language.desc")}
                  </div>
                </div>
              </div>
              <Select value={locale} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-35 h-8 text-xs">
                  <SelectValue placeholder={t("language.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("language.options.en")}</SelectItem>
                  <SelectItem value="am">{t("language.options.am")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>

        <div className="space-y-4 pt-4 hidden">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
            {t("account.title")}
          </h3>
          <Card className="bg-red-500/5 border-red-500/20 backdrop-blur-md overflow-hidden">
            <div
              className="p-4 flex items-center justify-between hover:bg-red-500/10 transition-colors cursor-pointer"
              onClick={handleLogout}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <LogOut size={18} />
                </div>
                <div>
                  <div className="font-bold text-sm text-red-100">
                    {t("account.logout.label")}
                  </div>
                  <div className="text-xs text-red-400/60">
                    {t("account.logout.desc")}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-red-400/50" />
            </div>
            <div className="h-px bg-red-500/20 mx-4" />
            <div className="p-4 flex items-center justify-between hover:bg-red-500/10 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                  <Trash2 size={18} />
                </div>
                <div>
                  <div className="font-bold text-sm text-red-500">
                    {t("account.delete.label")}
                  </div>
                  <div className="text-xs text-red-400/60">
                    {t("account.delete.desc")}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-red-400/50" />
            </div>
          </Card>
        </div>
        <div className="text-center text-xs text-muted-foreground pt-8 font-mono">
          {t("buildInfo", { version: "1.0.4", build: "2405" })}
        </div>
      </div>
    </div>
  );
}
