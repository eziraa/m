import { createHash, randomUUID } from "node:crypto";

const BINGO_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
] as const;

function shuffledRange(min: number, max: number): number[] {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  for (let i = numbers.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers;
}

export type BoardMatrix = number[][];

export function generateBingoBoard(): BoardMatrix {
  const columns = BINGO_RANGES.map(([min, max]) =>
    shuffledRange(min, max).slice(0, 5),
  );
  const board: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));

  for (let col = 0; col < 5; col += 1) {
    for (let row = 0; row < 5; row += 1) {
      board[row][col] = columns[col][row];
    }
  }

  // Shuffle rows to avoid visually sorted patterns across boards.
  for (let i = board.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }

  return board;
}

export function boardHash(matrix: BoardMatrix): string {
  return createHash("sha256").update(JSON.stringify(matrix)).digest("hex");
}

export function newBoardIdempotencyKey(): string {
  return randomUUID();
}
