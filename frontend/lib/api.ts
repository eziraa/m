import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HomeSnapshot } from "@/types/home";
import type {
  Post,
  PostCategory,
  PostDelivery,
  PostRecipient,
  Transaction,
  TransactionType,
  WalletData,
  Withdrawal,
  WithdrawalEligibility,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("mella_token") || "";
}

function getAuthPayload(): Record<string, unknown> | null {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getAuthRole() {
  const payload = getAuthPayload();
  return typeof payload?.role === "string" ? payload.role : null;
}

function getScopedEndpoint(adminPath: string, agentPath: string) {
  return getAuthRole() === "ADMIN" ? adminPath : agentPath;
}

async function readJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export async function verifyTelegramAndGetToken(input: {
  initData: string;
  startParam?: string;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/telegram/verify-init-data`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
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

export type RoomItem = {
  id: string;
  name: string;
  description: string | null;
  boardPriceCents: number;
  price: string;
  color: string;
  icon: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  botAllowed: boolean | number;
  isLive: boolean;
  sessionId: string | null;
  sessionStatus: string;
  playersCount: number;
};

export async function fetchRooms(token: string): Promise<RoomItem[]> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("rooms_fetch_failed");
  }

  const json = (await res.json()) as { rooms: RoomItem[] };
  return json.rooms;
}

export async function fetchRoomsForAgent(token: string): Promise<RoomItem[]> {
  const res = await fetch(`${API_BASE}/agent/rooms`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("rooms_fetch_failed");
  }

  const json = (await res.json()) as { rooms: RoomItem[] };
  return json.rooms;
}

export type AgentPaymentMethodRow = {
  id: string;
  kind: "cbe" | "telebirr" | "other";
  accountNumber: string;
  holderName: string;
  sortOrder: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchAgentPaymentMethodsForAgent(
  token: string,
): Promise<AgentPaymentMethodRow[]> {
  const res = await fetch(`${API_BASE}/agent/payment-methods`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("agent_payment_methods_fetch_failed");
  }

  const json = (await res.json()) as {
    paymentMethods: AgentPaymentMethodRow[];
  };
  return json.paymentMethods;
}

/** Deposit instructions for the current user's agent (USER token). */
export async function fetchAgentPaymentMethodsForDeposit(
  token: string,
): Promise<AgentPaymentMethodRow[]> {
  const res = await fetch(`${API_BASE}/wallet/agent-payment-methods`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("agent_payment_methods_fetch_failed");
  }

  const json = (await res.json()) as {
    paymentMethods: AgentPaymentMethodRow[];
  };
  return json.paymentMethods;
}

export type WalletSummary = {
  currency: string;
  balanceCents: number;
  bonusCents: number;
};

export async function fetchWallet(token: string): Promise<WalletSummary> {
  const res = await fetch(`${API_BASE}/me/wallet`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("wallet_fetch_failed");
  }

  const json = (await res.json()) as { ok: boolean; wallet: WalletSummary };
  return json.wallet;
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
  netPayoutPreviewCents?: number;
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
  type: "row" | "column" | "diagonal" | "full_house" | "corners";
  index?: number;
  diagonal?: "main" | "anti";
  lineIndices?: number[];
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
      winnerName: string;
      payoutCents: number;
    } | null;
  };
}

export type SessionWinnerResult = {
  sessionId: string;
  roomId: string;
  winnerUserId: string;
  winnerName: string;
  pattern: "row" | "column" | "diagonal" | "full_house" | "corners";
  boardNo: number;
  boardMatrix: number[][];
  markedCells: number[];
  calledNumbers: number[];
  potCents: number;
};

export async function fetchSessionWinnerResult(
  token: string,
  sessionId: string,
): Promise<SessionWinnerResult> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/result`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("session_result_fetch_failed");
  }

  const json = (await res.json()) as {
    ok: boolean;
    result: SessionWinnerResult;
  };

  return json.result;
}

export async function fetchTransactions(
  token: string,
  tab: string = "all",
): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE}/me/wallet/transactions`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("transactions_fetch_failed");
  const json = await res.json();
  const txs = (json.transactions || []).map((ledger: any) => {
    let type: TransactionType = "bonus";
    switch (ledger.entryType) {
      case "deposit":
        type = "deposit";
        break;
      case "withdrawal":
        type = "withdrawal";
        break;
      case "adjustment":
        type = "adjustment";
        break;
      case "session_win":
        type = "game_win";
        break;
      case "board_purchase":
        type = "game_lost";
        break;
      case "commission":
        type = "referral_commission";
        break;
      case "referral_reward":
        type = "referral_reward";
        break;
    }
    return {
      id: ledger.id,
      type,
      amount: (ledger.amountCents / 100).toFixed(2),
      status: ledger.status === "posted" ? "completed" : "failed",
      description: ledger.metadata?.phone || ledger.entryType,
      createdAt: ledger.createdAt,
    } as Transaction;
  });

  if (tab === "in")
    return txs.filter((t: any) => parseFloat(String(t.amount)) > 0);
  if (tab === "out")
    return txs.filter((t: any) => parseFloat(String(t.amount)) < 0);
  return txs;
}

export function useGetWalletQuery(_?: any, options?: { skip?: boolean }) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["wallet"],
    queryFn: () => fetchWallet(token),
    enabled: !options?.skip && !!token,
  });
  return {
    data: query.data
      ? {
          balance: query.data.balanceCents / 100,
          bonus: query.data.bonusCents / 100,
          currency: query.data.currency,
        }
      : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useGetRoomsQuery(options?: { skip?: boolean }) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/rooms`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("rooms_fetch_failed");
      }
      const json = (await res.json()) as { rooms: RoomItem[] };
      return json.rooms;
    },
    enabled: !options?.skip && !!token,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useGetAdminRoomsQuery(args?: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["admin-rooms", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args ?? {}).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          !(typeof value === "string" && value === "")
        ) {
          params.set(key, String(value));
        }
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/admin/rooms${suffix}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_admin_rooms_failed");
      return res.json() as Promise<{
        rooms: RoomItem[];
        total: number;
        page: number;
        pageSize: number;
      }>;
    },
    enabled: !!token,
  });
}

