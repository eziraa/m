"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Sparkles, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import type { Socket } from "socket.io-client";
import { MobileHeader } from "@/components/mobile-header";
import { BalanceCard } from "@/components/balance-card";
import { GameCard } from "@/components/game-card";
import { AuthScreen } from "@/components/auth-screen";
import InviteModal from "@/components/referral/InviteModal";

import { useGetRoomsQuery, useGetWalletQuery, type RoomItem } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { closeSocket, connectSocket } from "@/lib/socket";
import { useTranslations } from "next-intl";
import Logo from "./logo";

const FALLBACK_TOKEN_KEY = "mella_token";
const EMPTY_ROOMS: RoomItem[] = [];

function centsToLabel(cents: number): string {
  return (cents / 100).toFixed(2);
}
export function HomeScreen() {
  const router = useRouter();
  const authT = useTranslations("auth");
  const { status, login, signup, error: authError } = useAuth();

  const {
    data: roomsData,
    isLoading: isRoomsLoading,
    isError: isRoomsError,
    refetch: refetchRooms,
  } = useGetRoomsQuery({ skip: status !== "authenticated" });
  const {
    data: walletData,
    isLoading: isWalletLoading,
    isError: isWalletError,
    refetch: refetchWallet,
  } = useGetWalletQuery(undefined, { skip: status !== "authenticated" });

  const wallet = walletData
    ? {
        balanceCents: (walletData.balance || 0) * 100,
        bonusCents: (walletData.bonus || 0) * 100,
        currency: walletData.currency,
      }
    : null;
  const rooms = roomsData ?? EMPTY_ROOMS;
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roomStates, setRoomStates] = useState<
    Record<
      string,
      { sessionId: string | null; sessionStatus: string; playersCount: number }
    >
  >({});

  useEffect(() => {
    if (status !== "authenticated" || !localStorage.getItem(FALLBACK_TOKEN_KEY))
      return;

    let socket: Socket | null = null;
    const token = localStorage.getItem(FALLBACK_TOKEN_KEY)!;

    socket = connectSocket(token);

    return () => {
      if (socket) {
        socket.removeAllListeners();
      }
      closeSocket();
    };
  }, [status]);

  useEffect(() => {
    setRoomStates((prev) => {
      const next = Object.fromEntries(
        rooms.map((room) => [
          room.id,
          {
            sessionId: room.sessionId,
            sessionStatus: room.sessionStatus,
            playersCount: room.playersCount,
          },
        ]),
      );

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) {
        return next;
      }

      for (const key of nextKeys) {
        const prevRoom = prev[key];
        const nextRoom = next[key];
        if (
          !prevRoom ||
          prevRoom.sessionId !== nextRoom.sessionId ||
          prevRoom.sessionStatus !== nextRoom.sessionStatus ||
          prevRoom.playersCount !== nextRoom.playersCount
        ) {
          return next;
        }
      }

      return prev;
    });
  }, [rooms]);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !localStorage.getItem(FALLBACK_TOKEN_KEY) ||
      Object.keys(roomStates).length === 0
    ) {
      return;
    }

    const socket = connectSocket(localStorage.getItem(FALLBACK_TOKEN_KEY)!);
    const sessionIds = new Set<string>();

    Object.values(roomStates).forEach((roomState) => {
      if (roomState.sessionId && !sessionIds.has(roomState.sessionId)) {
        sessionIds.add(roomState.sessionId);
        socket.emit("join_session", { sessionId: roomState.sessionId });
      }
    });

    const updateRoomState = (
      sessionId: string,
      patch: Partial<{
        sessionStatus: string;
        playersCount: number;
      }>,
    ) => {
      setRoomStates((prev) => {
        const roomId = Object.keys(prev).find(
          (key) => prev[key]?.sessionId === sessionId,
        );
        if (!roomId) return prev;
        return {
          ...prev,
          [roomId]: {
            ...prev[roomId],
            ...patch,
          },
        };
      });
    };

    const onSnapshot = (payload: {
      sessionId: string;
      status?: string;
      playersCount?: number;
    }) => {
      updateRoomState(payload.sessionId, {
        sessionStatus: payload.status,
        playersCount: payload.playersCount,
      });
    };

    const onParticipantsUpdated = (payload: {
      sessionId: string;
      status: string;
      playersCount: number;
    }) => {
      updateRoomState(payload.sessionId, {
        sessionStatus: payload.status,
        playersCount: payload.playersCount,
      });
    };

    const onStarted = (payload: { sessionId: string }) => {
      updateRoomState(payload.sessionId, { sessionStatus: "playing" });
    };

    const onCountdown = (payload: { sessionId: string }) => {
      updateRoomState(payload.sessionId, { sessionStatus: "countdown" });
    };

    socket.on("session_snapshot", onSnapshot);
    socket.on("session_participants_updated", onParticipantsUpdated);
    socket.on("session_started", onStarted);
    socket.on("session_countdown", onCountdown);

    return () => {
      socket.off("session_snapshot", onSnapshot);
      socket.off("session_participants_updated", onParticipantsUpdated);
      socket.off("session_started", onStarted);
      socket.off("session_countdown", onCountdown);
    };
  }, [roomStates, status]);

  const balanceLabel = wallet ? centsToLabel(wallet.balanceCents) : "0.00";
  const currency = wallet?.currency ?? "ETB";
  const displayRooms = useMemo(
    () =>
      rooms.map((room) => {
        const liveState = roomStates[room.id];
        const sessionStatus = liveState?.sessionStatus ?? room.sessionStatus;
        return {
          ...room,
          sessionStatus,
          playersCount: liveState?.playersCount ?? room.playersCount,
          isLive: sessionStatus === "playing",
        };
      }),
    [roomStates, rooms],
  );

  if (
    status === "boot" ||
    (status === "authenticated" && (isRoomsLoading || isWalletLoading))
  ) {
    return (
      <main className="min-h-svh bg-background flex flex-col items-center justify-center p-6 text-foreground relative overflow-hidden">
        {/* Animated Background Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px] pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center max-w-xs w-full">
          {/* Animated Logo/Ball */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            <Logo />

            {/* Spinning Rings */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 border border-t-primary/40 border-r-transparent border-b-primary/40 border-l-transparent rounded-full opacity-50"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 text-center space-y-3"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">
              {authT("booting")}
            </p>
            <h2 className="text-xl font-bold tracking-tight bg-linear-to-b from-foreground to-foreground/60 bg-clip-text text-transparent italic">
              Beshi Bingo
            </h2>

            <div className="flex flex-col items-center gap-4 mt-6">
              <p className="text-xs font-medium text-muted-foreground/80 animate-pulse">
                {authT("loadingApp")}
              </p>

              {/* Custom Progress Bar */}
              <div className="w-32 h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="size-full bg-linear-to-r from-transparent via-primary to-transparent"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-12 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/20">
          Secure Game Engine 2.0
        </div>
      </main>
    );
  }

  if (
    status === "unauthenticated" ||
    status === "error" ||
    isRoomsError ||
    isWalletError
  ) {
    return (
      <AuthScreen
        status={status}
        authError={authError}
        isRoomsError={isRoomsError}
        isWalletError={isWalletError}
        login={login}
        signup={signup}
      />
    );
  }

  return (
    <div className="bg-background min-h-svh w-full h-screen max-h-screen overflow-y-auto custom-scrollbar transition-colors duration-500">
      {/* Dynamic Patterned Background */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none select-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--foreground) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="text-foreground text-[10vw] font-black break-all whitespace-pre-wrap leading-tight p-4 mix-blend-overlay">
          {Array.from({ length: 120 }).map((_, idx) => (
            <span key={idx} className="opacity-10 mr-4">
              Beshi Bingo
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-[430px] mx-auto flex flex-col pb-24">
        <MobileHeader
          refetch={() => {
            refetchRooms();
            refetchWallet();
          }}
        />

        <BalanceCard balance={balanceLabel} currency={currency} />

        <div className="px-4 hidden mt-4">
          <button className="w-full bg-primary/10 border-primary/20 hover:bg-primary/20 transition-all border py-2.5 rounded-2xl text-primary font-black tracking-widest  shadow-xl shadow-primary/5 active:scale-95 group">
            <span className="flex items-center justify-center gap-2">
              <span className="text-lg"></span> instructions
            </span>
          </button>
        </div>

        <button
          className="flex justify-center border border-green-600 px-4 mx-4 py-2 rounded-[8px] items-center gap-3 mt-6 text-muted-foreground hover:text-primary transition-colors text-xs font-black uppercase tracking-widest active:scale-95"
          onClick={() => setIsInviteModalOpen(true)}
        >
          <Users size={16} className="text-primary" />
          <span>invite</span>
        </button>

        {/* Game Grid Container */}
        <div className="px-4 mt-8 flex items-center justify-between">
          <h2 className="text-sm font-black capitalize tracking-[0.2em] text-foreground/40 flex items-center gap-2">
            <Zap size={14} className="text-primary" /> available rooms
          </h2>
          <span className="h-px flex-1 bg-linear-to-r from-primary/20 to-transparent ml-4" />
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 mt-2">
          {displayRooms.length === 0 ? (
            <div className="col-span-2 py-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                <LayoutGrid className="text-primary/40" />
              </div>
              <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">
                No rooms
              </p>
            </div>
          ) : (
            displayRooms.map((room) => (
              <div key={room.id}>
                <GameCard
                  name={room.name}
                  price={room.price}
                  color={room.color}
                  id={room.id}
                  icon={room.icon || ""}
                  canAfford={
                    wallet ? wallet.balanceCents >= room.boardPriceCents : false
                  }
                  isLive={room.isLive}
                  status={room.sessionStatus}
                  joinedUsers={room.playersCount}
                />
              </div>
            ))
          )}
        </div>

        {/* Extra Bottom Padding for Nav */}
        <div className="h-4" />
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
