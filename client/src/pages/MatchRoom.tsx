import {
  ArrowLeft,
  Copy,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { reconnectDelayMs, shouldResync } from "@/lib/reconnect-policy";

function positionLabel(position: number) {
  if (position < 0) return "BASE";
  if (position >= 57) return "HOME";
  if (position >= 52) return `HOME ${position - 51}/6`;
  return `TRACK ${position + 1}/52`;
}

export default function MatchRoom() {
  const [, params] = useRoute("/matches/:id");
  const matchId = params?.id ?? "";
  const utils = trpc.useUtils();
  const stateQuery = trpc.match.state.useQuery(
    { id: matchId },
    { enabled: Boolean(matchId), refetchInterval: 4_000 }
  );
  const command = trpc.match.command.useMutation({
    onSuccess: () => utils.match.state.invalidate({ id: matchId }),
  });
  const heartbeat = trpc.match.heartbeat.useMutation();
  const disconnect = trpc.match.disconnect.useMutation();
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "reconnecting" | "offline"
  >(stateQuery.data ? "connecting" : "offline");
  const reconnectTimer = useRef<number | null>(null);
  const state = stateQuery.data;

  useEffect(() => {
    if (!matchId || stateQuery.isError || !stateQuery.data) {
      setConnectionStatus("offline");
      return;
    }
    let closed = false;
    let attempt = 0;
    let stream: EventSource | null = null;

    const connect = () => {
      if (closed) return;
      setConnectionStatus(attempt === 0 ? "connecting" : "reconnecting");
      stream = new EventSource(`/api/matches/${matchId}/events`);
      const onOpen = () => {
        attempt = 0;
        setConnectionStatus("connected");
        void utils.match.state.invalidate({ id: matchId });
      };
      const onState = (event: Event) => {
        attempt = 0;
        setConnectionStatus("connected");
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as {
            stateVersion?: number;
          };
          if (
            shouldResync(
              stateQuery.data?.stateVersion ?? 0,
              payload.stateVersion ?? 0
            )
          ) {
            void utils.match.state.invalidate({ id: matchId });
          }
        } catch {
          void utils.match.state.invalidate({ id: matchId });
        }
      };
      const onError = () => {
        stream?.close();
        if (closed) return;
        setConnectionStatus("reconnecting");
        const delay = reconnectDelayMs(attempt);
        attempt += 1;
        reconnectTimer.current = window.setTimeout(connect, delay);
      };
      stream.addEventListener("open", onOpen);
      stream.addEventListener("state", onState);
      stream.addEventListener("error", onError);
    };

    connect();
    return () => {
      closed = true;
      stream?.close();
      if (reconnectTimer.current !== null)
        window.clearTimeout(reconnectTimer.current);
    };
  }, [matchId, stateQuery.data, stateQuery.isError, utils]);

  useEffect(() => {
    if (!matchId || stateQuery.isError || !stateQuery.data) return;
    let closed = false;
    let timer: number | null = null;
    const tick = () => {
      if (closed) return;
      heartbeat.mutate(
        { id: matchId },
        {
          onSettled: () => {
            if (!closed) timer = window.setTimeout(tick, 15_000);
          },
        }
      );
    };
    timer = window.setTimeout(tick, 15_000);
    return () => {
      closed = true;
      if (timer !== null) window.clearTimeout(timer);
      void disconnect.mutate({ id: matchId });
    };
  }, [disconnect, heartbeat, matchId, stateQuery.data, stateQuery.isError]);

  const snapshot = state?.snapshot as
    | {
        currentPlayer: number;
        dice: number | null;
        winner: number | null;
        players: [
          { pieces: { position: number }[] },
          { pieces: { position: number }[] },
        ];
      }
    | undefined;
  const yourSeat = state?.yourSeat ?? -1;
  const isYourTurn = Boolean(
    snapshot &&
      state?.status === "in_progress" &&
      snapshot.currentPlayer === yourSeat
  );

  const createChallenge = trpc.match.createChallenge.useMutation();

  async function shareChallenge() {
    if (!state) return;
    const code = (state as { joinCode?: string }).joinCode ?? "";
    const shareUrl = `${window.location.origin}/join?code=${code}`;
    const shareData = {
      title: "⚔️ Nimiq Arena Challenge",
      text: `I challenge you to a Ludo match on Nimiq Arena! Join using code: ${code}`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("Challenge invite shared!");
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    await navigator.clipboard?.writeText(shareUrl);
    toast.success("Direct Challenge Link Copied!", {
      description: `Share this link with your friend: ${shareUrl}`,
    });
  }

  async function copyCode() {
    if (!state) return;
    const code = (state as { joinCode?: string }).joinCode ?? "";
    await navigator.clipboard?.writeText(code);
    toast.success("Invite Code Copied!", {
      description: `Code: ${code}`,
    });
  }

  async function handleRematch() {
    try {
      toast.info("Creating fresh rematch room…");
      const newMatch = await createChallenge.mutateAsync({ gameSlug: "ludo-league" });
      toast.success("Rematch Created!", { description: `Code: ${newMatch.joinCode}` });
      window.location.href = `/matches/${newMatch.id}`;
    } catch (err) {
      toast.error("Failed to create rematch", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  }

  async function sendCommand(
    commandInput: { kind: "roll" } | { kind: "move"; pieceIndex: number }
  ) {
    if (!snapshot || !state) return;
    try {
      await command.mutateAsync({
        id: matchId,
        command: {
          ...commandInput,
          expectedVersion: state.stateVersion,
          nonce: crypto.randomUUID().replace(/-/g, ""),
        },
      });
    } catch (error) {
      toast.error("Server rejected the action", {
        description:
          error instanceof Error ? error.message : "Refresh and try again.",
      });
    }
  }

  return (
    <div className="detail-page match-room-page">
      <header className="detail-header">
        <Link href="/games/ludo-league" className="back-link">
          <ArrowLeft size={15} /> Ludo detail
        </Link>
        <span className="detail-brand">NIMIQ ARENA / MATCH ROOM</span>
        <span className="detail-state">
          {stateQuery.isLoading
            ? "LOADING"
            : stateQuery.isError
              ? "UNAVAILABLE"
              : state?.status?.toUpperCase()}
        </span>
      </header>
      <main className="detail-main">
        <section className="room-hero">
          <span className="stamp orange">CHALLENGE FRIEND</span>
          <p className="eyebrow">REAL MATCH / SERVER STATE</p>
          <h1>
            {stateQuery.isLoading ? (
              <>
                Loading
                <br />
                <em>room.</em>
              </>
            ) : stateQuery.isError || !state ? (
              <>
                Room
                <br />
                <em>unavailable.</em>
              </>
            ) : state.status === "waiting" ? (
              <>
                Waiting for
                <br />
                <em>opponent.</em>
              </>
            ) : (
              <>
                Table is
                <br />
                <em>live.</em>
              </>
            )}
          </h1>
          <p className="detail-lede">
            {stateQuery.isLoading
              ? "Checking the protected match state…"
              : stateQuery.isError || !state
                ? "A live room is only shown to an authenticated participant. No opponent, move, result, rating, or settlement is created locally."
                : state.status === "waiting"
                  ? "Share your invite link or 10-character code with your opponent. As soon as they join, the table goes live."
                  : "This room renders the persisted match snapshot. No opponent, move, result, rating, or settlement is created locally."}
          </p>
        </section>

        {stateQuery.isLoading ? (
          <section className="room-code-card unavailable-room">
            <div>
              <span className="card-label">ROOM STATE</span>
              <strong>Checking protected state…</strong>
            </div>
            <div>
              <span className="card-label">CLIENT AUTHORITY</span>
              <strong>No local board state is shown.</strong>
            </div>
          </section>
        ) : stateQuery.isError || !state ? (
          <section className="room-code-card unavailable-room">
            <div>
              <span className="card-label">ROOM STATE</span>
              <strong>Match unavailable</strong>
            </div>
            <div>
              <span className="card-label">REASON</span>
              <strong>Sign in as a participant or use a real match ID.</strong>
            </div>
            <Link className="copy-code" href="/join">
              Join with a challenge code
            </Link>
          </section>
        ) : (
          <>
            <section className="room-code-card">
              <div>
                <span className="card-label">MATCH ID</span>
                <strong>{state?.id ?? "Loading…"}</strong>
              </div>
              <div>
                <span className="card-label">STATE VERSION</span>
                <strong>{state?.stateVersion ?? "—"}</strong>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className="copy-code" onClick={shareChallenge}>
                  <Copy size={15} /> Share Invite Link
                </button>
                <button className="copy-code secondary-chip" onClick={copyCode} title="Copy Code Only">
                  Code: {(state as { joinCode?: string }).joinCode ?? "—"}
                </button>
              </div>
            </section>
            <section className="authoritative-strip">
              <div>
                <span className="card-label">YOUR SEAT</span>
                <strong>{yourSeat < 0 ? "—" : `PLAYER ${yourSeat + 1}`}</strong>
              </div>
              <div>
                <span className="card-label">TURN</span>
                <strong>
                  {snapshot ? `PLAYER ${snapshot.currentPlayer + 1}` : "—"}
                </strong>
              </div>
              <div>
                <span className="card-label">DICE</span>
                <strong>{snapshot?.dice ?? "—"}</strong>
              </div>
              <div>
                <span className="card-label">PLAYERS</span>
                <strong>{state?.players.length ?? 0}/2</strong>
              </div>
              <div>
                <span className="card-label">SYNC</span>
                <strong>{connectionStatus.toUpperCase()}</strong>
              </div>
              <button
                className="refresh-state"
                onClick={() => stateQuery.refetch()}
              >
                <RefreshCw size={14} /> Refresh state
              </button>
            </section>
            <section className="ludo-live-grid">
              <article className="ludo-board-panel">
                <div className="board-heading">
                  <div>
                    <span className="card-label">
                      LUDO BOARD / {state?.status?.toUpperCase()}
                    </span>
                    <h2>
                      {snapshot?.winner !== null &&
                      snapshot?.winner !== undefined
                        ? `Player ${snapshot.winner + 1} wins!`
                        : isYourTurn
                          ? snapshot?.dice
                            ? "Choose a piece to move."
                            : "Roll the server dice."
                          : "Waiting for opponent turn."}
                    </h2>
                  </div>
                  <span
                    className={`state-chip ${isYourTurn ? "good" : "muted"}`}
                  >
                    {isYourTurn ? "YOUR TURN" : "OPPONENT TURN"}
                  </span>
                </div>
                <div className="ludo-board">
                  <div className="board-track">
                    {Array.from({ length: 52 }, (_, index) => (
                      <span
                        className={`track-cell ${index % 13 === 0 ? "safe-cell" : ""}`}
                        key={index}
                        title={index % 13 === 0 ? "Safe Square (Protected from capture)" : `Square ${index + 1}`}
                      >
                        {index + 1}
                      </span>
                    ))}
                  </div>
                  <div className="piece-lanes">
                    {[0, 1].map(seat => (
                      <div
                        className={`piece-lane ${seat === yourSeat ? "your-lane" : ""}`}
                        key={seat}
                      >
                        <div className="lane-label">
                          P{seat + 1} /{" "}
                          {state?.players.find(player => player.seat === seat)
                            ?.status ?? "not joined"}
                        </div>
                        {snapshot?.players[seat].pieces.map(
                          (piece, pieceIndex) => (
                            <button
                              className={`piece-token p${seat}`}
                              key={pieceIndex}
                              disabled={
                                !(
                                  isYourTurn &&
                                  yourSeat === seat &&
                                  snapshot.dice !== null
                                )
                              }
                              onClick={() =>
                                sendCommand({ kind: "move", pieceIndex })
                              }
                              title={positionLabel(piece.position)}
                            >
                              <span>{pieceIndex + 1}</span>
                              <small>{positionLabel(piece.position)}</small>
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="board-actions">
                  {snapshot?.winner !== null &&
                  snapshot?.winner !== undefined ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button className="primary-action" onClick={handleRematch} disabled={createChallenge.isPending}>
                        ⚔️ {createChallenge.isPending ? "Creating Rematch…" : "Challenge Again (Rematch)"}
                      </button>
                      <Link className="secondary-chip" href="/leaderboard">
                        🏆 Full Leaderboard
                      </Link>
                      <Link className="secondary-chip" href="/profile">
                        👤 View Rating History
                      </Link>
                    </div>
                  ) : (
                    <button
                      className="primary-action"
                      disabled={
                        !isYourTurn ||
                        snapshot?.dice !== null ||
                        command.isPending
                      }
                      onClick={() => sendCommand({ kind: "roll" })}
                    >
                      {command.isPending ? "Submitting…" : "🎲 Roll Server Dice"}
                    </button>
                  )}
                  <p>
                    {snapshot?.winner !== null && snapshot?.winner !== undefined
                      ? "Match finished. Official Elo rating, streaks, and seasonal rankings have been calculated."
                      : "Rules: Roll a 6 to release a piece from Base. Safe squares protect pieces. Capturing opponent pieces awards a bonus turn."}
                  </p>
                </div>
              </article>
              <aside className="room-panel room-panel-dark">
                <div className="room-panel-icon">
                  <ShieldCheck size={18} />
                </div>
                <span className="card-label">COMPETITIVE INTEGRITY</span>
                <h2>Server-Authoritative Match</h2>
                <p>
                  Every dice roll and piece move is verified on the backend. Rating updates, win streaks, and leaderboard positions are computed using official FIDE Elo calculations ($K=32$).
                </p>
                <div className="state-chip muted">
                  {state?.stateVersion === 0
                    ? "INITIAL SNAPSHOT"
                    : `STATE VERSION ${state?.stateVersion}`}
                </div>
              </aside>
            </section>
          </>
        )}
      </main>
      <footer className="detail-footer">
        <span>
          <Users size={14} /> Real multiplayer table. No bots or simulated players.
        </span>
        <Link href="/">Return to Arena</Link>
      </footer>
    </div>
  );
}