export function useGetRoomsForAgentQuery(options?: { skip?: boolean }) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["rooms", "agent"],
    queryFn: () => fetchRoomsForAgent(token),
    enabled: !options?.skip && !!token,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useAgentPaymentMethodsAgentQuery(options?: {
  skip?: boolean;
}) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["agent", "payment-methods"],
    queryFn: () => fetchAgentPaymentMethodsForAgent(token),
    enabled: !options?.skip && !!token,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useAgentPaymentMethodsDepositQuery(options?: {
  skip?: boolean;
}) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["wallet", "agent-payment-methods"],
    queryFn: () => fetchAgentPaymentMethodsForDeposit(token),
    enabled: !options?.skip && !!token,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useCreateAgentPaymentMethodMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: {
      kind: "cbe" | "telebirr" | "other";
      accountNumber: string;
      holderName: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/agent/payment-methods`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return data as { paymentMethod: AgentPaymentMethodRow };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", "payment-methods"] });
    },
  });

  const mutate = (input: Parameters<typeof mutation.mutateAsync>[0]) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };

  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useUpdateAgentPaymentMethodMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: {
      id: string;
      kind?: "cbe" | "telebirr" | "other";
      accountNumber?: string;
      holderName?: string;
      sortOrder?: number;
      isActive?: boolean;
    }) => {
      const { id, ...body } = input;
      const res = await fetch(`${API_BASE}/agent/payment-methods/${id}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return data as { paymentMethod: AgentPaymentMethodRow };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", "payment-methods"] });
    },
  });

  const mutate = (input: Parameters<typeof mutation.mutateAsync>[0]) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };

  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useDeleteAgentPaymentMethodMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/agent/payment-methods/${id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent", "payment-methods"] });
    },
  });

  const mutate = (id: string) => {
    const promise = mutation.mutateAsync(id);
    return Object.assign(promise, { unwrap: () => promise });
  };

  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetTransactionsQuery(
  tab: string = "all",
  options?: { skip?: boolean },
) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["transactions", tab],
    queryFn: () => fetchTransactions(token, tab),
    enabled: !options?.skip && !!token,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useDepositMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: { amount: number }) => {
      const res = await fetch(`${API_BASE}/wallet/deposit`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return { ...data, success: data.ok };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const mutate = (input: { amount: number }) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };

  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useWithdrawMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: { amount: number; method: string }) => {
      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return { ...data, success: data.ok };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const mutate = (input: { amount: number; method: string }) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };

  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useCreateWithdrawalMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: { amount: number; phone: string }) => {
      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return { ...data, success: data.ok };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    },
  });

  const mutate = (input: { amount: number; phone: string }) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };

  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetUserWithdrawalsQuery(
  _?: any,
  options?: { skip?: boolean },
) {
  const { data, isLoading } = useGetTransactionsQuery("all", options);
  return {
    data: {
      withdrawals:
        (data
          ?.filter((t: Transaction) => t.type === "withdrawal")
          .map((t: Transaction) => ({
            id: t.id,
            amount: t.amount,
            phone: t.description || "",
            status: (t.status === "completed"
              ? "approved"
              : t.status === "rejected"
                ? "rejected"
                : "pending") as Withdrawal["status"],
            rejectionReason: null,
            createdAt: t.createdAt,
          })) as Withdrawal[]) || [],
    },
    isLoading,
  };
}

