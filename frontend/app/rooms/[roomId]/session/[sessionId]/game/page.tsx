"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Star, Volume2, VolumeX } from "lucide-react";

import {
  fetchSessionState,
  leaveSessionBeforeStart,
  submitBingoClaim,
  type SessionState,
  type ViewerResult,
  type WinningPatternInput,
} from "@/lib/api";
import { saveStoredGameResult } from "@/lib/game-result";
import { closeSocket, connectSocket } from "@/lib/socket";
import { AudioController } from "@/lib/audio-controller";
import LiveGameLoader from "@/components/live-game-loader";

const TOKEN_KEY = "mella_token";
const BOARD_KEY_PREFIX = "mella_board_";
const MARKED_KEY_PREFIX = "mella_marked_";

type MyBoard = {
  id: string;
  boardNo: number;
  boardMatrix: number[][];
};

const BINGO_LETTERS = ["B", "I", "N", "G", "O"] as const;

function columnColorClass(index: number): string {
  if (index === 0) return "bg-blue-500";
  if (index === 1) return "bg-pink-500";
  if (index === 2) return "bg-purple-500";
  if (index === 3) return "bg-green-500";
  return "bg-orange-500";
}

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

function winningPatternFromBoard(
  board: number[][],
  marked: Set<number>,
  calledSet: Set<number>,
): WinningPatternInput | null {
  const flat = board.flat();
  const isSatisfied = (index: number) => {
    if (index === 12) return true;
    const number = flat[index];
    if (typeof number !== "number") return false;
    return marked.has(index) && calledSet.has(number);
  };

  for (let row = 0; row < 5; row += 1) {
    const indices = [
      row * 5,
      row * 5 + 1,
      row * 5 + 2,
      row * 5 + 3,
      row * 5 + 4,
    ];
    if (indices.every(isSatisfied)) {
      return { type: "row", index: row };
    }
  }

  for (let col = 0; col < 5; col += 1) {
    const indices = [col, col + 5, col + 10, col + 15, col + 20];
    if (indices.every(isSatisfied)) {
      return { type: "column", index: col };
    }
  }

  const mainDiagonal = [0, 6, 12, 18, 24];
  if (mainDiagonal.every(isSatisfied)) {
    return { type: "diagonal", diagonal: "main" };
  }

  const antiDiagonal = [4, 8, 12, 16, 20];
  if (antiDiagonal.every(isSatisfied)) {
    return { type: "diagonal", diagonal: "anti" };
  }

  // Corners: (0,0), (0,4), (4,0), (4,4)
  const cornerIndices = [0, 4, 20, 24]; // Indices for top-left, top-right, bottom-left, bottom-right
  if (cornerIndices.every(isSatisfied)) {
    return { type: "corners" };
  }

  const fullHouse = Array.from({ length: 25 }, (_, idx) => idx);
  if (fullHouse.every(isSatisfied)) {
    return { type: "full_house" };
  }

  return null;
}

