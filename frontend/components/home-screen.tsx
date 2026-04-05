"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LayoutGrid,
  Play,
  RefreshCw,
  Sparkles,
  Wallet,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Socket } from "socket.io-client";
import InviteModal from "@/components/referral/InviteModal";
import { AuthScreen } from "@/components/auth-screen";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGetRoomsQuery, useGetWalletQuery, type RoomItem } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { closeSocket, connectSocket } from "@/lib/socket";
import { useTranslations } from "next-intl";

const FALLBACK_TOKEN_KEY = "mella_token";
const EMPTY_ROOMS: RoomItem[] = [];

function centsToLabel(cents: number): string {
  return (cents / 100).toFixed(2);
}

function getRoomStatusLabel(isLive: boolean, status: string) {
  if (isLive) return "Live now";
  if (status === "countdown") return "Starting soon";
  return "Open to join";
}

function HomeRoomCard({
  room,
  canAfford,
}: {
  room: RoomItem;
  canAfford: boolean;
}) {
  const router = useRouter();
  const statusLabel = getRoomStatusLabel(room.isLive, room.sessionStatus);

  return (
    <button
      type="button"
      onClick={() => router.push(`/rooms/${room.id}`)}
      className={cn(
        "relative w-full overflow-hidden rounded-[16px] border border-white/10 bg-[#11141d] p-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition active:scale-[0.985]",
        !canAfford && "opacity-85",
      )}
    >
      <div className="absolute inset-0 opacity-90">
        <div className={cn("absolute inset-0 bg-linear-to-br", room.color)} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_32%),linear-gradient(180deg,rgba(10,14,22,0.02),rgba(7,10,16,0.34))]" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-white/15 bg-black/15 text-3xl shadow-inner">
              {room.icon || "🎉"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight text-white">
                {room.name}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                {statusLabel}
              </p>
            </div>
          </div>

          <Badge
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[9px]  uppercase tracking-[0.18em] text-white",
              room.isLive
                ? "border-red-300/40 bg-red-500/85"
                : "border-white/15 bg-black/20 backdrop-blur-sm",
            )}
          >
            {room.isLive
              ? "Live"
              : room.sessionStatus === "countdown"
                ? "Soon"
                : "Open"}
          </Badge>
        </div>

        <div className="mt-5 flex items-end justify-between gap-2">
          <div className="space-y-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                Entry
              </p>
              <p className="text-2xl font-black tracking-tight text-white">
                {room.price} <span className="text-sm text-white/75">ETB</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-white/80">
              <Users className="h-3.5 w-3.5" />
              <span>{room.playersCount} players </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]",
                canAfford
                  ? "border-emerald-300/30 bg-emerald-500/20 text-white"
                  : "border-amber-300/30 bg-amber-500/20 text-white",
              )}
            >
              {canAfford ? "Ready" : "Top up"}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              <Play className="h-3.5 w-3.5 fill-current" />
              Join room
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const authT = useTranslations("auth");
  const { status, login, signup, error: authError, user } = useAuth();
  const [roomFilter, setRoomFilter] = useState<"all" | "live" | "affordable">(
    "all",
  );
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roomStates, setRoomStates] = useState<
    Record<
      string,
      { sessionId: string | null; sessionStatus: string; playersCount: number }
    >
  >({});

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
  const bonusLabel = wallet ? centsToLabel(wallet.bonusCents) : "0.00";
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

  const filteredRooms = useMemo(() => {
    if (roomFilter === "live") {
      return displayRooms.filter((room) => room.isLive);
    }
    if (roomFilter === "affordable") {
      return displayRooms.filter((room) =>
        wallet ? wallet.balanceCents >= room.boardPriceCents : false,
      );
    }
    return displayRooms;
  }, [displayRooms, roomFilter, wallet]);

  const affordableRoomsCount = useMemo(
    () =>
      displayRooms.filter((room) =>
        wallet ? wallet.balanceCents >= room.boardPriceCents : false,
      ).length,
    [displayRooms, wallet],
  );

  const liveRoomsCount = displayRooms.filter((room) => room.isLive).length;

  if (
    status === "boot" ||
    (status === "authenticated" && (isRoomsLoading || isWalletLoading))
  ) {
    return (
      <main className="min-h-svh bg-[#07110b] px-5 py-8 text-white">
        <div className="mx-auto flex min-h-[80svh] max-w-[430px] flex-col justify-center">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-28 animate-pulse rounded-[28px] bg-linear-to-br from-green-500/20 to-emerald-600/20" />
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="h-18 animate-pulse rounded-2xl bg-white/8" />
              <div className="h-18 animate-pulse rounded-2xl bg-white/8" />
            </div>
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-[26px] bg-white/8"
                />
              ))}
            </div>
          </div>
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
    <main className="min-h-svh bg-[#07110b] text-white">
      <div className="mx-auto flex min-h-svh max-w-[430px] flex-col bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_34%),linear-gradient(180deg,#0a120d_0%,#09110c_24%,#07110b_100%)] pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <div className="px-4 pt-5">
          <div className="rounded-[16px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-200/70">
                  Beshi Bingo
                </p>
                <h1 className="mt-2 text-[26px] font-black leading-none tracking-tight text-white">
                  {user?.username ? `Hey ${user.username}` : "Ready to play?"}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => {
                  refetchRooms();
                  refetchWallet();
                }}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white transition active:scale-95"
                aria-label="Refresh home"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-[16px] border border-white/10 bg-linear-to-br from-green-500 to-emerald-700 p-4 shadow-[0_22px_45px_rgba(22,163,74,0.28)]">
              <div className="absolute -right-10 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-0 right-0 h-24 w-24 rounded-full bg-black/10 blur-2xl" />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
                      Available balance
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-white">
                      {currency} {balanceLabel}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-black/10 p-3 backdrop-blur-sm">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg border border-white/12 bg-black/10 px-3 py-2.5 text-sm backdrop-blur-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">
                      Bonus
                    </p>
                    <p className="mt-1 font-black text-white">
                      {currency} {bonusLabel}
                    </p>
                  </div>
                  <Badge className="rounded-full border-none bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    {affordableRoomsCount} rooms live
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => router.push("/deposit")}
                className="flex min-h-[76px] flex-col justify-between rounded-[16px] border border-white/10 bg-white/8 p-4 text-left transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-2xl bg-emerald-500/18 p-2 text-emerald-200">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/55" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Deposit</p>
                  <p className="mt-1 text-[11px] text-white/62">
                    Add money and join quickly
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="flex min-h-[76px] flex-col justify-between rounded-[16px] border border-white/10 bg-white/8 p-4 text-left transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-2xl bg-white/10 p-2 text-white">
                    <Users className="h-4 w-4" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/55" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    Invite friends
                  </p>
                  <p className="mt-1 text-[11px] text-white/62">
                    Share your mini app link
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 px-4">
          <div className="rounded-[16px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                  Room lobby
                </p>
                <h2 className="mt-2 text-xl font-black tracking-tight text-white">
                  Pick the next game
                </h2>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                  Available
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {filteredRooms.length}
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { key: "all", label: `All(${displayRooms.length})` },
                { key: "live", label: `Live(${liveRoomsCount})` },
                {
                  key: "affordable",
                  label: `Affordable(${affordableRoomsCount})`,
                },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() =>
                    setRoomFilter(filter.key as "all" | "live" | "affordable")
                  }
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition active:scale-95",
                    roomFilter === filter.key
                      ? "border-emerald-300/30 bg-emerald-500 text-white"
                      : "border-white/10 bg-white/6 text-white/70",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-white/12 bg-black/10 px-6 py-12 text-center">
                  <div className="rounded-full bg-white/6 p-4">
                    <LayoutGrid className="h-6 w-6 text-white/45" />
                  </div>
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-white/72">
                    No rooms here yet
                  </p>
                  <p className="mt-2 max-w-[250px] text-sm leading-5 text-white/52">
                    Try another filter or refresh to catch the next available
                    room.
                  </p>
                </div>
              ) : (
                filteredRooms.map((room) => (
                  <HomeRoomCard
                    key={room.id}
                    room={room}
                    canAfford={
                      wallet
                        ? wallet.balanceCents >= room.boardPriceCents
                        : false
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 px-4">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/15 p-2 text-emerald-200">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    Smooth Telegram flow
                  </p>
                  <p className="text-[11px] text-white/58">
                    One-hand layout, faster room scanning, bigger tap targets.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/rooms")}
                className="shrink-0 rounded-full border border-white/10 bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white transition active:scale-95"
              >
                All rooms
              </button>
            </div>
          </div>
        </div>
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </main>
  );
}
