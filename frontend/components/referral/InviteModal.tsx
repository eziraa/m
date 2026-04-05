"use client";

import { useState } from "react";
import { Copy, Check, Share2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { useGetReferralCodeQuery } from "@/lib/api";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [copiedMiniApp, setCopiedMiniApp] = useState(false);
  const [copiedBotLink, setCopiedBotLink] = useState(false);

  // Mocking the toast usage
  const toast: any = () => {};

  const { data: referralData, isLoading } = useGetReferralCodeQuery();
  const codeData = referralData || { referralCode: "" };

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || "beshi_bingo_bot";
  const referralCode = codeData?.referralCode || "";
  const baseBotUrl = `https://t.me/${botUsername}`;
  const encodedCode = referralCode ? encodeURIComponent(referralCode) : "";
  const miniAppLink = referralCode
    ? `${baseBotUrl}?startapp=${encodedCode}`
    : baseBotUrl;
  const fallbackBotLink = referralCode
    ? `${baseBotUrl}?start=${encodedCode}`
    : baseBotUrl;

  const copyLink = (link: string, onCopied: (value: boolean) => void) => {
    if (!referralCode) return;
    navigator.clipboard.writeText(link);
    onCopied(true);
    toast({
      title: "Link copied",
      description: "Your invite link is ready to share.",
    });
    setTimeout(() => onCopied(false), 2000);
  };

  const copyMiniAppLink = () => copyLink(miniAppLink, setCopiedMiniApp);
  const copyFallbackLink = () => copyLink(fallbackBotLink, setCopiedBotLink);

  const shareOnTelegram = () => {
    if (!referralCode) return;
    const WebApp = (window as any).Telegram?.WebApp;
    const shareText =
      "Join me on Beshi Bingo. Open the link and start playing.";
    if (WebApp) {
      WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(miniAppLink)}&text=${encodeURIComponent(shareText)}`,
      );
    } else {
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(miniAppLink)}&text=${encodeURIComponent(shareText)}`,
        "_blank",
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-10  bg-foreground/10 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none select-none overflow-hidden">
            <div className="text-foreground text-[15vw] font-black break-all whitespace-pre-wrap leading-none opacity-20 transform -rotate-12 translate-y-[-10%]">
              {Array.from({ length: 50 }).map((_, idx) => (
                <span key={idx} className="mr-8 rotate-45">
                  {Math.floor(Math.random() * 100)}
                </span>
              ))}
            </div>
          </div>

          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative z-10 w-full max-w-[400px] bg-background gap-2 py-10 p-6 rounded-2xl flex flex-col items-center "
          >
            {/* Close Icon */}
            <motion.button
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={onClose}
              className="absolute top-4 right-4 z-10"
            >
              <X size={24} className="text-foreground/70" />
            </motion.button>
            <div className="mx-auto p-3 bg-green-500/20 rounded-full text-green-400 mb-2 w-fit">
              <Users size={32} />
            </div>
            <h2 className="text-center text-2xl font-bold">Invite Friends</h2>
            <p className="text-center text-zinc-400">
              Share your personal invite link so friends can open the mini app
              and join Beshi Bingo quickly.
            </p>

            <div className="flex flex-col space-y-4 mt-4">
              <div className="flex items-center space-x-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                <Input
                  value={isLoading ? "Generating your invite link..." : miniAppLink}
                  readOnly
                  className="bg-transparent border-none focus-visible:ring-0 text-zinc-300 text-sm h-9"
                />
                <Button
                  size="sm"
                  onClick={copyMiniAppLink}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-lg h-9"
                  disabled={isLoading || !referralCode}
                >
                  {copiedMiniApp ? <Check size={18} /> : <Copy size={18} />}
                </Button>
              </div>

              <Button
                onClick={shareOnTelegram}
                className="w-full bg-green-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 text-white py-6 rounded-2xl flex items-center justify-center space-x-2 font-bold text-lg shadow-lg shadow-green-500/20"
                disabled={isLoading || !referralCode}
              >
                <Share2 size={20} />
                <span>Share on Telegram</span>
              </Button>

              <div className="bg-black/30 border hidden border-white/5 rounded-xl p-3 space-y-2 text-left">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Use this if you want to copy the invite link and send it
                  yourself.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-zinc-500">
                    Backup bot link
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={copyFallbackLink}
                    className="h-8 px-3 rounded-lg border border-white/10 bg-white/5 text-[11px] font-semibold text-zinc-200"
                    disabled={isLoading || !referralCode}
                  >
                    {copiedBotLink ? <Check size={14} /> : <Copy size={14} />}
                    <span className="ml-2">Copy backup link</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