export function useGetWithdrawalEligibilityQuery(
  _?: any,
  options?: { skip?: boolean },
) {
  const { data: wallet } = useGetWalletQuery(undefined, options);
  return {
    data: {
      eligible: (wallet?.balance || 0) >= 100,
      balance: wallet?.balance || 0,
      minWithdrawalAmount: 100,
      minAccountLeft: 50,
      minDepositRequired: 50,
      gamesRequired: 20,
      gamesPlayed: 10,
      totalDeposit: 50,
      hasPending: false,
    },
    isLoading: false,
  };
}

export function useLogoutMutation() {
  const mutation = useMutation({
    mutationFn: async () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("mella_token");
        localStorage.removeItem("auth_token");
      }
      return { success: true };
    },
  });

  const mutate = (input: any) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };

  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetGameStatsQuery(_?: any, options?: { skip?: boolean }) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["game-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/me/dashboard`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("stats_fetch_failed");
      const json = await res.json();
      return {
        played: json.dashboard?.totalTransactions || 0,
        won: Math.floor((json.dashboard?.winsCents || 0) / 1000), // Mocking win count from cents
      };
    },
    enabled: !options?.skip && !!token,
  });
  return { data: query.data, isLoading: query.isLoading };
}

export function useApproveDepositMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: {
      sms_content: string;
      promoCode?: string;
    }) => {
      const res = await fetch(`${API_BASE}/payments/submit`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return { ...data, success: data.ok || data.success };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const mutate = (input: any) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };

  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useLoginLocalMutation() {
  const mutation = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      loginLocalDev(input),
  });
  return mutation;
}

export function useSignupLocalMutation() {
  const mutation = useMutation({
    mutationFn: (input: {
      email: string;
      password: string;
      firstName?: string;
      referralCode?: string;
    }) => signupLocalDev(input),
  });
  return mutation;
}

export function useVerifyTelegramMutation() {
  const mutation = useMutation({
    mutationFn: (input: { initData: string; startParam?: string }) =>
      verifyTelegramAndGetToken(input),
  });
  return mutation;
}

export async function fetchReferralCode(
  token: string,
): Promise<{ referralCode: string | null }> {
  const res = await fetch(`${API_BASE}/me/referral`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("referral_fetch_failed");
  }

  const json = await res.json();
  return json;
}

export function useGetReferralCodeQuery(options?: { skip?: boolean }) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["referral-code"],
    queryFn: () => fetchReferralCode(token),
    enabled: !options?.skip && !!token,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ── AGENT DASHBOARD HOOKS ────────────────────────────────────────────

