import type { BoardMatrix } from "./boardGenerator.js";

export type Pattern = "row" | "column" | "diagonal" | "full_house" | "corners";
const FULL_HOUSE_INDICES = Array.from({ length: 25 }, (_, index) => index);
const CORNER_INDICES = [0, 4, 20, 24] as const;

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
  lineIndices?: number[];
};

function lineIndicesForPattern(input: WinningPatternInput): number[] {
  if (input.type === "row") {
    if (typeof input.index !== "number" || input.index < 0 || input.index > 4) {
      throw new Error("invalid_row_pattern");
    }
    return Array.from({ length: 5 }, (_, col) => input.index! * 5 + col);
  }

  if (input.type === "column") {
    if (typeof input.index !== "number" || input.index < 0 || input.index > 4) {
      throw new Error("invalid_column_pattern");
    }
    return Array.from({ length: 5 }, (_, row) => row * 5 + input.index!);
  }

  if (input.type === "diagonal") {
    if (!input.diagonal) {
      throw new Error("invalid_diagonal_pattern");
    }
    return input.diagonal === "main"
      ? Array.from({ length: 5 }, (_, i) => i * 5 + i)
      : Array.from({ length: 5 }, (_, i) => i * 5 + (4 - i));
  }

  if (input.type === "full_house") {
    return FULL_HOUSE_INDICES;
  }

  if (input.type === "corners") {
    return [...CORNER_INDICES];
  }

  throw new Error("unsupported_pattern");
}

function validateLineIndices(input: WinningPatternInput) {
  if (!input.lineIndices) {
    return;
  }

  const expected = [...lineIndicesForPattern(input)].sort((a, b) => a - b);
  const actual = [...new Set(input.lineIndices)].sort((a, b) => a - b);

  if (
    expected.length !== actual.length ||
    expected.some((value, index) => value !== actual[index])
  ) {
    throw new Error("invalid_line_indices");
  }
}

export function requiredNumbersForPattern(
  board: BoardMatrix,
  input: WinningPatternInput,
): number[] {
  validateLineIndices(input);

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
