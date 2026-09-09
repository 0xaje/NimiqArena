import {
  ArrowLeft,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { soundEngine } from "@/lib/audio";
import { LudoBoard2D } from "@/components/game/LudoBoard2D";
import { Connect4Board2D } from "@/components/game/Connect4Board2D";
import { EscrowDepositModal } from "@/components/game/EscrowDepositModal";
import { VictoryPayoutBanner } from "@/components/game/VictoryPayoutBanner";
import { MatchWaitingRoom } from "@/components/game/MatchWaitingRoom";
import { EmoteOverlay } from "@/components/game/EmoteOverlay";
import { useMatchStream } from "@/lib/useMatchStream";
import { MatchHeader } from "@/components/match/MatchHeader";
import { BattlePlayersStrip } from "@/components/match/BattlePlayersStrip";
import { TurnEventBanner } from "@/components/match/TurnEventBanner";
import {
  ABANDONMENT_GRACE_MS,
  OPPONENT_PRESENCE_WARNING_MS,
  PLAYER_HEARTBEAT_INTERVAL_MS,
} from "@shared/const";

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
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const escrow = escrowQuery.data;

  const command = trpc.match.command.useMutation({
    onSuccess: () => utils.match.state.invalidate({ id: matchId }),
  });

  const c4Command = trpc.match.connect4Command.useMutation({
    onSuccess: () => utils.match.state.invalidate({ id: matchId }),
  });

  const heartbeat = trpc.match.heartbeat.useMutation();
  const disconnect = trpc.match.disconnect.useMutation();
  const botTurnMutation = trpc.match.triggerBotTurn.useMutation({
    onSuccess: () => utils.match.state.invalidate({ id: matchId }),
  });
  const emoteMutation = trpc.match.sendEmote.useMutation();

  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [botActionMessage, setBotActionMessage] = useState<string | null>(null);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(30);

  const prevTurnRef = useRef<number | null>(null);
  const prevDiceRef = useRef<number | null>(null);
  const [isBotRolling, setIsBotRolling] = useState(false);

  const state = stateQuery.data;
  const snapshot = state?.snapshot;
  const yourSeat = state?.yourSeat ?? (authQuery.data ? 0 : -1);
  const isYourTurn = Boolean(
    snapshot &&
      state?.status === "in_progress" &&
      snapshot.currentPlayer === yourSeat
  );
  const isBotMatch = Boolean(state?.joinCode?.startsWith("BOT"));
  const isBotTurn = Boolean(
    isBotMatch &&
      state?.status === "in_progress" &&
      snapshot &&
      snapshot.currentPlayer === 1 &&
      snapshot.winner === null
  );

  // Turn timer countdown effect
  useEffect(() => {
    if (!state || state.status !== "in_progress") return;
    setTurnSecondsLeft(30);
    const interval = setInterval(() => {
      setTurnSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [snapshot?.currentPlayer, state?.stateVersion, state?.status]);

  // Periodic heartbeat
  useEffect(() => {
    if (!matchId || !authQuery.data) return;
    const interval = setInterval(() => {
      heartbeat.mutate({ id: matchId });
    }, PLAYER_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [matchId, authQuery.data]);

  // Audio cues on turn and dice changes
  useEffect(() => {
    if (!snapshot) return;
    if (
      prevTurnRef.current !== null &&
      prevTurnRef.current !== snapshot.currentPlayer
    ) {
      soundEngine.playTurnAlert();
    }
    if (snapshot.dice !== null && prevDiceRef.current === null) {
      soundEngine.playDiceRoll();
    }
    prevTurnRef.current = snapshot.currentPlayer;
    prevDiceRef.current = snapshot.dice;
  }, [snapshot]);

  // Passive display: show AI activity banner and feedback reactively when server bot plays or when turns pass
  useEffect(() => {
    if (isBotTurn) {
      setIsBotRolling(true);
      setBotActionMessage("Nimiq AI is taking its turn…");
    } else {
      setIsBotRolling(false);
      const lastRoll = snapshot?.lastRoll;
      if (lastRoll && isBotMatch && lastRoll.playerId === 1) {
        if (!lastRoll.hadLegalMoves) {
          setBotActionMessage(
            `Nimiq AI rolled ${lastRoll.value} (no legal moves) — Your turn!`
          );
        } else {
          setBotActionMessage(
            `Nimiq AI rolled ${lastRoll.value} and moved! Your turn!`
          );
        }
        const timer = window.setTimeout(() => setBotActionMessage(null), 2500);
        return () => window.clearTimeout(timer);
      } else if (lastRoll && lastRoll.playerId === yourSeat && !lastRoll.hadLegalMoves) {
        setBotActionMessage(
          `You rolled ${lastRoll.value} (no legal moves available) — Turn passed.`
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
        await botTurnMutation.mutateAsync({ matchId });
        await utils.match.state.invalidate({ id: matchId });
        await stateQuery.refetch();
      } catch (err) {
        // Watchdog failsafe catch
      }
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isBotTurn, matchId]);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
    toast(muted ? "Sound Muted" : "Sound Enabled");
  };

  async function sendCommand(cmd:
    | { kind: "roll" }
    | { kind: "move"; pieceIndex: number; dieValue?: number }
  ) {
    if (!state) return;
    try {
      const commandPayload =
        cmd.kind === "roll"
          ? {
              kind: "roll" as const,
              expectedVersion: state.stateVersion,
              nonce: crypto.randomUUID().replace(/-/g, ""),
            }
          : {
              kind: "move" as const,
              pieceIndex: cmd.pieceIndex,
              dieValue: cmd.dieValue,
              expectedVersion: state.stateVersion,
              nonce: crypto.randomUUID().replace(/-/g, ""),
            };
      const res = await command.mutateAsync({
        id: matchId,
        command: commandPayload,
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
    } catch (error) {
      void utils.match.state.invalidate({ id: matchId });
      void stateQuery.refetch();

      const errMsg = error instanceof Error ? error.message : "";
      const isVersionConflict =
        errMsg.includes("version") ||
        errMsg.includes("changed") ||
        errMsg.includes("STALE_VERSION");

      if (!isVersionConflict) {
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

  // 1. Loading State
  if (stateQuery.isLoading) {
    return (
      <div className="pure-gameplay-page">
        <header className="gameplay-topbar">
          <Link href="/" className="gameplay-back-btn">
            <ArrowLeft size={14} />
            <span>RETURN TO LOBBY</span>
          </Link>
        </header>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", flexDirection: "column", gap: "16px" }}>
          <RefreshCw size={32} className="spin" style={{ color: "var(--brand-yellow)" }} />
          <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: "18px" }}>Connecting to Match Arena…</h2>
          <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "12px", opacity: 0.7 }}>Loading authoritative state version</p>
        </div>
      </div>
    );
  }

  // 2. Error / Unavailable State
  if (stateQuery.isError || !state) {
    return (
      <div className="pure-gameplay-page">
        <header className="gameplay-topbar">
          <Link href="/" className="gameplay-back-btn">
            <ArrowLeft size={14} />
            <span>RETURN TO LOBBY</span>
          </Link>
        </header>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", flexDirection: "column", gap: "16px", textAlign: "center", maxWidth: "480px", margin: "0 auto", padding: "0 20px" }}>
          <LockKeyhole size={36} style={{ color: "#ef4444" }} />
          <h2 style={{ fontFamily: "Outfit, sans-serif", fontSize: "20px", margin: 0 }}>Match Unavailable</h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", opacity: 0.8, lineHeight: 1.5 }}>
            You must be a signed-in participant to access this room. Check that you are logged in and using a valid match code.
          </p>
          <Link href="/join" className="copy-code" style={{ textDecoration: "none", marginTop: "8px" }}>
            Join with a challenge code
          </Link>
        </div>
      </div>
    );
  }

  // 3. Waiting Room State
  if (state.status === "waiting") {
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
              window.location.href = state.engineVersion === "connect4-v1" ? "/games/connect-four" : "/games/ludo-league";
            }
          }}
          isDepositNeeded={isDepositNeeded}
          onDepositPrompt={() => setIsDepositModalOpen(true)}
        />
        {escrow && (
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

  // 4. Live / In-Progress / Finished Gameplay
  const isC4 = state.engineVersion === "connect4-v1";
  const p1Name = yourSeat === 0 ? (authQuery.data?.name || "Player 1") : "Player 1";
  const p2Name = isBotMatch
    ? "Nimiq AI"
    : yourSeat === 1
      ? (authQuery.data?.name || "Player 2")
      : "Player 2";
  const activeSeat = snapshot?.currentPlayer ?? 0;
  const isFinished = snapshot?.winner !== null && snapshot?.winner !== undefined;
  const returnRoute = isC4 ? "/games/connect-four" : "/games/ludo-league";

  async function handlePlayAgain() {
    if (isReplaying) return;
    setIsReplaying(true);
    const gameSlug = isC4 ? "connect-four" : "ludo-league";
    try {
      if (!authQuery.data) {
        const loginRes = await guestLogin.mutateAsync({
          name: "Player 1 (Solo)",
        });
        if (loginRes.token) {
          sessionStorage.setItem(
            "manus-cookie",
            `manus-session=${loginRes.token}`
          );
        }
        await utils.auth.me.invalidate();
      }
      toast.info("Starting replay match…");
      if (escrow?.isWagered && escrow.stakeNim) {
        const newMatch = await createWagered.mutateAsync({
          gameSlug,
          stakeNim: escrow.stakeNim,
        });
        window.location.href = `/matches/${newMatch.id}`;
      } else {
        const newMatch = await createSolo.mutateAsync({ gameSlug });
        window.location.href = `/matches/${newMatch.id}`;
      }
    } catch (err) {
      setIsReplaying(false);
      toast.error("Failed to start replay", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }

  return (
    <div className="pure-gameplay-page">
      {/* Modular Topbar */}
      <MatchHeader
        matchId={matchId}
        isWagered={escrow?.isWagered}
        totalPotNim={escrow?.totalPotNim}
        isFinished={isFinished}
        isMuted={isMuted}
        onToggleSound={toggleSound}
        returnRoute={returnRoute}
        stateVersion={state?.stateVersion}
        dice={(snapshot as any)?.dice}
      />

      {/* Players Battle Strip */}
      <BattlePlayersStrip
        p1Name={p1Name}
        p2Name={p2Name}
        activeSeat={activeSeat}
        turnSecondsLeft={turnSecondsLeft}
        isBotMatch={isBotMatch}
        gameKind={isC4 ? "connect4" : "ludo"}
        p1Score={
          !isC4 && (snapshot as any)?.players?.[0]?.pieces
            ? (snapshot as any).players[0].pieces.filter((p: any) => p.position === 57).length
            : undefined
        }
        p2Score={
          !isC4 && (snapshot as any)?.players?.[1]?.pieces
            ? (snapshot as any).players[1].pieces.filter((p: any) => p.position === 57).length
            : undefined
        }
        totalTarget={
          !isC4 && (snapshot as any)?.players?.[0]?.pieces
            ? (snapshot as any).players[0].pieces.length
            : undefined
        }
      />

      {/* Dynamic Turn & Event Banner */}
      <TurnEventBanner
        isFinished={isFinished}
        isYourTurn={isYourTurn}
        isBotTurn={isBotTurn}
        yourSeat={yourSeat}
        winner={snapshot?.winner}
        opponentName={p2Name}
        gameKind={isC4 ? "connect4" : "ludo"}
        dice={snapshot?.dice}
        remainingDice={(snapshot as any)?.remainingDice}
        botActionMessage={botActionMessage}
      />

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
          isReplaying={isReplaying}
          onPlayAgain={handlePlayAgain}
          onReturnToLobby={() => {
            window.location.href = returnRoute;
          }}
        />
      )}

      {/* Primary Hero Board Area */}
      <div className="board-hero-area">
        <EmoteOverlay
          emotes={activeEmotes}
          chats={activeChats}
          yourSeat={yourSeat}
        />
        {snapshot &&
          (isC4 ? (
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
              remainingDice={(snapshot as any)?.remainingDice}
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
              onMovePiece={(pieceIndex, dieValue) =>
                sendCommand({ kind: "move", pieceIndex, dieValue })
              }
              onRoll={() => sendCommand({ kind: "roll" })}
              canRoll={
                isYourTurn &&
                snapshot?.dice === null &&
                (!(snapshot as any)?.remainingDice ||
                  (snapshot as any).remainingDice.length === 0) &&
                snapshot?.winner === null &&
                !command.isPending
              }
              isRolling={command.isPending || isBotRolling}
              disabled={command.isPending || isBotTurn}
              isBotMatch={isBotMatch}
            />
          ))}
      </div>

      {/* Spectator Interactive Cheer Bar */}
      {yourSeat === -1 && (
        <div className="spectator-cheer-bar">
          <span className="spectator-cheer-title">CHEER THE TABLE:</span>
          <div className="spectator-cheer-emojis">
            {[
              { id: "fire", emoji: "🔥" },
              { id: "gg", emoji: "👏" },
              { id: "crown", emoji: "👑" },
              { id: "rocket", emoji: "🚀" },
              { id: "bullseye", emoji: "🎯" },
              { id: "diamond", emoji: "💎" },
              { id: "shock", emoji: "😱" },
            ].map(({ id, emoji }) => (
              <button
                key={id}
                type="button"
                className="spectator-cheer-chip"
                onClick={async () => {
                  try {
                    soundEngine.playChipDrop();
                    await emoteMutation.mutateAsync({
                      matchId,
                      emote: id as any,
                    });
                  } catch {}
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