export default function GameSessionPage() {
  const router = useRouter();
  const params = useParams() as { roomId: string; sessionId: string };

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [startsIn, setStartsIn] = useState(0);
  const [myBoard, setMyBoard] = useState<MyBoard | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set([12]));
  const [showStartSplash, setShowStartSplash] = useState(false);
  const [claimingBingo, setClaimingBingo] = useState(false);
  const [msg, setMsg] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const audioController = useRef<AudioController | null>(null);
  const redirectedToResultRef = useRef(false);
  const sessionStateRef = useRef<SessionState | null>(null);
  const markedRef = useRef<Set<number>>(new Set([12]));

  function persistAndRedirect(
    board: MyBoard,
    result: ViewerResult,
    calledNumbersOverride?: number[],
    markedCellsOverride?: number[],
    potCentsOverride?: number,
  ) {
    if (redirectedToResultRef.current) {
      return;
    }

    redirectedToResultRef.current = true;
    saveStoredGameResult({
      sessionId: params.sessionId,
      roomId: params.roomId,
      winnerUserId: result.winnerUserId,
      winnerName: result.winnerName,
      boardNo: board.boardNo,
      boardMatrix: board.boardMatrix,
      markedCells:
        markedCellsOverride ??
        Array.from(markedRef.current).sort((a, b) => a - b),
      calledNumbers:
        calledNumbersOverride ??
        (sessionStateRef.current?.recentCalls ?? []).map((x) => x.number),
      potCents: potCentsOverride ?? sessionStateRef.current?.potCents ?? 0,
      createdAt: Date.now(),
    });
    router.replace(result.targetPath);
  }

  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    markedRef.current = marked;
  }, [marked]);

  useEffect(() => {
    router.prefetch(`/rooms/${params.roomId}/session/${params.sessionId}/draw`);
    router.prefetch(`/rooms/${params.roomId}/session/${params.sessionId}/lost`);
    router.prefetch(`/rooms/${params.roomId}/session/${params.sessionId}/won`);
  }, [params.roomId, params.sessionId, router]);

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

        const markedKey = `${MARKED_KEY_PREFIX}${params.sessionId}:${stored.id}`;
        const storedMarkedRaw = sessionStorage.getItem(markedKey);
        if (storedMarkedRaw) {
          try {
            const parsed = JSON.parse(storedMarkedRaw) as unknown;
            if (Array.isArray(parsed)) {
              const next = new Set<number>([12]);
              for (const value of parsed) {
                if (
                  typeof value === "number" &&
                  Number.isInteger(value) &&
                  value >= 0 &&
                  value <= 24
                ) {
                  next.add(value);
                }
              }
              setMarked(next);
            }
          } catch {
            // Ignore malformed stored marks and continue with default free cell.
          }
        }

        const blockedKey = `bingo_blocked_${params.sessionId}`;
        if (localStorage.getItem(blockedKey) === "true") {
          setIsBlocked(true);
        }

        const ss = await fetchSessionState(token, params.sessionId);
        if (!alive) return;
        if (ss.viewerResult) {
          persistAndRedirect(
            stored,
            ss.viewerResult,
            ss.recentCalls.map((x) => x.number),
            Array.from(markedRef.current).sort((a, b) => a - b),
            ss.potCents ?? 0,
          );
          return;
        }
        setSessionState(ss);
      } catch {
        if (!alive) return;
        setMsg("Failed to load game session state.");
      }
    }

    audioController.current = AudioController.getInstance();
    setIsMuted(audioController.current.isMuted());

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
      playersCount?: number;
      boardsCount?: number;
      potCents?: number;
      stakeCents?: number;
      potLabel?: string;
      stakeLabel?: string;
      viewerResult?: ViewerResult | null;
    }) => {
      if (payload.sessionId !== params.sessionId) return;
      if (payload.viewerResult) {
        persistAndRedirect(
          myBoard,
          payload.viewerResult,
          payload.recentCalls.map((x) => x.number),
        );
        return;
      }
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
        playersCount: payload.playersCount ?? prev?.playersCount ?? 0,
        boardsCount: payload.boardsCount ?? prev?.boardsCount ?? 0,
        potCents: payload.potCents ?? prev?.potCents ?? 0,
        stakeCents: payload.stakeCents ?? prev?.stakeCents ?? 0,
        potLabel: payload.potLabel ?? prev?.potLabel ?? "0.00",
        stakeLabel: payload.stakeLabel ?? prev?.stakeLabel ?? "0.00",
        viewerResult: payload.viewerResult ?? prev?.viewerResult ?? null,
      }));
    };

    const onNumberCalled = (payload: {
      sessionId: string;
      seq: number;
      number: number;
    }) => {
      if (payload.sessionId !== params.sessionId) return;
      setSessionState((prev) => ({
        ...(prev ?? {
          id: params.sessionId,
          roomId: params.roomId,
          status: "playing",
          currentSeq: 0,
          currentNumber: null,
          winnerUserId: null,
          recentCalls: [],
          viewerResult: null,
        }),
        currentSeq: payload.seq,
        currentNumber: payload.number,
        recentCalls: [
          ...(prev?.recentCalls ?? []),
          { seq: payload.seq, number: payload.number },
        ].slice(-200),
      }));
      playNumberSound(payload.number);
    };

    const onParticipantsUpdated = (payload: {
      sessionId: string;
      playersCount: number;
      boardsCount: number;
      potCents: number;
      stakeCents: number;
      potLabel: string;
      stakeLabel: string;
    }) => {
      if (payload.sessionId !== params.sessionId) return;
      setSessionState((prev) =>
        prev
          ? {
              ...prev,
              playersCount: payload.playersCount,
              boardsCount: payload.boardsCount,
              potCents: payload.potCents,
              stakeCents: payload.stakeCents,
              potLabel: payload.potLabel,
              stakeLabel: payload.stakeLabel,
            }
          : prev,
      );
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
      if (audioController.current) {
        audioController.current.unlock();
        void audioController.current.play("/audio/Chewataw tejemerual.m4a", {
          restart: true,
        });
      }
    };

    const onBingoVerified = (payload: {
      sessionId: string;
      winnerUserId: string;
    }) => {
      if (payload.sessionId !== params.sessionId) return;
      setSessionState((prev) =>
        prev
          ? {
              ...prev,
              winnerUserId: payload.winnerUserId,
            }
          : prev,
      );
      setMsg("Bingo verified. Game is finishing.");
    };

    const onFinished = (payload: {
      sessionId: string;
      winnerUserId?: string;
      winnerName?: string;
      potCents?: number;
      reason?: "winner_declared" | "numbers_exhausted" | "stopped_by_operator";
    }) => {
      if (payload.sessionId !== params.sessionId) return;

      const winnerUserId =
        payload.winnerUserId ?? sessionStateRef.current?.winnerUserId ?? null;

      setSessionState((prev) =>
        prev
          ? {
              ...prev,
              status: "finished",
              winnerUserId: winnerUserId ?? prev.winnerUserId,
            }
          : prev,
      );
      setMsg(
        winnerUserId ? "Game finished. Winner announced." : "Game finished.",
      );

      // Redirects are handled only by session_result_ready or viewerResult.
      // Keeping game_finished status-only avoids racing the personalized result.
      void payload.winnerName;
      void payload.potCents;
      void payload.reason;
    };

    const onResultReady = (payload: {
      sessionId: string;
      outcome: "won" | "lost" | "draw";
      targetPath: string;
      winnerUserId: string | null;
      winnerName: string;
      reason: "winner_declared" | "numbers_exhausted" | "stopped_by_operator";
      potCents: number;
    }) => {
      if (payload.sessionId !== params.sessionId) return;

      if (audioController.current) {
        audioController.current.unlock();
        const soundPath =
          payload.outcome === "won"
            ? "/audio/Good bingo.m4a"
            : "/audio/chewataw komual.m4a";
        void audioController.current.play(soundPath, { restart: true });
      }

      persistAndRedirect(
        myBoard,
        payload,
        undefined,
        undefined,
        payload.potCents,
      );
    };

    socket.on("session_snapshot", onSnapshot);
    socket.on("number_called", onNumberCalled);
    socket.on("session_countdown", onCountdown);
    socket.on("session_started", onStarted);
    socket.on("bingo_verified", onBingoVerified);
    socket.on("session_participants_updated", onParticipantsUpdated);
    socket.on("game_finished", onFinished);
    socket.on("session_result_ready", onResultReady);

    return () => {
      socket.off("session_snapshot", onSnapshot);
      socket.off("number_called", onNumberCalled);
      socket.off("session_countdown", onCountdown);
      socket.off("session_started", onStarted);
      socket.off("bingo_verified", onBingoVerified);
      socket.off("session_participants_updated", onParticipantsUpdated);
      socket.off("game_finished", onFinished);
      socket.off("session_result_ready", onResultReady);
      closeSocket();
    };
  }, [myBoard, params.roomId, params.sessionId, router]);

  useEffect(() => {
    if (typeof window === "undefined" || !audioController.current) return;
    // Preload all sounds 1-75
    for (let i = 1; i <= 75; i++) {
      const letter = letterForNumber(i);
      audioController.current.preload(`/audio/sm/${letter}${i}.m4a`, {
        preload: "auto",
      });
    }
    // Preload game start sound
    audioController.current.preload("/audio/Chewataw tejemerual.m4a", {
      preload: "auto",
    });
    // Preload winner/loser sounds
    audioController.current.preload("/audio/Good bingo.m4a", {
      preload: "auto",
    });
    audioController.current.preload("/audio/chewataw komual.m4a", {
      preload: "auto",
    });
    audioController.current.preload("/audio/No bingo.m4a", { preload: "auto" });
    audioController.current.preload("/audio/Board blocked.m4a", {
      preload: "auto",
    });
  }, []);

  useEffect(() => {
    if (!myBoard) return;

    const markedKey = `${MARKED_KEY_PREFIX}${params.sessionId}:${myBoard.id}`;
    const persisted = Array.from(marked).sort((a, b) => a - b);
    sessionStorage.setItem(markedKey, JSON.stringify(persisted));
  }, [marked, myBoard, params.sessionId]);

  const calledMatrix = useMemo(() => calledCellMatrix(), []);

  const calledSet = useMemo(
    () => new Set((sessionState?.recentCalls ?? []).map((x) => x.number)),
    [sessionState],
  );

  const latestCalled = sessionState?.currentNumber ?? null;
  const isWaiting =
    sessionState?.status === "waiting" || sessionState?.status === "countdown";
  const isPlaying = sessionState?.status === "playing";
  const isSessionStarted = isPlaying;
  const latestTarget = latestCalled
    ? `${letterForNumber(latestCalled)}-${latestCalled}`
    : "--";
  const calledNumbers = (sessionState?.recentCalls ?? []).map((x) => x.number);
  const recentCalls = calledNumbers.slice(-5).reverse();
  const lastThreeCalledSet = useMemo(
    () => new Set(calledNumbers.slice(-3)),
    [calledNumbers],
  );
  const stakeValue = (sessionState?.potCents ?? 0) / 100;
  const entryFeeLabel = sessionState?.stakeLabel ?? "0.00";

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

  async function onCallBingo() {
    audioController.current?.unlock();
    if (isBlocked) {
      if (audioController.current) {
        void audioController.current.play("/audio/Board blocked.m4a", { restart: true });
      }
      return;
    }
    if (!myBoard || !sessionState || !isPlaying) {
      setMsg("You can call Bingo only while the game is live.");
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setMsg("Missing auth token.");
      return;
    }

    const pattern = winningPatternFromBoard(
      myBoard.boardMatrix,
      marked,
      calledSet,
    );
    if (!pattern) {
      const blockedKey = `bingo_blocked_${params.sessionId}`;
      const clicksKey = `bingo_clicks_${params.sessionId}`;
      const currentClicks =
        parseInt(localStorage.getItem(clicksKey) || "0", 10) + 1;

      localStorage.setItem(clicksKey, currentClicks.toString());

      if (currentClicks >= 3) {
        localStorage.setItem(blockedKey, "true");
        setIsBlocked(true);
        setMsg(
          "You have been blocked from calling Bingo for too many invalid attempts.",
        );
        if (audioController.current) {
          void audioController.current.play("/audio/Board blocked.m4a", {
            restart: true,
          });
        }
      } else {
        setMsg(
          `No valid winning pattern yet. Attempt ${currentClicks}/3. Keep marking.`,
        );
      }

      if (audioController.current) {
        void audioController.current.play("/audio/No bingo.m4a", {
          restart: true,
        });
      }
      return;
    }

    setClaimingBingo(true);
    setMsg("");

    try {
      const idempotencyKey = `bingo-${sessionState.id}-${myBoard.id}-${Date.now()}`;
      const result = await submitBingoClaim(token, {
        sessionId: sessionState.id,
        boardId: myBoard.id,
        markedCells: Array.from(marked).sort((a, b) => a - b),
        winningPattern: pattern,
        idempotencyKey,
        clientLastSeq: sessionState.currentSeq,
      });

      if (result.winner) {
        setMsg("Bingo accepted. Winner announced.");
      } else {
        setMsg("Bingo rejected by server.");
      }
    } catch {
      setMsg("Bingo claim failed. Please try again.");
    } finally {
      setClaimingBingo(false);
    }
  }

  function toggleMute() {
    if (audioController.current) {
      audioController.current.unlock();
      const nextMuted = audioController.current.toggleMuted();
      setIsMuted(nextMuted);
    }
  }

  async function onLeave() {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      router.push("/");
      return;
    }

    if (isSessionStarted) {
      router.push("/");
      return;
    }

    try {
      await leaveSessionBeforeStart(token, params.sessionId);
      if (myBoard) {
        sessionStorage.removeItem(
          `${MARKED_KEY_PREFIX}${params.sessionId}:${myBoard.id}`,
        );
      }
      sessionStorage.removeItem(`${BOARD_KEY_PREFIX}${params.sessionId}`);
      router.push("/");
    } catch {
      setMsg("Could not leave session right now. Try again.");
    }
  }

  function playNumberSound(n: number) {
    if (!audioController.current) return;
    const letter = letterForNumber(n);
    const src = `/audio/am/${letter}${n}.m4a`;
    void audioController.current.play(src, { restart: true });
  }

  if (!myBoard) {
    return <LiveGameLoader />;
  }

  return (
    <main className="min-h-screen z-1000 w-full bg-[#020815] text-white">
      <div className="relative z-2000 mx-auto flex w-full max-w-md flex-col items-stretch px-3 pb-6 pt-3">
        <div className="mb-2.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1
              className={`text-xl font-bold tracking-tighter ${
                isSessionStarted ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {isSessionStarted ? "Live" : "Waiting"}
            </h1>

            {isSessionStarted ? (
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : null}

            <div className="flex gap-2">
              {!isSessionStarted ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-black italic text-white shadow-lg shadow-blue-500/20">
                  {Math.max(startsIn, 0)}
                </div>
              ) : null}

              <button
                onClick={toggleMute}
                className={`rounded-full p-3 text-sm font-bold transition-colors ${
                  isMuted
                    ? "bg-red-500/20 text-red-500"
                    : "bg-[#1d63ff] text-white"
                }`}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="relative flex flex-col items-start rounded-[8px] border border-emerald-500/20 bg-emerald-500/10 p-2 shadow-lg shadow-emerald-500/5 transition-transform active:scale-95">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500/60">
                Earn
              </span>
              <span className="line-clamp-1 text-md font-bold text-emerald-500">
                {stakeValue.toFixed(2)}
                <span className="ml-2 text-[10px] opacity-60">ETB</span>
              </span>
            </div>

            <div className="relative flex flex-col items-start rounded-[8px] border border-blue-500/20 bg-blue-500/10 p-2 shadow-lg shadow-blue-500/5 transition-transform active:scale-95">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-500/60">
                Entry Fee
              </span>
              <span className="line-clamp-1 text-lg font-black text-blue-500">
                {entryFeeLabel}{" "}
                <span className="text-[10px] opacity-60">ETB</span>
              </span>
            </div>

            <div className="relative flex flex-col items-start rounded-[8px] border border-amber-500/20 bg-amber-500/10 p-2 shadow-lg shadow-amber-500/5 transition-transform active:scale-95">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500/60">
                Balls Out
              </span>
              <span className="line-clamp-1 text-lg font-black text-amber-500">
                {calledNumbers.length}
              </span>
            </div>
          </div>
        </div>

        {showStartSplash ? (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#08122a]/55">
            <div className="animate-pulse rounded-2xl border border-cyan-300/70 bg-[#1d63ff]/95 px-8 py-5 text-4xl font-black tracking-[0.12em] text-cyan-50 shadow-glow">
              START!
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-[43%_57%] gap-3">
          <div className="h-fit rounded-2xl">
            <div className="mb-2 grid grid-cols-5 gap-1">
              {BINGO_LETTERS.map((letter, idx) => (
                <div
                  key={letter}
                  className={`flex h-6 items-center justify-center rounded text-center text-[12px] font-black text-white ${columnColorClass(idx)}`}
                >
                  {letter}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-1">
              {calledMatrix.map((row) =>
                row.map((num, ci) => {
                  const isCalled = calledSet.has(num);
                  const isLatest = num === latestCalled;
                  return (
                    <div
                      key={num}
                      className={`aspect-square rounded-[2px] text-[9px] font-bold transition-all flex items-center justify-center ${
                        isLatest
                          ? `${columnColorClass(ci)} scale-110 z-10 text-white shadow-lg`
                          : isCalled
                            ? "bg-amber-500 text-white"
                            : "border border-white/10 bg-foreground/5 text-foreground/70"
                      }`}
                    >
                      {num}
                    </div>
                  );
                }),
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pr-2">
            <div className="flex flex-col items-center justify-center rounded-[10px] border border-white/10 bg-blue-600 p-2 shadow-lg shadow-blue-500/20">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Target
              </span>
              <span className="text-3xl font-black text-white drop-shadow-md">
                {latestTarget}
              </span>
            </div>

            <div className="no-scrollbar flex min-h-8 justify-center gap-1 overflow-x-auto rounded-[8px] bg-slate-500/20 py-1.5 pb-1">
              {recentCalls.map((n, idx) => (
                <div
                  key={`${n}-${idx}`}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[12px] font-bold text-white shadow-sm ${
                    idx % 5 === 0
                      ? "bg-blue-500"
                      : idx % 5 === 1
                        ? "bg-pink-500"
                        : idx % 5 === 2
                          ? "bg-purple-500"
                          : idx % 5 === 3
                            ? "bg-green-500"
                            : "bg-orange-500"
                  }`}
                >
                  {n}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center justify-center rounded-[10px]">
              <div className="mb-2 grid w-full grid-cols-5 gap-1">
                {BINGO_LETTERS.map((letter, idx) => (
                  <div
                    key={`r-${letter}`}
                    className={`flex h-7 items-center justify-center rounded text-center text-[12px] font-black text-white ${columnColorClass(idx)}`}
                  >
                    {letter}
                  </div>
                ))}
              </div>

              <div className="grid w-full grid-cols-5 gap-1">
                {myBoard.boardMatrix.flat().map((n, idx) => {
                  const isFree = idx === 12;
                  const isMarked = marked.has(idx);
                  const isLast3Called = lastThreeCalledSet.has(n);

                  return (
                    <button
                      key={`${n}-${idx}`}
                      onClick={() => toggleMark(idx, n)}
                      className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[4px] text-xs font-black transition-all ${
                        isFree
                          ? "border border-green-500/40 bg-green-500/20 text-green-500"
                          : isMarked
                            ? "scale-95 bg-blue-600 text-white shadow-md"
                            : isLast3Called
                              ? "animate-pulse border-2 border-blue-500/30 bg-blue-500/30 text-white"
                              : "border border-white/10 bg-foreground/5 text-foreground/70"
                      }`}
                    >
                      {isFree ? <Star size={14} /> : n}
                    </button>
                  );
                })}
              </div>

              <span className="mt-2 text-sm font-medium uppercase leading-tight text-white/70">
                Board #{myBoard.boardNo}
              </span>

              <div className="flex w-full flex-col items-center">
                <button
                  onClick={onCallBingo}
                  disabled={
                    isWaiting || !isPlaying || claimingBingo || isBlocked
                  }
                  className={`mt-2 h-10 w-full text-sm rounded-[8px] font-black tracking-widest text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 ${
                    isBlocked
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isBlocked ? "Blocked" : claimingBingo ? "Checking" : "Bingo"}
                </button>

                <button
                  onClick={onLeave}
                  className="mt-2 h-10 w-full text-sm rounded-[8px] bg-gray-600/50 font-black tracking-widest text-white shadow-md transition-all active:scale-95 hover:bg-gray-700/30"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        </div>

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
