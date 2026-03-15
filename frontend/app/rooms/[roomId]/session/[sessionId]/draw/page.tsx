"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import { prepareGameResult } from "@/lib/game-result";
import { ResultBoard } from "@/components/result-board";
import { RotateCcw } from "lucide-react";

function DrawContent() {
  const router = useRouter();
  const { roomId, sessionId } = useParams() as {
    roomId: string;
    sessionId: string;
  };

  // Fast, memoized result preparation
  const result = useMemo(() => {
    const r = prepareGameResult(sessionId);
    // Draw page: no winner, so winningPositions is always empty
    return { ...r, winningPositions: [] };
  }, [sessionId]);

  return (
    <div className="relative min-h-screen bg-[#0f0f12] text-white flex flex-col items-center overflow-hidden">
      <div className="absolute top-32 w-80 h-80 bg-blue-500/20 blur-[120px] rounded-full animate-pulse" />

      <div className="relative z-10 max-w-[430px] w-full pt-8 pb-20 flex flex-col items-center">
        <div className="text-center">
          <h1 className="text-xl font-bold line-clamp-1">Draw</h1>
          <p className="text-gray-400 text-sm mt-2 line-clamp-1">
            No winner this round.
          </p>
        </div>

        <div className="mt-4 mb-4 bg-white/5 backdrop-blur-md rounded-[10px] mx-auto p-4 py-2 w-[80%] text-sm text-gray-300 border border-white/10 text-center">
          <p>Round finished with no winner.</p>
        </div>

        <ResultBoard
          board={result.board}
          winningPositions={result.winningPositions}
          calledNumbers={result.calledNumbers}
          boardNum={result.boardNum}
        />

        <div className="w-full mt-8 space-y-2 px-12">
          <button
            onClick={() => router.replace(`/rooms/${roomId}`)}
            className="w-full h-10 rounded-[12px] font-medium flex items-center justify-center text-lg bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg"
          >
            <RotateCcw size={18} className="mr-2" /> Play Again
          </button>

          <button
            onClick={() => router.replace(`/rooms`)}
            className="w-full h-10 rounded-[12px] font-medium flex items-center justify-center text-lg bg-white/5 backdrop-blur-md border border-white/10"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DrawPage() {
  return (
    <Suspense fallback={null}>
      <DrawContent />
    </Suspense>
  );
}
