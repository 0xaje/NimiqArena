import {
  ArrowLeft,
  Copy,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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
  const state = stateQuery.data;
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

  async function copyCode() {
    if (!state) return;
    await navigator.clipboard?.writeText(
      (state as { joinCode?: string }).joinCode ?? ""
    );
    toast("Invite code copied");
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
              <button className="copy-code" onClick={copyCode}>
                <Copy size={15} /> Copy invite code
              </button>
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
                        ? `Player ${snapshot.winner + 1} wins`
                        : isYourTurn
                          ? snapshot?.dice
                            ? "Choose a piece."
                            : "Roll the dice."
                          : "Waiting for server turn."}
                    </h2>
                  </div>
                  <span
                    className={`state-chip ${isYourTurn ? "good" : "muted"}`}
                  >
                    {isYourTurn ? "YOUR TURN" : "SERVER STATE"}
                  </span>
                </div>
                <div className="ludo-board">
                  <div className="board-track">
                    {Array.from({ length: 52 }, (_, index) => (
                      <span
                        className={`track-cell ${index % 13 === 0 ? "safe-cell" : ""}`}
                        key={index}
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
                  <button
                    className="primary-action"
                    disabled={
                      !isYourTurn ||
                      snapshot?.dice !== null ||
                      command.isPending
                    }
                    onClick={() => sendCommand({ kind: "roll" })}
                  >
                    {command.isPending ? "Submitting…" : "Roll server dice"}
                  </button>
                  <p>
                    Dice, turns, legal moves, and winner state are controlled by
                    the backend engine.
                  </p>
                </div>
              </article>
              <aside className="room-panel room-panel-dark">
                <div className="room-panel-icon">
                  <ShieldCheck size={18} />
                </div>
                <span className="card-label">AUTHORITY PANEL</span>
                <h2>Server-owned state.</h2>
                <p>
                  The board is a rendering of the latest snapshot. Stale
                  versions, duplicate nonces, illegal moves, and unauthorized
                  players are rejected by the API.
                </p>
                <div className="state-chip muted">
                  {state?.stateVersion === 0
                    ? "INITIAL SNAPSHOT"
                    : `VERSION ${state?.stateVersion}`}
                </div>
              </aside>
            </section>
          </>
        )}
      </main>
      <footer className="detail-footer">
        <span>
          <Users size={14} /> Online presence is limited to real joined players.
        </span>
        <Link href="/">Return to Arena</Link>
      </footer>
    </div>
  );
}