export function useDeleteRoomMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${API_BASE}${getScopedEndpoint(`/rooms/${id}`, `/agent/rooms/${id}`)}`,
        {
          method: "DELETE",
          headers: { authorization: `Bearer ${getAuthToken()}` },
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
  const mutate = (id: string) => {
    const promise = mutation.mutateAsync(id);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useToggleRoomBotsMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      id,
      botAllowed,
    }: {
      id: string;
      botAllowed: boolean;
    }) => {
      const res = await fetch(
        `${API_BASE}${getScopedEndpoint(
          `/rooms/${id}/bot-allowed`,
          `/agent/rooms/${id}/bot-allowed`,
        )}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ botAllowed }),
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
  const mutate = (args: { id: string; botAllowed: boolean }) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useCreateRoomMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      price: string;
      minPlayers: number;
      maxPlayers: number;
      color: string;
      icon: string;
    }) => {
      const res = await fetch(
        `${API_BASE}${getScopedEndpoint("/rooms", "/agent/rooms")}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify(input),
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
  const mutate = (input: any) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useUpdateRoomMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      description?: string;
      price?: string;
      minPlayers?: number;
      maxPlayers?: number;
      color?: string;
      icon?: string;
    }) => {
      const res = await fetch(
        `${API_BASE}${getScopedEndpoint(`/rooms/${id}`, `/agent/rooms/${id}`)}`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify(input),
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
  const mutate = (input: any) => {
    const promise = mutation.mutateAsync(input);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetAgentUsersQuery(args: any, options?: { skip?: boolean }) {
  const token = getAuthToken();
  const query = useQuery({
    queryKey: ["agent-users", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", args.page.toString());
      if (args.pageSize) params.set("limit", args.pageSize.toString());
      if (args.search) params.set("search", args.search);
      if (args.role && args.role !== "all") params.set("role", args.role);
      if (args.sortBy) params.set("sortBy", args.sortBy);
      if (args.sortOrder) params.set("sortOrder", args.sortOrder);

      const res = await fetch(`${API_BASE}/agent/users?${params.toString()}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch_users_failed");
      return res.json();
    },
    enabled: !!token && !options?.skip,
  });
  return query;
}

export function useCreateAgentBalanceAdjustmentMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      userId,
      amount,
      note,
    }: {
      userId: string;
      amount: number;
      note?: string;
    }) => {
      const res = await fetch(
        `${API_BASE}/agent/users/${userId}/balance-adjustments`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ amount, note }),
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent-users"] });
      queryClient.invalidateQueries({
        queryKey: ["agent-user", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["agent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["agent-transaction-stats"] });
    },
  });
  const mutate = (args: {
    userId: string;
    amount: number;
    note?: string;
  }) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${API_BASE}${getScopedEndpoint(`/admin/users/${id}`, `/agent/users/${id}`)}`,
        {
          method: "DELETE",
          headers: { authorization: `Bearer ${getAuthToken()}` },
        },
      );
      if (!res.ok) throw new Error("delete_user_failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
  const mutate = (id: string) => {
    const promise = mutation.mutateAsync(id);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetAgentPaymentsQuery(
  args: any,
  options?: { skip?: boolean },
) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["agent-payments", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v));
      });
      const res = await fetch(
        `${API_BASE}/agent/payments?${params.toString()}`,
        {
          headers: { authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("fetch_payments_failed");
      return res.json();
    },
    enabled: !!token && !options?.skip,
  });
}

export function useGetAgentPaymentStatsQuery(args?: any) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["agent-payment-stats", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (args) {
        Object.entries(args).forEach(([k, v]) => {
          if (v !== undefined) params.set(k, String(v));
        });
      }
      const res = await fetch(
        `${API_BASE}/agent/payments/stats?${params.toString()}`,
        {
          headers: { authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("fetch_payment_stats_failed");
      return res.json();
    },
    enabled: !!token,
  });
}

export function useGetAgentWithdrawalsQuery(args: any) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["withdrawals", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v));
      });
      const res = await fetch(
        `${API_BASE}/agent/withdrawals?${params.toString()}`,
        {
          headers: { authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("fetch_withdrawals_failed");
      return res.json();
    },
    enabled: !!token,
  });
}

export function useApproveWithdrawalMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(
        `${API_BASE}${getScopedEndpoint(
          `/admin/withdrawals/${id}/approve`,
          `/agent/withdrawals/${id}/approve`,
        )}`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${getAuthToken()}` },
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return { success: true, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
  const mutate = (id: string) => {
    const promise = mutation.mutateAsync(id);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useRejectWithdrawalMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(
        `${API_BASE}${getScopedEndpoint(
          `/admin/withdrawals/${id}/reject`,
          `/agent/withdrawals/${id}/reject`,
        )}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ reason }),
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return { success: true, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
  });
  const mutate = (args: any) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetAgentTransactionsQuery(
  args: any,
  options?: { skip?: boolean },
) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["agent-transactions", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v));
      });
      const res = await fetch(
        `${API_BASE}/agent/transactions?${params.toString()}`,
        {
          headers: { authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("fetch_transactions_failed");
      return res.json();
    },
    enabled: !!token && !options?.skip,
  });
}

export function useGetAgentTransactionStatsQuery() {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["agent-transaction-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/agent/transactions/stats`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch_transaction_stats_failed");
      const data = await res.json();
      return {
        totalDeposit: Number(data.totalWins || 0), // Mock mapping to UI fields
        totalWithdrawal: Number(data.totalLosses || 0),
        netProfit: Number(data.totalCommissions || 0),
        totalBonus: 0,
        totalCommission: Number(data.totalCommissions || 0),
        totalReward: 0,
        totalReferralReward: 0,
      };
    },
    enabled: !!token,
  });
}

