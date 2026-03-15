import type { HomeSnapshot } from "@/types/home";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export async function verifyTelegramAndGetToken(
  initData: string,
): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/telegram/verify-init-data`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ initData }),
  });

  if (!res.ok) {
    throw new Error("telegram_auth_failed");
  }

  const json = (await res.json()) as { token: string };
  return json.token;
}

export async function signupLocalDev(input: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  referralCode?: string;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/local/signup`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error("local_signup_failed");
  }

  const json = (await res.json()) as { token: string };
  return json.token;
}

export async function loginLocalDev(input: {
  email: string;
  password: string;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/local/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error("local_login_failed");
  }

  const json = (await res.json()) as { token: string };
  return json.token;
}

export async function fetchHomeSnapshot(token: string): Promise<HomeSnapshot> {
  const res = await fetch(`${API_BASE}/mini/home`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("home_fetch_failed");
  }

  const json = (await res.json()) as HomeSnapshot & { ok: boolean };
  return {
    version: json.version,
    generatedAt: json.generatedAt,
    home: json.home,
  };
}

export function getApiBase() {
  return API_BASE;
}

export type ViewerResult = {
  outcome: "won" | "lost" | "draw";
  targetPath: string;
  winnerUserId: string | null;
  winnerName: string;
  reason: "winner_declared" | "numbers_exhausted" | "stopped_by_operator";
};

export type BoardSelectionState = {
  sessionId: string;
  roomId: string;
  roomName: string;
  status: string;
  startsInSec: number;
  stakeCents: number;
  stakeLabel: string;
  viewerResult: ViewerResult | null;
};

export async function fetchBoardSelectionState(
  token: string,
  sessionId: string,
): Promise<BoardSelectionState> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/board-selection`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("board_selection_fetch_failed");
  }

  const json = (await res.json()) as {
    ok: boolean;
    state: BoardSelectionState;
  };
  return json.state;
}

export async function resolveActiveSessionByRoomName(
  token: string,
  roomName: string,
): Promise<BoardSelectionState> {
  const res = await fetch(`${API_BASE}/sessions/resolve-active`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roomName }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("resolve_active_session_failed");
  }

  const json = (await res.json()) as {
    ok: boolean;
    state: BoardSelectionState;
  };

  return json.state;
}

export async function resolveActiveSessionByRoomId(
  token: string,
  roomId: string,
): Promise<BoardSelectionState> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/active-session`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("resolve_active_session_failed");
  }

  const json = (await res.json()) as {
    ok: boolean;
    state: BoardSelectionState;
  };

  return json.state;
}

export async function buyBoard(
  token: string,
  input: { sessionId: string; quantity: number; idempotencyKey: string },
) {
  const res = await fetch(`${API_BASE}/sessions/boards/buy`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error("board_buy_failed");
  }

  return (await res.json()) as {
    ok: boolean;
    boards: Array<{
      id: string;
      boardNo: number;
      boardMatrix: number[][];
    }>;
  };
}

export async function leaveSessionBeforeStart(
  token: string,
  sessionId: string,
) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/leave`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("session_leave_failed");
  }

  return (await res.json()) as {
    ok: boolean;
    removedBoards: number;
    status: string;
    stakeCents: number;
    stakeLabel: string;
    playersCount: number;
    boardsCount: number;
    potCents: number;
    potLabel: string;
  };
}

export type SessionState = {
  id: string;
  roomId: string;
  status: string;
  currentSeq: number;
  currentNumber: number | null;
  winnerUserId: string | null;
  recentCalls: Array<{ seq: number; number: number }>;
  playersCount?: number;
  boardsCount?: number;
  potCents?: number;
  stakeCents?: number;
  potLabel?: string;
  stakeLabel?: string;
  viewerResult: ViewerResult | null;
};

export async function fetchSessionState(
  token: string,
  sessionId: string,
): Promise<SessionState> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/state`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("session_state_fetch_failed");
  }

  const json = (await res.json()) as {
    ok: boolean;
    state: SessionState;
  };

  return json.state;
}

export type WinningPatternInput = {
  type: "row" | "column" | "diagonal" | "full_house";
  index?: number;
  diagonal?: "main" | "anti";
};

export async function submitBingoClaim(
  token: string,
  input: {
    sessionId: string;
    boardId: string;
    markedCells: number[];
    winningPattern: WinningPatternInput;
    idempotencyKey: string;
    clientLastSeq: number;
  },
) {
  const res = await fetch(`${API_BASE}/sessions/bingo-claims`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error("bingo_claim_failed");
  }

  return (await res.json()) as {
    ok: boolean;
    replay: boolean;
    claim: {
      id: string;
      status: "accepted" | "rejected";
      rejectionReason: string | null;
    };
    winner: {
      sessionId: string;
      userId: string;
    } | null;
  };
}
