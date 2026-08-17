export type StoredMatchEvent = {
  snapshotJson: string;
  eventJson: string;
  resultStatus: string;
};

export function replayStoredMatchEvent<TSnapshot, TEvent>(
  stored: StoredMatchEvent
) {
  return {
    snapshot: JSON.parse(stored.snapshotJson) as TSnapshot,
    event: JSON.parse(stored.eventJson) as TEvent,
    status: stored.resultStatus,
    idempotent: true as const,
  };
}
