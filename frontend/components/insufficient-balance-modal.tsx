"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import WalletAlertIcon from "@/components/icons/wallet-alert";

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InsufficientBalanceModal({
  isOpen,
  onClose,
}: InsufficientBalanceModalProps) {
  const router = useRouter();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          {/* Ambient gradients */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -right-10 h-48 w-48 bg-green-500/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-56 w-56 bg-green-500/25 blur-[120px]" />
          </div>

          {/* Modal Content */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 w-full max-w-md bg-[rgba(18,16,32,0.85)] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_35px_80px_rgba(0,0,0,0.55)] flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 via-green-500 to-emerald-500" />

            {/* Close Button */}
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={onClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-all"
            >
              <X size={24} />
            </motion.button>

            <div className="mt-6 mb-4 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                <WalletAlertIcon />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight">
                  Insufficient Balance{" "}
                </h1>
              </div>
            </div>

            <p className="text-white/60 text-sm mb-8 px-6 leading-relaxed">
              Please deposit funds to your wallet to play this game.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4 w-full">
              <Button
                onClick={() => {
                  onClose();
                  router.push("/deposit");
                }}
                className="flex-1 h-11 rounded-[12px] bg-gradient-to-r from-green-500 via-green-500 to-emerald-500 hover:brightness-110 text-white active:scale-95 transition-all shadow-lg shadow-green-500/30"
              >
                Deposit
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
