type CounterName =
  | "board_purchase_requests_total"
  | "board_purchase_success_total"
  | "board_purchase_replay_total"
  | "bingo_claim_requests_total"
  | "bingo_claim_valid_total"
  | "bingo_claim_rejected_total"
  | "session_start_requests_total"
  | "session_stop_requests_total"
  | "session_recovery_total";

const counters = new Map<CounterName, number>();

export function incCounter(name: CounterName, value = 1) {
  const current = counters.get(name) ?? 0;
  counters.set(name, current + value);
}

export function getMetricsCounters(): Record<string, number> {
  return Object.fromEntries(counters.entries());
}
