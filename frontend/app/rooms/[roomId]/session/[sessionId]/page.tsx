"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RefreshCw, Volume2 } from "lucide-react";

import {
  buyBoard,
  fetchBoardSelectionState,
  type BoardSelectionState,
} from "@/lib/api";
import { closeSocket, connectSocket } from "@/lib/socket";

const TOKEN_KEY = "mella_token";
const BOARD_KEY_PREFIX = "mella_board_";

function boardNumbers() {
  return Array.from({ length: 104 }, (_, i) => i + 1);
}

type MyBoard = {
  id: string;
  boardNo: number;
  boardMatrix: number[][];
};

export default function BoardSelectionPage() {
  const router = useRouter();
  const params = useParams() as { roomId: string; sessionId: string };

  const [state, setState] = useState<BoardSelectionState | null>(null);
  const [startsIn, setStartsIn] = useState<number>(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      const token = localStorage.getItem(TOKEN_KEY) || "";
      if (!token) {
        setMsg("Missing auth token. Open from home screen.");
        return;
      }

      try {
        const s = await fetchBoardSelectionState(token, params.sessionId);
        if (!alive) return;
        setState(s);
        setStartsIn(s.startsInSec);
      } catch {
        if (!alive) return;
        setMsg("Failed to load board selection state.");
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [params.sessionId]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) return;

    const socket = connectSocket(token);
    socket.emit("join_session", { sessionId: params.sessionId });

    const onCountdown = (payload: {
      sessionId: string;
      secondsLeft: number;
    }) => {
      if (payload.sessionId !== params.sessionId) return;
      setStartsIn(payload.secondsLeft);
      setState((prev) => (prev ? { ...prev, status: "countdown" } : prev));
    };

    const onStarted = (payload: { sessionId: string }) => {
      if (payload.sessionId !== params.sessionId) return;
      setStartsIn(0);
      setState((prev) => (prev ? { ...prev, status: "playing" } : prev));
    };

    socket.on("session_countdown", onCountdown);
    socket.on("session_started", onStarted);

    return () => {
      socket.off("session_countdown", onCountdown);
      socket.off("session_started", onStarted);
      closeSocket();
    };
  }, [params.sessionId]);

  const numbers = useMemo(() => boardNumbers(), []);
  const canJoin = state?.status === "waiting" || state?.status === "countdown";

  async function onJoin() {
    if (!picked || !state || !canJoin) return;

    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token) {
      setMsg("Missing auth token.");
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
        setMsg("Join succeeded but board was not returned.");
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

      router.push(`/rooms/${params.roomId}/session/${params.sessionId}/game`);
    } catch {
      setMsg("Could not join. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-star-grid text-white">
      <div className="star-noise fixed inset-0 pointer-events-none" />
      <div className="relative mx-auto max-w-md px-4 pb-28 pt-4">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-5xl font-black leading-none tracking-tight">
            Choose board
          </h1>
          <div className="flex gap-2">
            <button className="rounded-full border border-cyan-400/40 bg-[#062356] px-3 py-2">
              <RefreshCw size={16} />
            </button>
            <button className="rounded-full border border-cyan-400/40 bg-[#062356] px-3 py-2">
              <Volume2 size={16} />
            </button>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#2f7cff] p-3">
            <p className="text-[11px] font-semibold tracking-[0.13em] text-cyan-50/85">
              EARN
            </p>
            <p className="mt-1 text-4xl font-black">
              0.00 <span className="text-lg">ETB</span>
            </p>
          </div>
          <div className="rounded-xl bg-[#5f5df0] p-3">
            <p className="text-[11px] font-semibold tracking-[0.13em] text-cyan-50/85">
              STAKE
            </p>
            <p className="mt-1 text-4xl font-black">
              {state?.stakeLabel || "0.00"} <span className="text-lg">ETB</span>
            </p>
          </div>
          <div className="rounded-xl bg-[#ff2e46] p-3">
            <p className="text-[11px] font-semibold tracking-[0.13em] text-cyan-50/85">
              STARTS IN
            </p>
            <p className="mt-1 text-4xl font-black">{Math.max(startsIn, 0)}s</p>
          </div>
        </section>

        <section className="grid grid-cols-8 gap-2">
          {numbers.map((n) => {
            const active = picked === n;
            return (
              <button
                key={n}
                onClick={() => setPicked(n)}
                className={`h-14 rounded-md border text-sm font-bold transition ${
                  active
                    ? "border-cyan-300 bg-cyan-500/25 text-cyan-100"
                    : "border-slate-400/40 bg-[#07142c]/80 text-white"
                }`}
              >
                {n}
              </button>
            );
          })}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cyan-500/25 bg-[#09172f]/95 px-4 pb-[calc(8px+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            disabled={!picked || busy || !canJoin}
            onClick={onJoin}
            className="w-full rounded-2xl bg-[#2d6ded] py-4 text-xl font-bold tracking-[0.12em] text-white disabled:opacity-50"
          >
            {busy ? "Joining..." : canJoin ? "Join" : "Session Closed"}
          </button>
          {msg ? (
            <p className="mt-2 text-center text-xs text-cyan-100/80">{msg}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
