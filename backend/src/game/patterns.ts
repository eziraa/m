import type { BoardMatrix } from "./boardGenerator.js";

export type Pattern = "row" | "column" | "diagonal" | "full_house" | "corners";

function numbersForRow(board: BoardMatrix, rowIndex: number): number[] {
  return board[rowIndex] ?? [];
}

function numbersForColumn(board: BoardMatrix, colIndex: number): number[] {
  return board.map((row) => row[colIndex]).filter((n) => Number.isFinite(n));
}

function numbersForDiagonal(
  board: BoardMatrix,
  diagonal: "main" | "anti",
): number[] {
  if (diagonal === "main") {
    return [0, 1, 2, 3, 4]
      .map((i) => board[i]?.[i])
      .filter((n) => Number.isFinite(n));
  }
  return [0, 1, 2, 3, 4]
    .map((i) => board[i]?.[4 - i])
    .filter((n) => Number.isFinite(n));
}

function numbersForCorners(board: BoardMatrix): number[] {
  return [
    board[0]?.[0],
    board[0]?.[4],
    board[4]?.[0],
    board[4]?.[4],
  ].filter((n) => Number.isFinite(n));
}

export type WinningPatternInput = {
  type: Pattern;
  index?: number;
  diagonal?: "main" | "anti";
};

export function requiredNumbersForPattern(
  board: BoardMatrix,
  input: WinningPatternInput,
): number[] {
  if (input.type === "row") {
    if (typeof input.index !== "number" || input.index < 0 || input.index > 4) {
      throw new Error("invalid_row_pattern");
    }
    return numbersForRow(board, input.index);
  }

  if (input.type === "column") {
    if (typeof input.index !== "number" || input.index < 0 || input.index > 4) {
      throw new Error("invalid_column_pattern");
    }
    return numbersForColumn(board, input.index);
  }

  if (input.type === "diagonal") {
    if (!input.diagonal) {
      throw new Error("invalid_diagonal_pattern");
    }
    return numbersForDiagonal(board, input.diagonal);
  }

  if (input.type === "full_house") {
    return board.flat();
  }

  if (input.type === "corners") {
    return numbersForCorners(board);
  }

  throw new Error("unsupported_pattern");
}
