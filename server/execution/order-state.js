const STATUS_PRIORITY = Object.freeze({
  NEW: 0,
  SUBMITTING: 1,
  OPEN: 2,
  TRIGGER_PENDING: 2,
  PARTIALLY_FILLED: 3,
  CANCELLED: 4,
  REJECTED: 4,
  EXPIRED: 4,
  FILLED: 5,
  DRY_RUN: 6,
  UNKNOWN: -1,
});

export function isTerminalOrderStatus(status) {
  return ["FILLED", "CANCELLED", "REJECTED", "EXPIRED"].includes(String(status ?? "").toUpperCase());
}

/**
 * Broker snapshots can arrive late or out of order. Never allow a lower-confidence
 * snapshot to move a known order backwards (e.g. FILLED -> OPEN). A confirmed
 * FILLED state outranks any other broker state. The raw broker status is still
 * retained by the store for diagnosis.
 */
export function mergeOrderState(previous, incoming) {
  if (!previous) return { ...incoming };

  const oldStatus = String(previous.status ?? "UNKNOWN").toUpperCase();
  const newStatus = String(incoming.status ?? "UNKNOWN").toUpperCase();
  const oldPriority = STATUS_PRIORITY[oldStatus] ?? -1;
  const newPriority = STATUS_PRIORITY[newStatus] ?? -1;
  let acceptStatus = newPriority >= oldPriority && newStatus !== "UNKNOWN";
  if (
    isTerminalOrderStatus(oldStatus) &&
    isTerminalOrderStatus(newStatus) &&
    oldStatus !== newStatus &&
    newStatus !== "FILLED"
  ) {
    acceptStatus = false;
  }
  const status = acceptStatus ? newStatus : oldStatus;
  const quantity = Math.max(0, Number(incoming.quantity ?? previous.quantity ?? 0));
  const filledQuantity = Math.max(
    0,
    Number(previous.filledQuantity ?? 0),
    Number(incoming.filledQuantity ?? 0),
  );

  return {
    ...previous,
    ...incoming,
    status,
    quantity,
    filledQuantity,
    remainingQuantity: status === "FILLED"
      ? 0
      : Math.max(0, Number(incoming.remainingQuantity ?? quantity - filledQuantity)),
    averageFillPrice: incoming.averageFillPrice ?? previous.averageFillPrice ?? null,
    statusMessage: incoming.statusMessage ?? previous.statusMessage ?? null,
    orderTime: previous.orderTime ?? incoming.orderTime ?? null,
  };
}

export function normalizeOrderTransition(previousStatus, nextStatus) {
  if (!previousStatus) return { accepted: true, reason: "INITIAL_STATE" };
  const current = String(previousStatus).toUpperCase();
  const next = String(nextStatus).toUpperCase();
  const accepted = (STATUS_PRIORITY[next] ?? -1) >= (STATUS_PRIORITY[current] ?? -1) && next !== "UNKNOWN";
  return {
    accepted,
    reason: accepted ? "MONOTONIC_TRANSITION" : "STALE_OR_UNKNOWN_TRANSITION",
  };
}
