"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function BoardSelectionPage() {
  const router = useRouter();
  const params = useParams() as { roomId: string; sessionId: string };

  useEffect(() => {
    void params.sessionId;
    router.replace(`/rooms/${params.roomId}`);
  }, [params.roomId, params.sessionId, router]);

  return (
    <main className="min-h-screen bg-[#020815] text-white">
      <div className="mx-auto max-w-md p-6 text-center text-sm text-cyan-100/80">
        Redirecting to room...
      </div>
    </main>
  );
}
