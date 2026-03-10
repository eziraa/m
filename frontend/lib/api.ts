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

export type BoardSelectionState = {
  sessionId: string;
  roomId: string;
  roomName: string;
  status: string;
  startsInSec: number;
  stakeCents: number;
  stakeLabel: string;
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

export type SessionState = {
  id: string;
  roomId: string;
  status: string;
  currentSeq: number;
  currentNumber: number | null;
  winnerUserId: string | null;
  recentCalls: Array<{ seq: number; number: number }>;
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
