"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, Volume2 } from "lucide-react";

import { fetchSessionState, type SessionState } from "@/lib/api";
import { closeSocket, connectSocket } from "@/lib/socket";

const TOKEN_KEY = "mella_token";
const BOARD_KEY_PREFIX = "mella_board_";

type MyBoard = {
  id: string;
  boardNo: number;
  boardMatrix: number[][];
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function calledCellMatrix() {
  return Array.from({ length: 15 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => col * 15 + row + 1),
  );
}

function letterForNumber(n: number) {
  if (n <= 15) return "B";
  if (n <= 30) return "I";
  if (n <= 45) return "N";
  if (n <= 60) return "G";
  return "O";
}

export default function GameSessionPage() {
  const router = useRouter();
  const params = useParams() as { roomId: string; sessionId: string };

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [startsIn, setStartsIn] = useState(0);
  const [myBoard, setMyBoard] = useState<MyBoard | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set([12]));
  const [showStartSplash, setShowStartSplash] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;

    async function boot() {
      const token = localStorage.getItem(TOKEN_KEY) || "";
      if (!token) {
        router.push("/");
        return;
      }

      const storedRaw = sessionStorage.getItem(
        `${BOARD_KEY_PREFIX}${params.sessionId}`,
      );
      if (!storedRaw) {
        router.push(`/rooms/${params.roomId}/session/${params.sessionId}`);
        return;
      }

      try {
        const stored = JSON.parse(storedRaw) as MyBoard;
        if (!stored?.id || !Array.isArray(stored.boardMatrix)) {
          router.push(`/rooms/${params.roomId}/session/${params.sessionId}`);
          return;
        }

        setMyBoard(stored);

        const ss = await fetchSessionState(token, params.sessionId);
        if (!alive) return;
        setSessionState(ss);
      } catch {
        if (!alive) return;
        setMsg("Failed to load game session state.");
      }
    }

    void boot();

    return () => {
      alive = false;
    };
  }, [params.roomId, params.sessionId, router]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token || !myBoard) return;

    const socket = connectSocket(token);
    socket.emit("join_session", { sessionId: params.sessionId });

    const onSnapshot = (payload: {
      sessionId: string;
      status: string;
      currentNumber: number | null;
      lastSeq: number;
      recentCalls: Array<{ seq: number; number: number }>;
      startsInSec?: number;
    }) => {
      if (payload.sessionId !== params.sessionId) return;
      if (typeof payload.startsInSec === "number") {
        setStartsIn(payload.startsInSec);
      }
      setSessionState((prev) => ({
        id: params.sessionId,
        roomId: prev?.roomId ?? params.roomId,
        status: payload.status,
        currentSeq: payload.lastSeq,
        currentNumber: payload.currentNumber,
        winnerUserId: prev?.winnerUserId ?? null,
        recentCalls: payload.recentCalls,
      }));
    };

    const onNumberCalled = (payload: {
      sessionId: string;
      seq: number;
      number: number;
    }) => {
      if (payload.sessionId !== params.sessionId) return;
      setSessionState((prev) => ({
        id: params.sessionId,
        roomId: prev?.roomId ?? params.roomId,
        status: prev?.status ?? "playing",
        currentSeq: payload.seq,
        currentNumber: payload.number,
        winnerUserId: prev?.winnerUserId ?? null,
        recentCalls: [
          ...(prev?.recentCalls ?? []),
          {
            seq: payload.seq,
            number: payload.number,
          },
        ].slice(-200),
      }));
    };

    const onCountdown = (payload: {
      sessionId: string;
      secondsLeft: number;
    }) => {
      if (payload.sessionId !== params.sessionId) return;
      setStartsIn(payload.secondsLeft);
      setSessionState((prev) =>
        prev
          ? {
              ...prev,
              status: "countdown",
            }
          : prev,
      );
    };

    const onStarted = (payload: { sessionId: string }) => {
      if (payload.sessionId !== params.sessionId) return;
      setStartsIn(0);
      setShowStartSplash(true);
      setTimeout(() => setShowStartSplash(false), 900);
      setSessionState((prev) =>
        prev
          ? {
              ...prev,
              status: "playing",
            }
          : prev,
      );
    };

    const onFinished = (payload: { sessionId: string }) => {
      if (payload.sessionId !== params.sessionId) return;
      setSessionState((prev) =>
        prev
          ? {
              ...prev,
              status: "finished",
            }
          : prev,
      );
      setMsg("Game finished.");
    };

    socket.on("session_snapshot", onSnapshot);
    socket.on("number_called", onNumberCalled);
    socket.on("session_countdown", onCountdown);
    socket.on("session_started", onStarted);
    socket.on("game_finished", onFinished);

    return () => {
      socket.off("session_snapshot", onSnapshot);
      socket.off("number_called", onNumberCalled);
      socket.off("session_countdown", onCountdown);
      socket.off("session_started", onStarted);
      socket.off("game_finished", onFinished);
      closeSocket();
    };
  }, [myBoard, params.roomId, params.sessionId]);

  const calledMatrix = useMemo(() => calledCellMatrix(), []);

  const calledSet = useMemo(
    () => new Set((sessionState?.recentCalls ?? []).map((x) => x.number)),
    [sessionState],
  );

  const latestCalled = sessionState?.currentNumber ?? null;
  const isWaiting =
    sessionState?.status === "waiting" || sessionState?.status === "countdown";
  const latestTarget = latestCalled
    ? `${letterForNumber(latestCalled)}-${latestCalled}`
    : "--";

  const recentTargets = (sessionState?.recentCalls ?? [])
    .slice(-3)
    .reverse()
    .map((x) => ({
      n: x.number,
      label: `${letterForNumber(x.number)}-${x.number}`,
    }));

  function toggleMark(index: number, number: number) {
    const isFree = index === 12;
    if (!isFree && !calledSet.has(number)) return;

    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        if (isFree) return next;
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  if (!myBoard) {
    return (
      <main className="min-h-screen bg-[#020815] text-white">
        <div className="mx-auto max-w-md p-6 text-center text-sm text-cyan-100/80">
          Loading game session...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020815] text-white">
      <div className="relative mx-auto max-w-md px-2 pb-4 pt-3">
        <header className="mb-2 flex items-center justify-between px-1">
          <p
            className={`text-xl font-black ${
              isWaiting ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {isWaiting ? "Waiting" : "Live"}
          </p>
          <div className="flex items-center gap-2">
            <div
              className={`grid h-10 w-10 place-items-center rounded-full bg-[#1d63ff] text-2xl font-black text-cyan-100 ${
                isWaiting && startsIn <= 3 ? "animate-pulse" : ""
              }`}
            >
              {Math.max(startsIn, 0)}
            </div>
            <button className="rounded-full bg-[#1d63ff] p-3 text-sm font-bold">
              <Volume2 size={16} />
            </button>
          </div>
        </header>

        {showStartSplash ? (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#08122a]/55">
            <div className="animate-pulse rounded-2xl border border-cyan-300/70 bg-[#1d63ff]/95 px-8 py-5 text-4xl font-black tracking-[0.12em] text-cyan-50 shadow-glow">
              START!
            </div>
          </div>
        ) : null}

        <section className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-emerald-400/35 bg-[#032927] p-3">
            <p className="text-[11px] font-bold tracking-[0.14em] text-emerald-300">
              EARN
            </p>
            <p className="mt-1 text-4xl font-black leading-none">
              48.00 <span className="text-sm">ETB</span>
            </p>
          </div>
          <div className="rounded-xl border border-blue-400/35 bg-[#03193d] p-3">
            <p className="text-[11px] font-bold tracking-[0.14em] text-blue-300">
              PRICE
            </p>
            <p className="mt-1 text-4xl font-black leading-none">
              0.00 <span className="text-sm">ETB</span>
            </p>
          </div>
          <div className="rounded-xl border border-amber-300/35 bg-[#241807] p-3">
            <p className="text-[11px] font-bold tracking-[0.14em] text-amber-300">
              CALLED
            </p>
            <p className="mt-1 text-4xl font-black leading-none">
              {sessionState?.currentSeq ?? 0}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-[46%_54%] gap-2">
          <div>
            <div className="mb-2 grid grid-cols-5 gap-1 text-center text-xs font-black">
              {[
                ["B", "#3b82f6"],
                ["I", "#ec4899"],
                ["N", "#a855f7"],
                ["G", "#22c55e"],
                ["O", "#f97316"],
              ].map(([letter, color]) => (
                <span
                  key={letter}
                  className="rounded py-1"
                  style={{ backgroundColor: color }}
                >
                  {letter}
                </span>
              ))}
            </div>

            <div className="rounded-lg border border-[#294275] bg-[#060f22] p-1">
              <div className="grid grid-cols-5 gap-1 text-center text-[11px] font-bold">
                {calledMatrix.map((row, rIdx) =>
                  row.map((n, cIdx) => {
                    const highlighted = calledSet.has(n);
                    const isLatest = latestCalled === n;
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className={`rounded-sm border px-0 py-[6px] ${
                          isLatest
                            ? "border-amber-300 bg-amber-500 text-[#0d1635]"
                            : highlighted
                              ? "border-amber-400/70 bg-amber-400/30 text-white"
                              : "border-[#1a2b4f] bg-[#040a1a] text-cyan-100/90"
                        }`}
                      >
                        {n}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-2xl bg-[#245ee7] px-3 py-4 text-center">
              <p className="text-[11px] font-bold tracking-[0.14em] text-cyan-100/85">
                TARGET
              </p>
              <p className="mt-1 text-6xl font-black leading-none">
                {latestTarget}
              </p>
            </div>

            <div className="mt-2 rounded-xl bg-[#1b2745] p-2">
              {recentTargets.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {recentTargets.map((x, idx) => (
                    <div
                      key={`${x.n}-${idx}`}
                      className={`rounded-md py-2 text-center text-xl font-black ${
                        idx === 0
                          ? "bg-[#a855f7]"
                          : idx === 1
                            ? "bg-[#ec4899]"
                            : "bg-[#3b82f6]"
                      }`}
                    >
                      {x.n}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-10 rounded-lg bg-[#232f49]" />
              )}
            </div>

            <div className="mt-2 grid grid-cols-5 gap-1 text-center text-xs font-black">
              {[
                ["B", "#3b82f6"],
                ["I", "#ec4899"],
                ["N", "#a855f7"],
                ["G", "#22c55e"],
                ["O", "#f97316"],
              ].map(([letter, color]) => (
                <span
                  key={`r-${letter}`}
                  className="rounded py-1"
                  style={{ backgroundColor: color }}
                >
                  {letter}
                </span>
              ))}
            </div>

            <div className="mt-1 rounded-lg border border-[#294275] bg-[#060f22] p-1">
              <div className="grid grid-cols-5 gap-1 text-center text-2xl font-black">
                {myBoard.boardMatrix.flat().map((n, idx) => {
                  const isFree = idx === 12;
                  const canMark = isFree || calledSet.has(n);
                  const isMarked = marked.has(idx);
                  return (
                    <button
                      key={`${n}-${idx}`}
                      className={`rounded-md border py-2 ${
                        isMarked
                          ? "border-emerald-400 bg-emerald-500/25 text-emerald-200"
                          : canMark
                            ? "border-[#3b82f6] bg-[#12264d] text-cyan-100"
                            : "border-[#1a2b4f] bg-[#040a1a] text-cyan-100/60"
                      }`}
                      onClick={() => toggleMark(idx, n)}
                    >
                      {isFree ? <Star size={18} className="mx-auto" /> : n}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-2 text-center font-black text-cyan-100">
              BOARD #{myBoard.boardNo}
            </p>

            <button
              disabled={isWaiting}
              className="mt-2 w-full rounded-xl bg-[#1d4ed8] py-3 tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Bingo!
            </button>
            <button
              className="mt-2 w-full rounded-xl bg-[#263655] py-3 tracking-[0.08em]"
              onClick={() => router.push("/")}
            >
              Leave Game
            </button>
          </div>
        </section>

        {msg ? (
          <div className="mt-2 rounded-md bg-cyan-400/15 px-2 py-1 text-center text-xs text-cyan-100/90">
            {msg}
          </div>
        ) : null}

        <div className="mt-2 text-center text-[11px] text-cyan-100/70">
          {isWaiting
            ? `Starts in ${pad2(startsIn)}s`
            : `Status: ${sessionState?.status ?? "waiting"}`}
        </div>
      </div>
    </main>
  );
}
