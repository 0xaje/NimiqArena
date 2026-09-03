import {
  ArrowLeft,
  Bot,
  Coins,
  Copy,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { reconnectDelayMs, shouldResync } from "@/lib/reconnect-policy";
import { soundEngine } from "@/lib/audio";
import { LudoBoard2D } from "@/components/game/LudoBoard2D";
import { LudoDice } from "@/components/game/LudoDice";
import { Connect4Board2D } from "@/components/game/Connect4Board2D";
import { EscrowDepositModal } from "@/components/game/EscrowDepositModal";
import { VictoryPayoutBanner } from "@/components/game/VictoryPayoutBanner";
import { MatchWaitingRoom } from "@/components/game/MatchWaitingRoom";
import { formatNim } from "@shared/game/pot-distribution";
import { EmoteWheel } from "@/components/game/EmoteWheel";
import { EmoteOverlay } from "@/components/game/EmoteOverlay";
import { useMatchStream } from "@/lib/useMatchStream";

export default function MatchRoom() {
  const [, params] = useRoute("/matches/:id");
  const matchId = params?.id ?? "";
  const utils = trpc.useUtils();

  // Real-time zero latency SSE event stream
  const {
    isConnected: isStreamConnected,
    activeEmotes,
    activeChats,
  } = useMatchStream({
    matchId,
    enabled: Boolean(matchId),
    onStateUpdate: streamState => {
      utils.match.state.setData({ id: matchId }, prev => {
        if (!prev) return streamState;
        if (
          typeof streamState?.stateVersion === "number" &&
          streamState.stateVersion < prev.stateVersion
        ) {
          return prev;
        }
        return { ...prev, ...streamState };
      });
    },
    onEmote: () => {
      soundEngine.playCapture();
    },
    onChat: () => {
      soundEngine.playPieceMove();
    },
  });

  const stateQuery = trpc.match.state.useQuery(
    { id: matchId },
    {
      enabled: Boolean(matchId),
      refetchInterval: query => {
        const d = query.state.data;
        const snap = d?.snapshot as any;
        const isBotActive =
          d?.status === "in_progress" &&
          snap?.currentPlayer === 1 &&
          snap?.winner === null &&
          Boolean(d?.joinCode?.startsWith("BOT"));
        return isBotActive ? 1_500 : isStreamConnected ? false : 3_000;
      },
    }
  );
  const escrowQuery = trpc.match.escrowDetails.useQuery(
    { matchId },
    { enabled: Boolean(matchId), refetchInterval: 5_000 }
  );
  const authQuery = trpc.auth.me.useQuery();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const escrow = escrowQuery.data;

  const command = trpc.match.command.useMutation({
    onSuccess: () => utils.match.state.invalidate({ id: matchId }),
  });
  const c4Command = trpc.match.connect4Command.useMutation({
    onSuccess: () => utils.match.state.invalidate({ id: matchId }),
  });
  const triggerBotTurnMutation = trpc.match.triggerBotTurn.useMutation({
    onSuccess: () => utils.match.state.invalidate({ id: matchId }),
  });
  const heartbeat = trpc.match.heartbeat.useMutation();
  const disconnect = trpc.match.disconnect.useMutation();
  const heartbeatRef = useRef(heartbeat);
  heartbeatRef.current = heartbeat;
  const disconnectRef = useRef(disconnect);
  disconnectRef.current = disconnect;

  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [botActionMessage, setBotActionMessage] = useState<string | null>(null);
  const [isBotRolling, setIsBotRolling] = useState(false);
  const state = stateQuery.data;
  const isBotMatch = Boolean(state?.joinCode?.startsWith("BOT"));

  const connectionStatus = isStreamConnected
    ? "connected"
    : stateQuery.isLoading
      ? "connecting"
      : stateQuery.isError || !state
        ? "offline"
        : "connected";

  // Track previous state for sound effects & animations
  const prevSnapshotRef = useRef<{
    dice: number | null;
    currentPlayer: number;
    winner: number | null;
    version: number;
  } | null>(null);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
    toast.info(muted ? "Sound Muted" : "Sound Enabled");
  };

  useEffect(() => {
    if (!matchId) return;
    let closed = false;
    let timer: number | null = null;
    const tick = () => {
      if (closed) return;
      heartbeatRef.current.mutate(
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
      if (!isBotMatch) {
        disconnectRef.current.mutate({ id: matchId });
      }
    };
  }, [matchId, isBotMatch]);

  const snapshot = state?.snapshot as
    | {
        currentPlayer: number;
        dice: number | null;
        lastRoll?: {
          playerId: number;
          value: number;
          hadLegalMoves: boolean;
        } | null;
        winner: number | null;
        players: [
          { id: 0; pieces: { position: number }[] },
          { id: 1; pieces: { position: number }[] },
        ];
      }
    | undefined;
  const yourSeat = state?.yourSeat ?? -1;
  const isYourTurn = Boolean(
    snapshot &&
      state?.status === "in_progress" &&
      snapshot.currentPlayer === yourSeat
  );

  const [turnSecondsLeft, setTurnSecondsLeft] = useState(30);
  const [disconnectGraceSeconds, setDisconnectGraceSeconds] = useState(60);

  const opponent = state?.players.find(p => p.seat !== yourSeat);
  const isOpponentDisconnected = Boolean(
    !isBotMatch &&
      state?.status === "in_progress" &&
      opponent &&
      (opponent.status === "disconnected" ||
        (opponent.lastSeenAt &&
          Date.now() - new Date(opponent.lastSeenAt).getTime() > 14000))
  );

  // Turn Countdown Timer (30s per turn)
  useEffect(() => {
    if (state?.status !== "in_progress" || snapshot?.winner !== null) {
      return;
    }
    setTurnSecondsLeft(30);

    const interval = window.setInterval(() => {
      setTurnSecondsLeft(prev => {
        if (prev <= 1) {
          return 0;
        }
        if (prev <= 6 && isYourTurn) {
          soundEngine.playTimerWarning();
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [snapshot?.currentPlayer, state?.stateVersion, state?.status, snapshot?.winner, isYourTurn]);

  // Disconnect Grace Countdown
  useEffect(() => {
    if (!isOpponentDisconnected) {
      setDisconnectGraceSeconds(60);
      return;
    }
    const interval = window.setInterval(() => {
      setDisconnectGraceSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isOpponentDisconnected]);

  const isBotTurn = Boolean(
    isBotMatch &&
      state?.status === "in_progress" &&
      snapshot &&
      snapshot.currentPlayer === 1 &&
      snapshot.winner === null
  );

  // Passive display: show AI activity banner and feedback reactively when server bot plays or when turns pass
  useEffect(() => {
    if (isBotTurn) {
      setIsBotRolling(true);
      setBotActionMessage("🤖 Nimiq AI is taking its turn…");
    } else {
      setIsBotRolling(false);
      const lastRoll = snapshot?.lastRoll;
      if (lastRoll && isBotMatch && lastRoll.playerId === 1) {
        if (!lastRoll.hadLegalMoves) {
          setBotActionMessage(
            `🤖 Nimiq AI rolled ${lastRoll.value} (no legal moves) — Your turn!`
          );
        } else {
          setBotActionMessage(
            `🤖 Nimiq AI rolled ${lastRoll.value} and moved! Your turn!`
          );
        }
        const timer = window.setTimeout(() => setBotActionMessage(null), 2400);
        return () => window.clearTimeout(timer);
      } else if (lastRoll && lastRoll.playerId === yourSeat && !lastRoll.hadLegalMoves) {
        setBotActionMessage(
          `🎲 You rolled ${lastRoll.value} (no legal moves available) — Turn passed.`
        );
        const timer = window.setTimeout(() => setBotActionMessage(null), 2600);
        return () => window.clearTimeout(timer);
      } else {
        setBotActionMessage(null);
      }
    }
  }, [isBotTurn, snapshot?.lastRoll, isBotMatch, yourSeat]);

  // Bot Turn Watchdog: Continuous recurring watchdog while it is the bot's turn
  useEffect(() => {
    if (!isBotTurn || !matchId) return;

    const interval = window.setInterval(async () => {
      try {
        await utils.match.state.invalidate({ id: matchId });
        await stateQuery.refetch();
        // If bot turn persists, authoritatively trigger server bot turn mutation
        await triggerBotTurnMutation.mutateAsync({ matchId });
        await utils.match.state.invalidate({ id: matchId });
        await stateQuery.refetch();
      } catch {
        // Watchdog failsafe catch
      }
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isBotTurn, matchId]);

  // Sound triggers on state mutations
  useEffect(() => {
    if (!snapshot) return;

    const prev = prevSnapshotRef.current;
    if (prev) {
      // Dice rolled
      if (snapshot.dice !== null && prev.dice !== snapshot.dice) {
        soundEngine.playDiceRoll();
      }
      // Winner declared
      if (snapshot.winner !== null && prev.winner === null) {
        soundEngine.playVictoryFanfare();
      }
      // Turn changed to you
      if (
        snapshot.currentPlayer === yourSeat &&
        prev.currentPlayer !== yourSeat &&
        snapshot.winner === null
      ) {
        soundEngine.playTurnAlert();
      }
      // Pieces moved or captured
      if (state?.stateVersion && state.stateVersion > prev.version) {
        soundEngine.playPieceMove();
      }
    }

    prevSnapshotRef.current = {
      dice: snapshot.dice,
      currentPlayer: snapshot.currentPlayer,
      winner: snapshot.winner,
      version: state?.stateVersion ?? 0,
    };
  }, [snapshot, state?.stateVersion, yourSeat]);

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
      const newMatch = await createChallenge.mutateAsync({
        gameSlug: "ludo-league",
      });
      toast.success("Rematch Created!", {
        description: `Code: ${newMatch.joinCode}`,
      });
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
    if (commandInput.kind === "roll") {
      setBotActionMessage(null);
    }
    try {
      const res = await command.mutateAsync({
        id: matchId,
        command: {
          ...commandInput,
          expectedVersion: Math.max(
            state.stateVersion,
            (snapshot as any)?.version ?? state.stateVersion
          ),
          nonce: crypto.randomUUID().replace(/-/g, ""),
        },
      });
      if (res?.snapshot) {
        utils.match.state.setData({ id: matchId }, prev => {
          if (!prev) return prev;
          return {
            ...prev,
            stateVersion: res.snapshot.version,
            snapshot: res.snapshot,
            status: (res.status as any) ?? prev.status,
          };
        });

        // Provide immediate visual and audio feedback for player's roll
        const last = (res as any)?.snapshot?.lastRoll;
        if (last && last.playerId === yourSeat) {
          if (!last.hadLegalMoves) {
            toast.info(`🎲 You Rolled a ${last.value}`, {
              description: "Requires a 6 to enter track. Passing turn to AI…",
            });
          } else {
            toast.success(`🎲 You Rolled a ${last.value}!`, {
              description:
                last.value === 6
                  ? "Bonus roll awarded! Click a glowing piece to deploy or advance."
                  : "Click a glowing piece to advance.",
            });
          }
        }
      }
    } catch (error) {
      // Auto-sync freshest match state on any rejection
      void utils.match.state.invalidate({ id: matchId });
      void stateQuery.refetch();

      const errMsg = error instanceof Error ? error.message : "";
      const isVersionConflict =
        errMsg.includes("version") ||
        errMsg.includes("changed") ||
        errMsg.includes("STALE_VERSION");

      if (isVersionConflict) {
        // Silently resync state without jarring error toast
        console.warn("[MatchRoom] State version resynced after rejection");
      } else {
        toast.error("Action not applied", {
          description: errMsg || "Please try again.",
        });
      }
    }
  }

  async function sendConnect4Drop(column: number) {
    if (!state) return;
    try {
      const res = await c4Command.mutateAsync({
        id: matchId,
        command: {
          column,
          expectedVersion: state.stateVersion,
          nonce: crypto.randomUUID().replace(/-/g, ""),
        },
      });
      if (res?.snapshot) {
        utils.match.state.setData({ id: matchId }, prev => {
          if (!prev) return prev;
          return {
            ...prev,
            stateVersion: res.snapshot.version,
            snapshot: res.snapshot,
            status: (res.status as any) ?? prev.status,
          };
        });
      }
      soundEngine.playPieceMove();
    } catch (error) {
      toast.error("Server rejected the drop", {
        description:
          error instanceof Error ? error.message : "Refresh and try again.",
      });
    }
  }

  // 1. Dedicated Match Waiting Room (Player A vs Player B)
  if (state?.status === "waiting") {
    const hostName = yourSeat === 0 ? (authQuery.data?.name || "Player 1 (Host)") : "Player 1 (Host)";
    const guestPlayer = state.players.find(p => p.seat === 1);
    const guestName = guestPlayer
      ? (yourSeat === 1 ? (authQuery.data?.name || "Player 2") : "Challenger Joined")
      : null;
    const isDepositNeeded = Boolean(
      escrow?.isWagered &&
      !escrow.playerStatuses.find(p => p.seat === yourSeat)?.verified
    );

    return (
      <div className="pure-gameplay-page">
        <MatchWaitingRoom
          matchId={matchId}
          joinCode={state.joinCode || ""}
          hostName={hostName}
          guestName={guestName}
          stakeNim={escrow?.stakeNim ?? null}
          totalPotNim={escrow?.totalPotNim ?? null}
          isHost={yourSeat === 0}
          onLeave={() => {
            if (confirm("Are you sure you want to leave this table?")) {
              window.location.href = "/games/ludo-league";
            }
          }}
          isDepositNeeded={isDepositNeeded}
          onDepositPrompt={() => setIsDepositModalOpen(true)}
        />
        {isDepositModalOpen && escrow && (
          <EscrowDepositModal
            isOpen={isDepositModalOpen}
            onClose={() => setIsDepositModalOpen(false)}
            matchId={matchId}
            stakeNim={escrow.stakeNim}
            onDepositSuccess={() => {
              void escrowQuery.refetch();
              void stateQuery.refetch();
            }}
          />
        )}
      </div>
    );
  }

  // 2. Board-First Pure Gameplay Screen for Ludo
  if (state && state.engineVersion !== "connect4-v1") {
    const p1Name = yourSeat === 0 ? (authQuery.data?.name || "Player 1") : "Player 1";
    const p2Name = isBotMatch
      ? "Nimiq AI"
      : yourSeat === 1
        ? (authQuery.data?.name || "Player 2")
        : "Player 2";
    const activeSeat = snapshot?.currentPlayer ?? 0;
    const isFinished = snapshot?.winner !== null && snapshot?.winner !== undefined;

    return (
      <div className="pure-gameplay-page">
        {/* Minimal Topbar */}
        <header className="gameplay-topbar">
          <button
            type="button"
            className="gameplay-back-btn"
            onClick={() => {
              if (isFinished || confirm("Leave table and return to lobby?")) {
                window.location.href = "/games/ludo-league";
              }
            }}
          >
            <ArrowLeft size={14} />
            <span>LEAVE TABLE</span>
          </button>

          <div className="gameplay-pot-badge">
            {escrow?.isWagered && escrow.totalPotNim > 0 ? (
              <>
                <Coins size={15} className="trophy-gold" />
                <span>MATCH POT: {formatNim(escrow.totalPotNim)} NIM</span>
              </>
            ) : (
              <>
                <Bot size={15} />
                <span>PRACTICE TABLE (FREE)</span>
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <EmoteWheel matchId={matchId} />
            <button
              type="button"
              className="gameplay-sound-btn"
              onClick={toggleSound}
              title={isMuted ? "Unmute sound effects" : "Mute sound effects"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </header>

        {/* Players Battle Strip */}
        <section className="battle-players-strip">
          <div className={`battle-player-pill ${activeSeat === 0 ? "active" : ""}`}>
            <div className="battle-avatar-wrapper">
              <div className="battle-avatar red-avatar">
                <span>{p1Name.charAt(0).toUpperCase()}</span>
              </div>
              {activeSeat === 0 && <div className="active-turn-ring" />}
            </div>
            <div className="battle-player-meta">
              <span className="battle-player-name">{p1Name}</span>
              <span className="battle-turn-label">
                {activeSeat === 0 ? "ROLLING..." : "WAITING"}
              </span>
            </div>
          </div>

          <div className="center-timer-badge">
            <span
              style={{
                font: "800 11px 'IBM Plex Mono', monospace",
                color: turnSecondsLeft <= 8 ? "#ef4444" : "#fbbf24",
              }}
            >
              ⏱️ {turnSecondsLeft}s
            </span>
          </div>

          <div className={`battle-player-pill ${activeSeat === 1 ? "active" : ""}`}>
            <div className="battle-player-meta" style={{ textAlign: "right" }}>
              <span className="battle-player-name">{p2Name}</span>
              <span className="battle-turn-label">
                {activeSeat === 1
                  ? isBotMatch
                    ? "AI EVALUATING..."
                    : "ROLLING..."
                  : "WAITING"}
              </span>
            </div>
            <div className="battle-avatar-wrapper">
              <div className="battle-avatar yellow-avatar">
                <span>{p2Name.charAt(0).toUpperCase()}</span>
              </div>
              {activeSeat === 1 && <div className="active-turn-ring" />}
            </div>
          </div>
        </section>

        {/* Dynamic Turn & Event Banner */}
        <div
          className={`turn-event-banner ${
            isYourTurn
              ? snapshot?.dice === 6
                ? "bonus-turn"
                : "your-turn"
              : "opponent-turn"
          }`}
        >
          {isFinished ? (
            <span>
              {(snapshot?.winner as any) === "draw"
                ? "🤝 MATCH ENDED IN A DRAW"
                : snapshot?.winner === yourSeat
                  ? "🎉 CONGRATULATIONS! YOU WON THE MATCH!"
                  : `MATCH OVER — ${p2Name.toUpperCase()} WON`}
            </span>
          ) : isYourTurn ? (
            snapshot?.dice === 6 ? (
              <span>🌟 YOU ROLLED A 6! CHOOSE A PAWN TO EXIT BASE (BONUS ROLL AWAITS)</span>
            ) : snapshot?.dice !== null ? (
              <span>👉 CHOOSE YOUR HIGHLIGHTED PAWN TO MOVE</span>
            ) : (
              <span>🎲 YOUR TURN — ROLL THE DICE</span>
            )
          ) : isBotTurn ? (
            <span>🤖 NIMIQ AI IS EVALUATING THE BOARD…</span>
          ) : (
            <span>⏳ OPPONENT'S TURN — WAITING…</span>
          )}
        </div>

        {/* Escrow Deposit Modal */}
        <EscrowDepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          matchId={matchId}
          stakeNim={escrow?.stakeNim || 10}
          onDepositSuccess={() => {
            void escrowQuery.refetch();
            void stateQuery.refetch();
          }}
        />

        {/* Victory Payout Banner Overlay */}
        {isFinished && (
          <VictoryPayoutBanner
            matchId={matchId}
            winnerUserId={
              escrow?.playerStatuses.find(p => p.seat === snapshot?.winner)?.userId ??
              (snapshot?.winner === yourSeat ? authQuery.data?.id ?? 0 : 0)
            }
            yourUserId={authQuery.data?.id ?? 0}
            totalPotNim={escrow?.totalPotNim || 0}
            onPlayAgain={() => {
              window.location.href = "/games/ludo-league";
            }}
            onReturnToLobby={() => {
              window.location.href = "/games/ludo-league";
            }}
          />
        )}

        {/* The Board - Primary Hero */}
        <div className="board-hero-area">
          <EmoteOverlay
            emotes={activeEmotes}
            chats={activeChats}
            yourSeat={yourSeat}
          />
          {snapshot && (
            <LudoBoard2D
              players={(snapshot as any).players || []}
              currentPlayer={(snapshot as any).currentPlayer ?? 0}
              dice={(snapshot as any).dice ?? null}
              diceValues={
                (snapshot as any)?.diceValues ??
                (snapshot?.lastRoll as any)?.diceValues ??
                (snapshot?.dice
                  ? [
                      Math.ceil((snapshot.dice as number) / 2),
                      Math.floor((snapshot.dice as number) / 2),
                    ]
                  : null)
              }
              yourSeat={yourSeat}
              isYourTurn={isYourTurn}
              onMovePiece={pieceIndex => sendCommand({ kind: "move", pieceIndex })}
              onRoll={() => sendCommand({ kind: "roll" })}
              canRoll={
                isYourTurn &&
                snapshot?.dice === null &&
                snapshot?.winner === null &&
                !command.isPending
              }
              isRolling={command.isPending || isBotRolling}
              disabled={command.isPending || isBotTurn}
              isBotMatch={isBotMatch}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page match-room-page">
      <header className="detail-header">
        <Link href="/games/ludo-league" className="back-link">
          <ArrowLeft size={15} /> Ludo detail
        </Link>
        <span className="detail-brand">NIMIQ ARENA / MATCH ROOM</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isStreamConnected ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "11px",
                color: "#2ecc71",
                background: "rgba(46, 204, 113, 0.15)",
                border: "1px solid rgba(46, 204, 113, 0.3)",
                borderRadius: "12px",
                padding: "3px 9px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#2ecc71",
                  boxShadow: "0 0 8px #2ecc71",
                }}
              />
              Live SSE
            </span>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "11px",
                color: "#f39c12",
                background: "rgba(243, 156, 18, 0.15)",
                border: "1px solid rgba(243, 156, 18, 0.3)",
                borderRadius: "12px",
                padding: "3px 9px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#f39c12",
                }}
              />
              Fallback Polling
            </span>
          )}
          <EmoteWheel matchId={matchId} />
          <button
            type="button"
            className="sound-toggle-btn"
            onClick={toggleSound}
            title={isMuted ? "Unmute sound effects" : "Mute sound effects"}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <span className="detail-state">
            {stateQuery.isLoading
              ? "LOADING"
              : stateQuery.isError
                ? "UNAVAILABLE"
                : state?.status?.toUpperCase()}
          </span>
        </div>
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
                : "This room renders the authoritative 2D board. Every dice roll and move is verified on-chain and backend."}
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
                <button
                  className="copy-code secondary-chip"
                  onClick={copyCode}
                  title="Copy Code Only"
                >
                  Code: {(state as { joinCode?: string }).joinCode ?? "—"}
                </button>
              </div>
            </section>

            <section className="authoritative-strip">
              <div>
                <span className="card-label">YOUR SEAT</span>
                <strong className={`seat-highlight p${yourSeat}-text`}>
                  {yourSeat < 0 ? "—" : `PLAYER ${yourSeat + 1}`}
                </strong>
              </div>
              <div>
                <span className="card-label">TURN</span>
                <strong>
                  {snapshot ? `PLAYER ${snapshot.currentPlayer + 1}` : "—"}
                </strong>
              </div>
              <div>
                <span className="card-label">TURN TIMER</span>
                <strong style={{ color: turnSecondsLeft <= 8 ? "#e74c3c" : "#EC9918", fontWeight: 700 }}>
                  ⏱️ {turnSecondsLeft}s
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
              {escrow?.isWagered && (
                <div>
                  <span className="card-label">ESCROW POT</span>
                  <strong style={{ color: "var(--orange)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Coins size={13} /> {escrow.totalPotNim} NIM
                  </strong>
                </div>
              )}
              <div>
                <span className="card-label">SYNC</span>
                <strong>{connectionStatus.toUpperCase()}</strong>
              </div>
              <button
                className="refresh-state"
                onClick={() => stateQuery.refetch()}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </section>

            {/* Opponent Disconnect / Grace Period Banner */}
            {isOpponentDisconnected && (
              <div
                style={{
                  background: "rgba(231, 76, 60, 0.15)",
                  border: "1px solid #e74c3c",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "12px",
                  color: "#fbf8f1",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e74c3c", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                  <span>⚠️ Opponent connection unstable (Reconnecting...)</span>
                </div>
                <span style={{ color: "#e74c3c", fontWeight: 700 }}>
                  Grace period: {disconnectGraceSeconds}s
                </span>
              </div>
            )}

            {/* Escrow Deposit Modal */}
            <EscrowDepositModal
              isOpen={isDepositModalOpen}
              onClose={() => setIsDepositModalOpen(false)}
              matchId={matchId}
              stakeNim={escrow?.stakeNim || 10}
              onDepositSuccess={() => {
                void escrowQuery.refetch();
                void stateQuery.refetch();
              }}
            />

            {/* Wager Deposit Prompt Banner */}
            {escrow?.isWagered && !escrow.allVerified && (
              <div
                style={{
                  background: "rgba(230, 93, 35, 0.12)",
                  border: "1px solid var(--orange)",
                  borderRadius: "8px",
                  padding: "14px 20px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              >
                <div>
                  <span style={{ color: "var(--orange)", fontWeight: 600, fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Coins size={16} /> WAGERED MATCH ESCROW ({escrow.stakeNim} NIM STAKE)
                  </span>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(251, 248, 241, 0.75)" }}>
                    {escrow.playerStatuses.find(p => p.seat === yourSeat)?.verified
                      ? "✓ Your stake is verified on-chain. Waiting for opponent deposit…"
                      : "Deposit your entry stake to lock the pot and activate the board."}
                  </p>
                </div>
                {!escrow.playerStatuses.find(p => p.seat === yourSeat)?.verified && (
                  <button
                    className="primary-action"
                    onClick={() => setIsDepositModalOpen(true)}
                    style={{ background: "var(--orange)", padding: "8px 16px", fontSize: "12px" }}
                  >
                    Deposit {escrow.stakeNim} NIM Stake
                  </button>
                )}
              </div>
            )}

            {/* Winner Payout Banner */}
            {snapshot?.winner !== null &&
              snapshot?.winner !== undefined &&
              escrow?.isWagered &&
              escrow.totalPotNim > 0 && (
                <VictoryPayoutBanner
                  matchId={matchId}
                  winnerUserId={
                    escrow.playerStatuses.find(p => p.seat === snapshot.winner)?.userId ??
                    (snapshot.winner === yourSeat ? authQuery.data?.id ?? 0 : 0)
                  }
                  yourUserId={authQuery.data?.id ?? 0}
                  totalPotNim={escrow.totalPotNim}
                />
              )}

            <section className="ludo-live-2d-layout">
              {/* Left Column: 2D Interactive Board */}
              <article
                className="ludo-board-2d-container"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <EmoteOverlay
                  emotes={activeEmotes}
                  chats={activeChats}
                  yourSeat={yourSeat}
                />
                <div className="board-heading">
                  <div>
                    <span className="card-label">
                      {state?.engineVersion === "connect4-v1" ? "2D CONNECT NIM" : "2D LUDO BOARD"} / {state?.status?.toUpperCase()}
                    </span>
                    <h2>
                      {(snapshot as any)?.winner !== null &&
                      (snapshot as any)?.winner !== undefined
                        ? (snapshot as any).winner === "draw"
                          ? "🤝 Game Ended in a Draw!"
                          : `🎉 Player ${Number((snapshot as any).winner) + 1} Wins!`
                        : isYourTurn
                          ? state?.engineVersion === "connect4-v1"
                            ? "Click any column to drop your disc."
                            : snapshot?.dice
                              ? snapshot.dice === 6
                                ? "🌟 Rolled a 6! Select a glowing pawn (Bonus roll awaits!)"
                                : "Click your highlighted piece to move."
                              : "Roll the server dice below."
                          : isBotTurn
                            ? "🤖 Arena Bot is thinking…"
                            : "Waiting for opponent turn…"}
                    </h2>
                  </div>
                  <span
                    className={`state-chip ${isYourTurn ? "good" : isBotTurn ? "orange" : "muted"}`}
                  >
                    {isYourTurn
                      ? "YOUR TURN"
                      : isBotTurn
                        ? "BOT TURN (AI)"
                        : "OPPONENT TURN"}
                  </span>
                </div>

                {((isBotMatch && isBotTurn) || botActionMessage) && (
                  <div className="bot-status-alert">
                    <div className="bot-status-inner">
                      {isBotTurn ? (
                        <Bot size={18} className={isBotRolling ? "bot-icon-spin" : "bot-icon"} />
                      ) : (
                        <span style={{ fontSize: "16px" }}>🎲</span>
                      )}
                      <span>{botActionMessage || (isBotTurn ? "🤖 Nimiq AI is evaluating the board…" : "")}</span>
                    </div>
                  </div>
                )}

                {snapshot && (
                  state?.engineVersion === "connect4-v1" ? (
                    <Connect4Board2D
                      board={(snapshot as any).board || []}
                      currentPlayer={(snapshot as any).currentPlayer ?? 0}
                      winner={(snapshot as any).winner ?? null}
                      winningLine={(snapshot as any).winningLine ?? null}
                      yourSeat={yourSeat}
                      isYourTurn={isYourTurn}
                      onDropDisc={sendConnect4Drop}
                      disabled={c4Command.isPending || isBotTurn}
                    />
                  ) : (
                    <LudoBoard2D
                      players={(snapshot as any).players || []}
                      currentPlayer={(snapshot as any).currentPlayer ?? 0}
                      dice={(snapshot as any).dice ?? null}
                      diceValues={
                        (snapshot as any)?.diceValues ??
                        (snapshot?.lastRoll as any)?.diceValues ??
                        (snapshot?.dice ? [Math.ceil((snapshot.dice as number) / 2), Math.floor((snapshot.dice as number) / 2)] : null)
                      }
                      yourSeat={yourSeat}
                      isYourTurn={isYourTurn}
                      onMovePiece={pieceIndex =>
                        sendCommand({ kind: "move", pieceIndex })
                      }
                      onRoll={() => sendCommand({ kind: "roll" })}
                      canRoll={
                        isYourTurn &&
                        snapshot?.dice === null &&
                        snapshot?.winner === null &&
                        !command.isPending
                      }
                      isRolling={command.isPending || isBotRolling}
                      disabled={command.isPending || isBotTurn}
                      isBotMatch={isBotMatch}
                    />
                  )
                )}
              </article>

              {/* Right Column: Player Controls & Match Info */}
              <aside className="room-controls-sidebar">
                {state?.engineVersion === "connect4-v1" ? (
                  <div className="dice-control-card">
                    <span className="card-label">TACTICAL STATUS</span>
                    <div style={{ padding: "16px 0", textAlign: "left", fontFamily: "IBM Plex Mono, monospace" }}>
                      <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "var(--paper-bright)" }}>
                        {isYourTurn
                          ? "Your turn to drop a disc"
                          : isBotTurn
                            ? "🤖 Arena Bot is evaluating grid…"
                            : `Player ${(snapshot?.currentPlayer ?? 0) + 1}'s turn`}
                      </h3>
                      <p style={{ fontSize: "12px", color: "rgba(251, 248, 241, 0.7)", margin: "0 0 16px" }}>
                        {isYourTurn
                          ? "Hover over any column 1-7 and click to drop. Connect 4 discs in a line to win."
                          : "Please wait while your opponent chooses their column."}
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span className="secondary-chip" style={{ fontSize: "11px" }}>
                          Grid: 7x6
                        </span>
                        <span className="secondary-chip" style={{ fontSize: "11px" }}>
                          Goal: 4 in a row
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="dice-control-card">
                    <span className="card-label">ACTION / SERVER DICE</span>
                    <div className="dice-action-zone">
                      <LudoDice
                        value={
                          snapshot?.dice ??
                          (snapshot?.lastRoll ? snapshot.lastRoll.value : null)
                        }
                        diceValues={
                          (snapshot as any)?.diceValues ??
                          (snapshot?.lastRoll as any)?.diceValues ??
                          (snapshot?.dice ? [Math.ceil((snapshot.dice as number) / 2), Math.floor((snapshot.dice as number) / 2)] : null)
                        }
                        isRolling={command.isPending || isBotRolling}
                        canRoll={
                          isYourTurn &&
                          snapshot?.dice === null &&
                          snapshot?.winner === null &&
                          !command.isPending
                        }
                        onRoll={() => sendCommand({ kind: "roll" })}
                        playerSeat={snapshot?.currentPlayer ?? 0}
                      />
                      <div className="dice-action-details">
                        <h3>
                          {isYourTurn
                            ? snapshot?.dice
                              ? `Rolled a ${snapshot.dice}!`
                              : snapshot?.lastRoll &&
                                  snapshot.lastRoll.playerId !== yourSeat &&
                                  !snapshot.lastRoll.hadLegalMoves
                                ? `Opponent rolled ${snapshot.lastRoll.value} (No moves) — Your turn!`
                                : "Your turn to roll"
                            : isBotTurn
                              ? isBotRolling
                                ? "🤖 Nimiq AI is rolling…"
                                : "🤖 Nimiq AI is thinking…"
                              : snapshot?.lastRoll &&
                                  snapshot.lastRoll.playerId === yourSeat &&
                                  !snapshot.lastRoll.hadLegalMoves
                                ? `You rolled ${snapshot.lastRoll.value} (No moves) — Turn passed.`
                                : `Player ${(snapshot?.currentPlayer ?? 0) + 1}'s turn`}
                        </h3>
                        <p>
                          {isYourTurn
                            ? snapshot?.dice
                              ? snapshot.dice === 6
                                ? "Select your highlighted piece to move. Rolling a 6 grants an extra turn!"
                                : "Select your highlighted piece on the board to move."
                              : "Roll the dice to advance or release a piece from base."
                            : isBotTurn
                              ? "The AI is evaluating legal moves authoritatively."
                              : "Please wait while your opponent plays."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Match Status and Game Outcome */}
                {snapshot?.winner !== null &&
                snapshot?.winner !== undefined ? (
                  <div className="match-outcome-card">
                    <span className="card-label">MATCH COMPLETE</span>
                    <h2>Player {snapshot.winner + 1} Victorious!</h2>
                    <p>
                      Official Elo ratings and seasonal standings have been
                      updated in the database.
                    </p>
                    <div className="outcome-actions">
                      <button
                        className="primary-action"
                        onClick={handleRematch}
                        disabled={createChallenge.isPending}
                      >
                        ⚔️{" "}
                        {createChallenge.isPending
                          ? "Creating Rematch…"
                          : "Challenge Again (Rematch)"}
                      </button>
                      <div className="outcome-links">
                        <Link className="secondary-chip" href="/leaderboard">
                          🏆 Leaderboard
                        </Link>
                        <Link className="secondary-chip" href="/profile">
                          👤 Rating History
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rules-recap-card">
                    <div className="room-panel-icon">
                      <ShieldCheck size={18} />
                    </div>
                    <span className="card-label">LUDO RULES</span>
                    <h4>How to Play</h4>
                    <ul>
                      <li>
                        <strong>Roll a 6</strong> to leave your base nest.
                      </li>
                      <li>
                        <strong>Rolling a 6</strong> awards a bonus turn.
                      </li>
                      <li>
                        <strong>Capturing</strong> an opponent piece returns it to
                        their base and awards a bonus turn.
                      </li>
                      <li>
                        <strong>Shield squares</strong> protect pieces from
                        being captured.
                      </li>
                      <li>
                        First player to move all 4 pieces to the{" "}
                        <strong>Center Home Goal</strong> wins!
                      </li>
                    </ul>
                  </div>
                )}
              </aside>
            </section>
          </>
        )}
      </main>
      <footer className="detail-footer">
        <span>
          <Users size={14} /> Real multiplayer table. Server-authoritative state.
        </span>
        <Link href="/">Return to Arena</Link>
      </footer>
    </div>
  );
}
