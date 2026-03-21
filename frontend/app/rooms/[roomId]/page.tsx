"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RotateCcw, Volume2 } from "lucide-react";

import {
  buyBoard,
  resolveActiveSessionByRoomId,
  type BoardSelectionState,
} from "@/lib/api";
import { closeSocket, connectSocket } from "@/lib/socket";
import LiveGameLoader from "@/components/live-game-loader";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

const TOKEN_KEY = "mella_token";
const BOARD_KEY_PREFIX = "mella_board_";

function boardNumbers() {
  return Array.from({ length: 150 }, (_, i) => i + 1);
}

type MyBoard = {
  id: string;
  boardNo: number;
  boardMatrix: number[][];
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams() as { roomId: string };
  const redirectedRef = useRef(false);
  const t = useTranslations("roomSelect");

  const [state, setState] = useState<BoardSelectionState | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [startsIn, setStartsIn] = useState<number>(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [prizePoolCents, setPrizePoolCents] = useState(0);
  const [stakeLabelLive, setStakeLabelLive] = useState("0.00");

  function redirectToResult(targetPath: string) {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace(targetPath);
  }

  const loadActiveSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setMsg(t("errors.missingAuth"));
      setSessionLoading(false);
      return;
    }

    setSessionLoading(true);
    try {
      const nextState = await resolveActiveSessionByRoomId(
        token,
        params.roomId,
      );
      if (nextState.viewerResult) {
        redirectToResult(nextState.viewerResult.targetPath);
        return;
      }
      setState(nextState);
      setStartsIn(nextState.startsInSec);
      setStakeLabelLive(nextState.stakeLabel);
      setMsg("");
    } catch {
      setMsg(t("errors.failedLoad"));
    } finally {
      setSessionLoading(false);
    }
  }, [params.roomId]);

  useEffect(() => {
    let alive = true;

    async function load() {
      const token = localStorage.getItem(TOKEN_KEY) || "";
      if (!token) {
        setMsg(t("errors.missingAuth"));
        setSessionLoading(false);
        return;
      }

      try {
        const nextState = await resolveActiveSessionByRoomId(
          token,
          params.roomId,
        );
        if (!alive) return;
        if (nextState.viewerResult) {
          redirectToResult(nextState.viewerResult.targetPath);
          return;
        }
        setState(nextState);
        setStartsIn(nextState.startsInSec);
        setStakeLabelLive(nextState.stakeLabel);
      } catch {
        if (!alive) return;
        setMsg(t("errors.failedLoad"));
      } finally {
        if (alive) setSessionLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [params.roomId, router]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token || !state?.sessionId) return;

    const socket = connectSocket(token);
    socket.emit("join_session", { sessionId: state.sessionId });

    const onCountdown = (payload: {
      sessionId: string;
      secondsLeft: number;
    }) => {
      if (payload.sessionId !== state.sessionId) return;
      setStartsIn(payload.secondsLeft);
      setState((prev) => (prev ? { ...prev, status: "countdown" } : prev));
    };

    const onStarted = (payload: { sessionId: string }) => {
      if (payload.sessionId !== state.sessionId) return;
      setStartsIn(0);
      setState((prev) => (prev ? { ...prev, status: "playing" } : prev));
    };

    const onSnapshot = (payload: {
      sessionId: string;
      startsInSec?: number;
      potCents?: number;
      stakeLabel?: string;
      viewerResult?: { targetPath: string } | null;
    }) => {
      if (payload.sessionId !== state.sessionId) return;
      if (payload.viewerResult) {
        redirectToResult(payload.viewerResult.targetPath);
        return;
      }
      if (typeof payload.startsInSec === "number") {
        setStartsIn(payload.startsInSec);
      }
      if (typeof payload.potCents === "number") {
        setPrizePoolCents(payload.potCents);
      }
      if (typeof payload.stakeLabel === "string") {
        setStakeLabelLive(payload.stakeLabel);
      }
    };

    const onParticipantsUpdated = (payload: {
      sessionId: string;
      potCents: number;
      stakeLabel: string;
    }) => {
      if (payload.sessionId !== state.sessionId) return;
      setPrizePoolCents(payload.potCents);
      setStakeLabelLive(payload.stakeLabel);
    };

    const onResultReady = (payload: {
      sessionId: string;
      targetPath: string;
    }) => {
      if (payload.sessionId !== state.sessionId) return;
      redirectToResult(payload.targetPath);
    };

    socket.on("session_countdown", onCountdown);
    socket.on("session_started", onStarted);
    socket.on("session_snapshot", onSnapshot);
    socket.on("session_participants_updated", onParticipantsUpdated);
    socket.on("session_result_ready", onResultReady);

    return () => {
      socket.off("session_countdown", onCountdown);
      socket.off("session_started", onStarted);
      socket.off("session_snapshot", onSnapshot);
      socket.off("session_participants_updated", onParticipantsUpdated);
      socket.off("session_result_ready", onResultReady);
      closeSocket();
    };
  }, [state?.sessionId, router]);

  const numbers = useMemo(() => boardNumbers(), []);
  const canJoin = state?.status === "waiting" || state?.status === "countdown";
  const prizePool = prizePoolCents / 100;
  const bgNumbers = useMemo(
    () => Array.from({ length: 50 }, () => Math.floor(Math.random() * 100)),
    [],
  );

  async function onJoin() {
    if (!picked || !state || !canJoin) return;

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setMsg(t("errors.missingAuth"));
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const idempotencyKey = `join-${state.sessionId}-${picked}-${Date.now()}`;
      const result = await buyBoard(token, {
        sessionId: state.sessionId,
        quantity: 1,
        idempotencyKey,
      });
      const board = result.boards[0];
      if (!board) {
        setMsg(t("errors.joinSuccessNoBoard"));
        return;
      }

      const boardData: MyBoard = {
        id: board.id,
        boardNo: board.boardNo,
        boardMatrix: board.boardMatrix,
      };
      sessionStorage.setItem(
        `${BOARD_KEY_PREFIX}${state.sessionId}`,
        JSON.stringify(boardData),
      );

      router.push(`/rooms/${params.roomId}/session/${state.sessionId}/game`);
    } catch {
      setMsg(t("errors.joinFailedTryAgain"));
    } finally {
      setBusy(false);
    }
  }

  if (sessionLoading) {
    return <LiveGameLoader />;
  }

  return (
    <div className="min-h-screen max-h-screen bg-background text-foreground flex flex-col max-w-[430px] w-full mx-auto overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none select-none overflow-hidden">
        <div className="text-foreground text-[15vw] font-black whitespace-pre-wrap leading-none opacity-20 transform -rotate-12 translate-y-[-10%]">
          {bgNumbers.map((num, idx) => (
            <span key={idx} className="mr-8 rotate-45 inline-block">
              {num}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col flex-1 pb-24 px-4 pt-4">
        <header className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                void loadActiveSession();
              }}
              className="bg-blue-500 p-2 rounded-full hover:bg-blue-500 transition-colors"
            >
              <RotateCcw size={18} strokeWidth={1.5} />
            </button>
            <button className="rounded-full bg-blue-600 h-9 w-9 border border-blue-600 flex items-center justify-center">
              <Volume2 size={18} />
            </button>
          </div>
        </header>

        <div className="flex w-full items-stretch justify-between gap-2 mb-4">
          <div className="bg-blue-500 rounded-[8px] min-w-20 p-2.5 pb-2 flex flex-col shadow-lg">
            <span className="text-[11px] font-bold text-foreground/70 uppercase">
              {t("stats.earn")}
            </span>
            <span className="text-lg flex items-end font-black">
              {prizePool.toFixed(2)}
              <span className="text-[10px] ml-2 opacity-60">ETB</span>
            </span>
          </div>
          <div className="bg-indigo-500 rounded-[8px] min-w-20 flex-1 p-2.5 pb-2 flex flex-col shadow-lg">
            <span className="text-[11px] font-bold text-foreground/70 uppercase">
              {t("stats.stake")}
            </span>
            <span className="text-lg flex items-end font-black">
              {stakeLabelLive}
              <span className="text-[10px] ml-2 opacity-60">ETB</span>
            </span>
          </div>
          <div className="bg-red-500 rounded-[8px] min-w-20 p-2.5 pb-2 flex flex-col shadow-lg">
            <span className="text-[11px] font-bold text-foreground/70 uppercase leading-tight">
              {t("stats.startsIn")}
            </span>
            <span className="text-lg font-black">{t("seconds", { value: Math.max(startsIn, 0) })}</span>
          </div>
        </div>

        <div className="flex-1 max-h-[calc(100vh-300px)] pb-16 overflow-y-auto custom-scrollbar pr-1">
          <div className="grid grid-cols-8 gap-2 pb-4">
            {numbers.map((n) => {
              const isSelected = picked === n;

              return (
                <button
                  key={n}
                  onClick={() => setPicked(n)}
                  disabled={!canJoin}
                  className={`aspect-square rounded-[4px] flex items-center disabled:opacity-50 disabled:cursor-not-allowed border-r-2 border-r-foreground/35 border-b-2 border-b-foreground/35 justify-center text-xs font-black transition-all hover:scale-105 active:scale-95 ${
                    isSelected
                      ? "bg-[#34d399] text-white shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-105 z-10"
                      : "bg-foreground/5 text-foreground"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-linear-to-t from-[#121212] via-[#121212] to-transparent z-20 max-w-[430px] mx-auto">
        <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-foreground/60">
          {picked ? t("selection.oneSelected") : t("selection.selectOne")}
        </p>
        <Button
          onClick={onJoin}
          disabled={!picked || busy || !canJoin || sessionLoading}
          className="w-full bg-blue-500 h-10 rounded-[12px] text-foreground font-black shadow-[0_4px_20px_rgba(234,179,8,0.3)] active:scale-95 transition-all"
        >
          {busy ? t("joining") : t("join")}
        </Button>
        {msg ? (
          <p className="mt-2 text-center text-xs text-red-300">{msg}</p>
        ) : null}
      </div>
    </div>
  );
}
