type SearchParamReader = Pick<URLSearchParams, "get">;

export type PreparedGameResult = {
  board: number[][];
  boardNum: number;
  calledNumbers: number[];
  winningPositions: [number, number][];
  winnerName: string;
  prizePool: number;
};

const DEFAULT_RESULT_BOARD = [
  [1, 16, 31, 46, 61],
  [2, 17, 32, 47, 62],
  [3, 18, 0, 48, 63],
  [4, 19, 33, 49, 64],
  [5, 20, 34, 50, 65],
];

function toWinningPositions(markedCells: number[]): [number, number][] {
  return markedCells.map((idx) => [Math.floor(idx / 5), idx % 5]);
}

export function prepareGameResult(
  sessionId: string,
  searchParams?: SearchParamReader,
): PreparedGameResult {
  const cached = loadStoredGameResult(sessionId);
  const getParam = (key: string) => searchParams?.get(key) ?? null;
  const parseArr = (key: string) => parseNumberArrayParam(getParam(key));

  const board = cached?.boardMatrix ?? DEFAULT_RESULT_BOARD;
  const boardNum = cached?.boardNo ?? Number(getParam("boardNum") ?? "0");
  const calledNumbers = cached?.calledNumbers ?? parseArr("calledNumbers");
  const markedCells = cached?.markedCells ?? parseArr("winningCells");
  const winnerName = (cached?.winnerName ?? getParam("winnerName")) || "Player";
  const prizePool = cached?.potCents
    ? cached.potCents / 100
    : Number(getParam("prizePool") ?? "0");

  return {
    board,
    boardNum,
    calledNumbers,
    winningPositions: toWinningPositions(markedCells),
    winnerName,
    prizePool,
  };
}
export type StoredGameResult = {
  sessionId: string;
  roomId: string;
  winnerUserId: string | null;
  winnerName?: string;
  boardNo: number;
  boardMatrix: number[][];
  markedCells: number[];
  calledNumbers: number[];
  potCents: number;
  createdAt: number;
};

const RESULT_KEY_PREFIX = "mella_result_";

export function getResultStorageKey(sessionId: string): string {
  return `${RESULT_KEY_PREFIX}${sessionId}`;
}

export function saveStoredGameResult(payload: StoredGameResult): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    getResultStorageKey(payload.sessionId),
    JSON.stringify(payload),
  );
}

export function loadStoredGameResult(
  sessionId: string,
): StoredGameResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(getResultStorageKey(sessionId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredGameResult;
    if (!parsed || parsed.sessionId !== sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseNumberArrayParam(raw: string | null): number[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is number => typeof x === "number" && Number.isFinite(x),
    );
  } catch {
    return [];
  }
}