export function useDeleteAgentTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // Note: Backend endpoint for deleting transaction not yet implemented in agentRouter
      // Adding it for UI compatibility, but it will return 404 until implemented
      const res = await fetch(`${API_BASE}/agent/transactions/${id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-transactions"] });
    },
  });
  const mutate = (args: any) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetAgentUserDetailQuery(
  id: string,
  options?: { skip?: boolean },
) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["agent-user", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/agent/users/${id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("fetch_user_detail_failed");
      return res.json();
    },
    enabled: !!token && !options?.skip,
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(
        `${API_BASE}${getScopedEndpoint(
          `/admin/users/${id}/role`,
          `/agent/users/${id}/role`,
        )}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({ role }),
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: (_data: unknown, variables: { id: string; role: string }) => {
      queryClient.invalidateQueries({ queryKey: ["agent-user", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["agent-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
  const mutate = (args: any) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export type GameConfig = {
  key: string;
  label: string;
  value: string;
  description?: string;
  kind: "amount" | "fraction" | "integer";
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AdminBonusSetting = {
  slug: "welcome_bonus" | "bonus";
  amount?: number;
  description?: string | null;
  message?: string | null;
  isActive?: boolean;
};

export function useGetAdminUsersQuery(
  args?: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: string;
  },
  options?: { skip?: boolean },
) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["admin-users", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args ?? {}).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          !(typeof value === "string" && value === "")
        ) {
          params.set(key, String(value));
        }
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/admin/users${suffix}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_admin_users_failed");
      return res.json();
    },
    enabled: !!token && !options?.skip,
  });
}

export function useGetAdminUserDetailQuery(
  id: string,
  options?: { skip?: boolean },
) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_admin_user_failed");
      return res.json();
    },
    enabled: !!token && !!id && !options?.skip,
  });
}

export function useGetAdminWithdrawalsQuery(args?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  pageSize?: number;
}) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["admin-withdrawals", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args ?? {}).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          !(typeof value === "string" && value === "")
        ) {
          params.set(key, String(value));
        }
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/admin/withdrawals${suffix}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_admin_withdrawals_failed");
      return res.json();
    },
    enabled: !!token,
  });
}

export function useGetAdminTransactionsQuery(args?: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
  status?: string;
}) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["admin-transactions", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/admin/transactions${suffix}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_admin_transactions_failed");
      return res.json();
    },
    enabled: !!token,
  });
}

export function useGetAdminTransactionStatsQuery() {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["admin-transaction-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/transactions/stats`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_admin_transaction_stats_failed");
      return res.json();
    },
    enabled: !!token,
  });
}

export function useDeleteAdminTransactionMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`${API_BASE}/admin/transactions/${id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transaction-stats"] });
    },
  });
  const mutate = (args: { id: string }) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetAdminBonusesQuery(options?: { skip?: boolean }) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["admin-bonuses"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/bonuses`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_admin_bonuses_failed");
      return res.json() as Promise<{ bonuses: AdminBonusSetting[] }>;
    },
    enabled: !!token && !options?.skip,
  });
}

export function useUpdateAdminBonusMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      slug,
      ...input
    }: {
      slug: string;
      amount?: number;
      description?: string;
      message?: string;
      isActive?: boolean;
    }) => {
      const res = await fetch(`${API_BASE}/admin/bonuses/${slug}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(input),
      });
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bonuses"] });
    },
  });
  const mutate = (args: any) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGrantAdminBonusMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: {
      target: "all" | "user" | "users";
      userId?: string;
      userIds?: string[];
      amount?: number;
      message?: string;
    }) => {
      const res = await fetch(`${API_BASE}/admin/bonuses/grant`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(input),
      });
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-transaction-stats"] });
    },
  });
  const mutate = (args: any) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetGameConfigQuery(options?: { skip?: boolean }) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["admin-game-config"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/game-config`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_game_config_failed");
      return res.json() as Promise<{ configs: GameConfig[] }>;
    },
    enabled: !!token && !options?.skip,
  });
}

export function useUpdateGameConfigMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      key,
      data,
    }: {
      key: string;
      data: { value: string | number };
    }) => {
      const res = await fetch(`${API_BASE}/admin/game-config/${key}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(data),
      });
      const json = await readJson(res);
      if (!res.ok) throw { data: json };
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-game-config"] });
    },
  });
  const mutate = (args: { key: string; data: { value: string | number } }) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetPostCategoriesQuery(options?: { skip?: boolean }) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["post-categories"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/post-categories`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_post_categories_failed");
      const data = (await res.json()) as { categories: PostCategory[] };
      return data.categories;
    },
    enabled: !!token && !options?.skip,
  });
}

export function useGetPostsQuery(args?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["posts", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/admin/posts${suffix}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_posts_failed");
      return (await res.json()) as {
        posts: Post[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
    enabled: !!token,
  });
}

export function useGetScheduledPostsQuery(args?: {
  page?: number;
  pageSize?: number;
}) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["scheduled-posts", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args ?? {}).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          !(typeof value === "string" && value === "")
        ) {
          params.set(key, String(value));
        }
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/admin/posts/scheduled${suffix}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_scheduled_posts_failed");
      return (await res.json()) as {
        posts: Post[];
        total: number;
        page: number;
        pageSize: number;
      };
    },
    enabled: !!token,
  });
}

export function useGetPostDetailQuery(
  id: string,
  options?: { skip?: boolean },
) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/posts/${id}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_post_detail_failed");
      return res.json() as Promise<{
        post: Post;
        analytics: {
          total: number;
          totalRecipients: number;
          sent: number;
          failed: number;
          pending: number;
          deliveryRate: number;
        };
      }>;
    },
    enabled: !!token && !!id && !options?.skip,
  });
}

export function useGetPostDeliveriesQuery(args: {
  postId: string;
  page?: number;
  limit?: number;
}) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["post-deliveries", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (args.page) params.set("page", String(args.page));
      if (args.limit) params.set("limit", String(args.limit));
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(
        `${API_BASE}/admin/posts/${args.postId}/deliveries${suffix}`,
        {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("fetch_post_deliveries_failed");
      return res.json() as Promise<{
        deliveries: PostDelivery[];
        total: number;
      }>;
    },
    enabled: !!token && !!args.postId,
  });
}

export function useGetDeliveryLogQuery(args?: {
  page?: number;
  limit?: number;
}) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["delivery-log", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args ?? {}).forEach(([key, value]) => {
        if (value !== undefined) params.set(key, String(value));
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/admin/delivery-log${suffix}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch_delivery_log_failed");
      return res.json() as Promise<{
        deliveries: PostDelivery[];
        total: number;
      }>;
    },
    enabled: !!token,
  });
}

export function useGetBroadcastStatusQuery(
  postId: string,
  options?: { skip?: boolean; pollingInterval?: number },
) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["broadcast-status", postId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/admin/posts/${postId}/broadcast-status`,
        {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("fetch_broadcast_status_failed");
      return res.json();
    },
    enabled: !!token && !!postId && !options?.skip,
    refetchInterval: options?.pollingInterval || false,
  });
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: Partial<Post>) => {
      const res = await fetch(`${API_BASE}/admin/posts`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(input),
      });
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
    },
  });
  const mutate = (args: Partial<Post>) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useUpdatePostMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    unknown,
    unknown,
    { id: string; data: Partial<Post> }
  >({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Post> }) => {
      const res = await fetch(`${API_BASE}/admin/posts/${id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(data),
      });
      const json = await readJson(res);
      if (!res.ok) throw { data: json };
      return json;
    },
    onSuccess: (_data: unknown, variables: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.id] });
    },
  });
  const mutate = (args: { id: string; data: Partial<Post> }) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/admin/posts/${id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-log"] });
    },
  });
  const mutate = (id: string) => {
    const promise = mutation.mutateAsync(id);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useSendPostMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`${API_BASE}/admin/posts/${id}/send`, {
        method: "POST",
        headers: { authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: (_data: unknown, variables: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["post-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-log"] });
      queryClient.invalidateQueries({
        queryKey: ["broadcast-status", variables.id],
      });
    },
  });
  const mutate = (args: { id: string }) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetPostRecipientsQuery(args: {
  postId: string;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  deletionStatus?: string;
  search?: string;
}) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["post-recipients", args],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(args).forEach(([key, value]) => {
        if (key !== "postId" && value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      });
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(
        `${API_BASE}/admin/posts/${args.postId}/recipients${suffix}`,
        {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("fetch_post_recipients_failed");
      return res.json() as Promise<{
        recipients: PostRecipient[];
        total: number;
      }>;
    },
    enabled: !!token && !!args.postId,
  });
}

export function useDeleteBroadcastMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      mode: "selected" | "all" | "date_range";
      userIds?: string[];
      fromDate?: string;
      toDate?: string;
    }) => {
      const res = await fetch(
        `${API_BASE}/admin/posts/${id}/delete-broadcast`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify(input),
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-recipients"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-log"] });
    },
  });
  const mutate = (args: any) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useGetDeleteBroadcastStatusQuery(
  args: { id: string; jobId: string },
  options?: { skip?: boolean; pollingInterval?: number },
) {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["delete-broadcast-status", args],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/admin/posts/${args.id}/delete-broadcast-status/${args.jobId}`,
        {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("fetch_delete_broadcast_status_failed");
      return res.json();
    },
    enabled: !!token && !options?.skip && !!args.id && !!args.jobId,
    refetchInterval: options?.pollingInterval || false,
  });
}

export function useCancelDeleteBroadcastMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const res = await fetch(
        `${API_BASE}/admin/posts/${id}/delete-broadcast-cancel/${jobId}`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${getAuthToken()}` },
        },
      );
      const data = await readJson(res);
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delete-broadcast-status"] });
    },
  });
  const mutate = (args: { id: string; jobId: string }) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useSubmitTelebirrPaymentMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ sms_content }: { sms_content: string }) => {
      const res = await fetch(`${API_BASE}/agent/payments/submit-telebirr`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ sms_content }),
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["agent-payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["agent-transactions"] });
    },
  });
  const mutate = (args: any) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}

export function useSubmitCBEPaymentMutation() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ sms_content }: { sms_content: string }) => {
      const res = await fetch(`${API_BASE}/agent/payments/submit-cbe`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ sms_content }),
      });
      const data = await res.json();
      if (!res.ok) throw { data };
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["agent-payment-stats"] });
      queryClient.invalidateQueries({ queryKey: ["agent-transactions"] });
    },
  });
  const mutate = (args: any) => {
    const promise = mutation.mutateAsync(args);
    return Object.assign(promise, { unwrap: () => promise });
  };
  return [mutate, { isLoading: mutation.isPending }] as const;
}
