import {
  ArrowLeft,
  LockKeyhole,
  RefreshCw,
  Flag,
  Trophy,
  Volume2,
  VolumeX,
  Bot,
  Diamond,
  ShieldCheck,
  Dices,
  Lock,
  Sparkles,
  Wallet,
  RotateCw,
  CheckCircle2,
  User,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { soundEngine } from "@/lib/audio";
import { formatNim } from "@shared/game/pot-distribution";
import { LudoBoard2D } from "@/components/game/LudoBoard2D";
import { Connect4Board2D } from "@/components/game/Connect4Board2D";
import { EscrowDepositModal } from "@/components/game/EscrowDepositModal";
import { VictoryPayoutBanner } from "@/components/game/VictoryPayoutBanner";
import { MatchWaitingRoom } from "@/components/game/MatchWaitingRoom";
import { EmoteOverlay } from "@/components/game/EmoteOverlay";
import { EmoteWheel } from "@/components/game/EmoteWheel";
import { ProvablyFairModal } from "@/components/game/ProvablyFairModal";
import { useMatchStream } from "@/lib/useMatchStream";
import { useNimiqWallet } from "@/lib/useNimiqWallet";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import {
  ABANDONMENT_GRACE_MS,
  PLAYER_HEARTBEAT_INTERVAL_MS,
} from "@shared/const";

// Helper component to render 3D holographic dice face pips
function DiceFace({ value, isRolling }: { value: number | null; isRolling: boolean }) {
  const pip = (
    <span className="w-2 h-2 rounded-full bg-[#f3b72c] shadow-[0_0_6px_#f3b72c]" />
  );

  if (isRolling) {
    return (
      <div className="w-12 h-12 rounded-lg bg-[#080e1c] flex items-center justify-center p-2 shadow-inner transition-transform animate-spin text-[#f3b72c]">
        <Dices size={24} />
      </div>
    );
  }

  switch (value) {
    case 1:
      return (
        <div className="w-12 h-12 rounded-lg bg-[#080e1c] flex items-center justify-center p-2 shadow-inner transition-transform">
          {pip}
        </div>
      );
    case 2:
      return (
        <div className="w-12 h-12 rounded-lg bg-[#080e1c] flex flex-col justify-between p-2 shadow-inner transition-transform">
          <div className="flex justify-start">{pip}</div>
          <div className="flex justify-end">{pip}</div>
        </div>
      );
    case 3:
      return (
        <div className="w-12 h-12 rounded-lg bg-[#080e1c] flex flex-col justify-between p-2 shadow-inner transition-transform">
          <div className="flex justify-start">{pip}</div>
          <div className="flex justify-center">{pip}</div>
          <div className="flex justify-end">{pip}</div>
        </div>
      );
    case 4:
      return (
        <div className="w-12 h-12 rounded-lg bg-[#080e1c] flex flex-col justify-between p-2 shadow-inner transition-transform">
          <div className="flex justify-between w-full">{pip}{pip}</div>
          <div className="flex justify-between w-full">{pip}{pip}</div>
        </div>
      );
    case 5:
      return (
        <div className="w-12 h-12 rounded-lg bg-[#080e1c] flex flex-col justify-between p-2 shadow-inner transition-transform">
          <div className="flex justify-between w-full">{pip}{pip}</div>
          <div className="flex justify-center w-full">{pip}</div>
          <div className="flex justify-between w-full">{pip}{pip}</div>
        </div>
      );
    case 6:
      return (
        <div className="w-12 h-12 rounded-lg bg-[#080e1c] flex flex-col justify-between p-2 shadow-inner transition-transform">
          <div className="flex justify-between w-full">{pip}{pip}</div>
          <div className="flex justify-between w-full">{pip}{pip}</div>
          <div className="flex justify-between w-full">{pip}{pip}</div>
        </div>
      );
    default:
      return (
        <div className="w-12 h-12 rounded-lg bg-[#080e1c] flex items-center justify-center p-2 shadow-inner text-[#ffd78d]/60">
          <Dices size={24} />
        </div>
      );
  }
}

export default function MatchRoom() {
  const [, params] = useRoute("/matches/:id");
  const matchId = params?.id ?? "";
  const utils = trpc.useUtils();
  const { balanceNim, isConnected } = useNimiqWallet();

  // Real-time zero latency SSE event stream
  const {
    isConnected: isStreamConnected,
    activeEmotes,
    activeChats,
  } = useMatchStream({
    matchId,
    enabled: Boolean(matchId),
    onStateUpdate: (streamState) => {
      utils.match.state.setData({ id: matchId }, (prev) => {
        if (!prev) return streamState;
        if (
          typeof streamState?.stateVersion === "number" &&
          streamState.stateVersion < prev.stateVersion
        ) {
          return prev;
        }
        return {
          ...prev,
          ...streamState,
          joinCode: streamState.joinCode || prev.joinCode,
          isWagered: streamState.isWagered ?? prev.isWagered,
          stakeNim: streamState.stakeNim ?? prev.stakeNim,
        };
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
      refetchInterval: (query: any): number | false =>
        query?.state?.data?.status === "waiting"
          ? 1_000
          : isStreamConnected
          ? false
          : 1_500,
    }
  );

  const isWagered = Boolean(
    stateQuery.data?.isWagered ||
      stateQuery.data?.joinCode?.startsWith("WAG") ||
      Boolean(stateQuery.data?.stakeNim && stateQuery.data.stakeNim > 0)
  );

  const escrowQuery = trpc.match.escrowDetails.useQuery(
    { matchId },
    {
      enabled: Boolean(matchId),
      refetchInterval: (query: any): number | false => {
        if (stateQuery.data?.status === "in_progress" && !isDepositModalOpen)
          return false;
        return 2_500;
      },
    }
  );

  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const loginWithNimiq = trpc.auth.loginWithNimiq.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const createWagered = trpc.match.createWageredMatch.useMutation();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isRecoveringAuth, setIsRecoveringAuth] = useState(false);
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [botActionMessage, setBotActionMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(14);

  const isRecoveringAuthRef = useRef(false);
  const escrow = escrowQuery.data;

  const command = trpc.match.command.useMutation({
    onSuccess: (res: any) => {
      if (res?.snapshot) {
        utils.match.state.setData({ id: matchId }, (prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            stateVersion: res.snapshot.version,
            snapshot: res.snapshot,
            status: (res.status as any) ?? prev.status,
          };
        });
      }
    },
  });

  const c4Command = trpc.match.connect4Command.useMutation({
    onSuccess: (res: any) => {
      if (res?.snapshot) {
        utils.match.state.setData({ id: matchId }, (prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            stateVersion: res.snapshot.version,
            snapshot: res.snapshot,
            status: (res.status as any) ?? prev.status,
          };
        });
      }
    },
  });

  const heartbeat = trpc.match.heartbeat.useMutation();
  const disconnect = trpc.match.disconnect.useMutation();
  const botTurnMutation = trpc.match.triggerBotTurn.useMutation({
    onSuccess: (res: any) => {
      if (res?.snapshot) {
        utils.match.state.setData({ id: matchId }, (prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            stateVersion: res.snapshot.version,
            snapshot: res.snapshot,
            status: (res.status as any) ?? prev.status,
          };
        });
      }
    },
  });
  const emoteMutation = trpc.match.sendEmote.useMutation();
  const startMatchMutation = trpc.match.startMatch.useMutation({
    onSuccess: () => {
      toast.success("Game Started!", { description: "Entering arena…" });
      void utils.match.state.invalidate({ id: matchId });
      void stateQuery.refetch();
    },
    onError: (err) => {
      toast.error("Could not start match", {
        description: err.message,
      });
    },
  });

  const recoverSessionAndEnter = useCallback(async () => {
    if (isRecoveringAuthRef.current) return;
    isRecoveringAuthRef.current = true;
    setIsRecoveringAuth(true);
    try {
      const savedWallet = localStorage.getItem("nimiq_arena_wallet_address");
      let loginToken: string | null = null;
      if (savedWallet) {
        try {
          const ch = await utils.client.auth.requestChallenge.query();
          const res = await loginWithNimiq.mutateAsync({
            address: savedWallet,
            challenge: ch.challenge,
          });
          loginToken = res?.token || null;
        } catch (e) {
          console.warn("[MatchRoom] Nimiq auto-login fallback to guest:", e);
        }
      }
      if (!loginToken) {
        const res = await guestLogin.mutateAsync({ name: "Player 1" });
        loginToken = res?.token || null;
      }
      if (loginToken) {
        sessionStorage.setItem("manus-cookie", `manus-session=${loginToken}`);
        localStorage.setItem("manus-cookie", `manus-session=${loginToken}`);
      }
      await utils.auth.me.invalidate();
      await stateQuery.refetch();
    } catch (e) {
      console.warn("[MatchRoom] Auth recovery error:", e);
    } finally {
      isRecoveringAuthRef.current = false;
      setIsRecoveringAuth(false);
    }
  }, [utils, loginWithNimiq, guestLogin, stateQuery]);

  // Auto-attempt recovery if stateQuery fails due to UNAUTHORIZED
  useEffect(() => {
    if (!matchId) return;
    const isUnauthorized =
      stateQuery.error?.data?.code === "UNAUTHORIZED" ||
      (stateQuery.isError && authQuery.isSuccess && !authQuery.data);

    if (isUnauthorized && !isRecoveringAuthRef.current) {
      void recoverSessionAndEnter();
    }
  }, [
    matchId,
    stateQuery.isError,
    stateQuery.error,
    authQuery.isSuccess,
    authQuery.data,
    recoverSessionAndEnter,
  ]);

  const state = stateQuery.data;
  const snapshot = state?.snapshot;
  const isBotMatch = Boolean(state?.joinCode?.startsWith("BOT"));
  const rawSeat = state?.yourSeat;
  const yourSeat =
    rawSeat !== undefined && rawSeat !== -1
      ? rawSeat
      : isBotMatch
      ? 0
      : authQuery.data
      ? 0
      : -1;

  const gameplayStakeNim =
    escrow?.stakeNim && escrow.stakeNim > 0
      ? escrow.stakeNim
      : (state as any)?.stakeNim && (state as any).stakeNim > 0
      ? (state as any).stakeNim
      : 50;

  const isYourTurn = Boolean(
    snapshot &&
      state?.status === "in_progress" &&
      snapshot.currentPlayer === yourSeat
  );

  const isBotTurn = Boolean(
    isBotMatch &&
      state?.status === "in_progress" &&
      snapshot &&
      snapshot.currentPlayer === 1 &&
      snapshot.winner === null
  );

  // Turn timer countdown
  useEffect(() => {
    if (!isYourTurn) {
      setSecondsLeft(20);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isYourTurn, snapshot?.currentPlayer, snapshot?.turnCount]);

  // Periodic heartbeat
  useEffect(() => {
    if (!matchId || !stateQuery.data || stateQuery.data.status === "finished") {
      return;
    }
    const interval = setInterval(() => {
      heartbeat.mutate({ id: matchId });
    }, PLAYER_HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [matchId, stateQuery.data?.status]);

  // Autonomous bot turn trigger
  useEffect(() => {
    if (!isBotTurn || !matchId) return;
    const timer = setTimeout(() => {
      botTurnMutation.mutate({ matchId });
    }, 1200);
    return () => clearTimeout(timer);
  }, [isBotTurn, matchId, snapshot?.turnCount]);

  const toggleSound = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
    toast(muted ? "Sound Muted" : "Sound Enabled");
  };

  async function handleSurrender() {
    if (confirm("Are you sure you want to forfeit this match and return to games?")) {
      try {
        await disconnect.mutateAsync({ id: matchId });
      } catch {}
      window.location.href = isC4 ? "/games/connect-four" : "/games/ludo-league";
    }
  }

  async function sendCommand(
    cmd:
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

      if (cmd.kind === "roll") {
        soundEngine.playDiceRoll();
      } else {
        soundEngine.playPieceMove();
      }

      const res = await command.mutateAsync({
        id: matchId,
        command: commandPayload,
      });

      if (res?.snapshot) {
        utils.match.state.setData({ id: matchId }, (prev: any) => {
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
        utils.match.state.setData({ id: matchId }, (prev: any) => {
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

  const sendQuickEmote = async (emoji: string) => {
    try {
      soundEngine.playCapture();
      const emoteKey =
        emoji === "GG"
          ? "gg"
          : emoji === "🔥"
          ? "fire"
          : emoji === "⚡"
          ? "shock"
          : "diamond";
      await emoteMutation.mutateAsync({
        matchId,
        emote: emoteKey as any,
      });
      toast.success(`Sent emote: ${emoji}`);
    } catch {}
  };

  // 1. Loading State
  if (stateQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans">
        <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl items-center justify-center p-6 text-center">
          <RotateCw size={36} className="animate-spin text-[#f3b72c] mb-3" />
          <h2 className="text-lg font-bold text-[#dde2f6]">
            Connecting to Match Arena…
          </h2>
          <p className="text-xs text-[#d4c5ad] font-mono mt-1">
            Loading authoritative state version
          </p>
        </div>
      </div>
    );
  }

  // 2. Error / Unauthorized State
  if (stateQuery.isError || !state) {
    return (
      <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans">
        <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl items-center justify-center p-6 text-center">
          <LockKeyhole size={36} className="text-[#ffb4ab] mb-3" />
          <h2 className="text-xl font-bold text-[#dde2f6]">
            {isRecoveringAuth ? "Restoring Match Session…" : "Match Unavailable"}
          </h2>
          <p className="text-xs text-[#d4c5ad] mt-2 max-w-[280px]">
            {isRecoveringAuth
              ? "Re-connecting your player credentials to the match room…"
              : "You must be a signed-in participant to access this room."}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => void recoverSessionAndEnter()}
              disabled={isRecoveringAuth}
              className="px-4 py-2 bg-[#f3b72c] text-[#412d00] rounded-xl text-xs font-bold"
            >
              {isRecoveringAuth ? "Connecting…" : "Sign In & Enter Match"}
            </button>
            <Link
              href="/games"
              className="px-4 py-2 bg-[#191f2e] border border-[#2f3544] text-[#dde2f6] rounded-xl text-xs font-semibold"
            >
              Return to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Waiting Room State
  if (state.status === "waiting") {
    const hostName =
      yourSeat === 0
        ? authQuery.data?.name || "Player 1 (Host)"
        : "Player 1 (Host)";
    const guestPlayer = state.players.find((p: any) => p.seat === 1);
    const guestName = guestPlayer
      ? yourSeat === 1
        ? authQuery.data?.name || "Player 2"
        : guestPlayer.name || "Challenger Joined"
      : null;
    const isWageredMatchTable = Boolean(
      escrow?.isWagered ||
        (state as any)?.isWagered ||
        state.joinCode?.startsWith("WAG") ||
        (escrow?.stakeNim && escrow.stakeNim > 0) ||
        ((state as any)?.stakeNim && (state as any).stakeNim > 0)
    );
    const effectiveStakeNim =
      escrow?.stakeNim && escrow.stakeNim > 0
        ? escrow.stakeNim
        : (state as any)?.stakeNim && (state as any).stakeNim > 0
        ? (state as any).stakeNim
        : 0;
    const effectiveTotalPotNim =
      escrow?.totalPotNim || effectiveStakeNim * 2;
    const hostStatus = escrow?.playerStatuses?.find((p) => p.seat === 0);
    const guestStatus = escrow?.playerStatuses?.find((p) => p.seat === 1);
    const allVerified =
      !isWageredMatchTable || Boolean(escrow?.allVerified);
    const myDepositVerified = Boolean(
      !isWageredMatchTable ||
        escrow?.playerStatuses?.find((p) => p.seat === yourSeat)?.verified
    );
    const isDepositNeeded = Boolean(
      isWageredMatchTable && !myDepositVerified
    );

    return (
      <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans">
        <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] shadow-2xl">
          <MatchWaitingRoom
            matchId={matchId}
            joinCode={state.joinCode || ""}
            hostName={hostName}
            guestName={guestName}
            stakeNim={effectiveStakeNim}
            totalPotNim={effectiveTotalPotNim}
            totalFundedNim={
              escrow?.totalFundedNim ??
              (hostStatus?.verified && guestStatus?.verified
                ? effectiveTotalPotNim
                : hostStatus?.verified || guestStatus?.verified
                ? effectiveStakeNim
                : 0)
            }
            fundingProgress={
              escrow?.fundingProgress ??
              (allVerified ? "FUNDED" : "NOT_FUNDED")
            }
            hostCommittedNim={
              hostStatus?.committedNim ??
              (hostStatus?.verified ? effectiveStakeNim : 0)
            }
            guestCommittedNim={
              guestStatus?.committedNim ??
              (guestStatus?.verified ? effectiveStakeNim : 0)
            }
            hostFundingStatus={
              hostStatus?.fundingStatus ??
              (hostStatus?.verified ? "FUNDED" : "NOT_FUNDED")
            }
            guestFundingStatus={
              guestStatus?.fundingStatus ??
              (guestStatus?.verified ? "FUNDED" : "NOT_FUNDED")
            }
            escrowError={
              (state as any)?.escrowError ||
              (escrowQuery.error ? escrowQuery.error.message : null)
            }
            isHost={yourSeat === 0}
            onLeave={() => {
              if (confirm("Are you sure you want to leave this table?")) {
                window.location.href =
                  state.engineVersion === "connect4-v1"
                    ? "/games/connect-four"
                    : "/games/ludo-league";
              }
            }}
            isDepositNeeded={isDepositNeeded}
            isWagered={isWageredMatchTable}
            allVerified={allVerified}
            isStarting={startMatchMutation.isPending}
            onDepositPrompt={() => setIsDepositModalOpen(true)}
            onStartMatch={() => {
              startMatchMutation.mutate({ matchId });
            }}
          />
          <EscrowDepositModal
            isOpen={isDepositModalOpen}
            onClose={() => setIsDepositModalOpen(false)}
            matchId={matchId}
            stakeNim={effectiveStakeNim}
            onDepositSuccess={() => {
              void escrowQuery.refetch();
              void stateQuery.refetch();
            }}
          />
        </div>
      </div>
    );
  }

  // 4. Live / In-Progress Gameplay
  const isC4 = state.engineVersion === "connect4-v1";
  const p1Player = state.players?.find((p: any) => p.seat === 0);
  const p2Player = state.players?.find((p: any) => p.seat === 1);
  const p1Name =
    yourSeat === 0
      ? authQuery.data?.name || p1Player?.name || "Player 1"
      : p1Player?.name || "Player 1";
  const p2Name = isBotMatch
    ? "Arena Bot"
    : yourSeat === 1
    ? authQuery.data?.name || p2Player?.name || "Player 2"
    : p2Player?.name || "Player 2";

  const isFinished =
    snapshot?.winner !== null && snapshot?.winner !== undefined;
  const returnRoute = isC4 ? "/games/connect-four" : "/games/ludo-league";

  const myPieces = (snapshot as any)?.players?.[yourSeat]?.pieces || [];
  const oppSeat = yourSeat === 0 ? 1 : 0;
  const oppPieces = (snapshot as any)?.players?.[oppSeat]?.pieces || [];

  const oppYardCount = oppPieces.filter((p: any) => p.position === -1).length;
  const playerInArenaCount = myPieces.filter(
    (p: any) => p.position >= 0 && p.position < 56
  ).length;

  // Connect 4 Disc Counts
  const c4Board = (snapshot as any)?.board as (0 | 1 | null)[][] | undefined;
  let c4MyDiscsPlaced = 0;
  let c4OppDiscsPlaced = 0;
  if (isC4 && c4Board && Array.isArray(c4Board)) {
    for (const col of c4Board) {
      if (Array.isArray(col)) {
        for (const cell of col) {
          if (cell === yourSeat) c4MyDiscsPlaced++;
          else if (cell !== null && cell !== undefined) c4OppDiscsPlaced++;
        }
      }
    }
  }
  const c4MyDiscsLeft = Math.max(0, 21 - c4MyDiscsPlaced);
  const c4OppDiscsLeft = Math.max(0, 21 - c4OppDiscsPlaced);

  const currentDice = (snapshot as any)?.dice ?? null;
  const canRoll =
    isYourTurn &&
    currentDice === null &&
    !command.isPending &&
    !isFinished;

  const roundNum = Math.floor(((snapshot as any)?.turnCount || 0) / 2) + 1;
  const turnNum = (snapshot as any)?.turnCount || 1;
  const totalPot = gameplayStakeNim * 2;

  // Turn announcement sub-caption
  let turnSubCaption = "Waiting for opponent…";
  if (isYourTurn) {
    if (canRoll) {
      turnSubCaption = "Roll dice to mobilize pawns";
    } else if (currentDice !== null) {
      turnSubCaption = `Rolled a ${currentDice}! Select a pawn to advance`;
    }
  } else if (isBotTurn) {
    turnSubCaption = "Arena Bot is computing path…";
  } else {
    turnSubCaption = `${p2Name}'s turn to roll & advance`;
  }

  // Circular timer calculation (circumference ~ 94.2)
  const timerProgress = Math.max(0, Math.min(1, secondsLeft / 20));
  const strokeOffset = 94.2 * (1 - timerProgress);

  return (
    <div className="min-h-screen bg-[#0d1321] text-[#dde2f6] flex flex-col font-sans relative selection:bg-[#f3b72c]/30 selection:text-[#ffd78d]">
      {/* MOBILE MINI-APP CONTAINER */}
      <div className="max-w-md w-full mx-auto min-h-screen flex flex-col bg-[#0d1321] relative shadow-2xl overflow-x-hidden">
        
        {/* ========================================================================= */}
        {/* FIXED APP HEADER                                                          */}
        {/* ========================================================================= */}
        <header className="fixed top-0 inset-x-0 z-50 pointer-events-none">
          <div className="max-w-md mx-auto w-full pointer-events-auto bg-[#0d1321]/85 backdrop-blur-xl border-b border-[#242a39]/80 shadow-[0_1px_12px_rgba(0,0,0,0.4)] pt-safe">
            <div className="h-16 px-4 flex items-center justify-between">
              
              {/* Left: Brand & Room */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="relative">
                  <img
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover border border-[#f3b72c]/40 group-hover:border-[#f3b72c] transition-colors"
                    src="https://lh3.googleusercontent.com/aida/AEtjO1X_SEKkH_ei8ODz8gUMrl0X_UrXhtg4pdYeHJ7fpZEFwzYsY6x_OXMzm2c0kYB-y4CLDd0oVD0NDSwRxV9XVNucimIN9qNoRNfl65Ojaz6sf7dYDYsdQ0oz9rrsmw4dNv_wcudv-yE8D2P2-b2L5jQ7mRfM28LeclhEAIg0i4d3K1sG6fmemSFnWSDCW5iUeYg_jkd-F18QXTod1fOZxgsojaMfvS9MiiXrbKsYZ05rem4Va3ra26FYmS4F"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#68f5b8] border-2 border-[#0d1321]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-[#ffdea4] tracking-tight leading-none">
                    NIMIQ ARENA
                  </span>
                  <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono mt-0.5">
                    Match #{matchId.slice(0, 6)}
                  </span>
                </div>
              </Link>

              {/* Right: Wallet Balance Pill */}
              <div className="h-10 px-3 flex items-center gap-2 bg-[#191f2e] border border-[#2f3544] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-[#68f5b8] shadow-[0_0_8px_#68f5b8]"
                      : "bg-[#f3b72c] shadow-[0_0_8px_#f3b72c]"
                  }`}
                />
                <span className="text-xs font-semibold text-[#dde2f6] font-mono">
                  {balanceNim != null ? formatNim(balanceNim) : "1,420"}{" "}
                  <span className="text-[#ffd78d] font-bold">NIM</span>
                </span>
                <Wallet size={15} className="text-[#a5e7ff]" />
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MAIN GAMEPLAY VIEWPORT                                                    */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col w-full pt-16 pb-24 bg-[#0d1321] select-none overflow-x-hidden">
          
          {/* Dynamic Turn Urgency Bar */}
          <div className="w-full h-1 bg-[#080e1c] relative overflow-hidden">
            <div
              className={`h-full transition-all duration-300 shadow-[0_0_8px_#00d2ff] ${
                secondsLeft <= 4 ? "bg-[#ffb4ab]" : "bg-[#00d2ff]"
              }`}
              id="turn-timer-bar"
              style={{ width: `${(secondsLeft / 20) * 100}%` }}
            />
          </div>

          {/* HUD Header: Match Top Bar */}
          <header className="px-4 py-2 flex items-center justify-between bg-[#151b29] border-b border-[#242a39]">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSurrender}
                aria-label="Forfeit match"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#191f2e] hover:bg-[#242a39] active:scale-95 transition-transform text-[#d4c5ad]"
                title="Forfeit match"
              >
                <Flag size={18} />
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-[#d4c5ad]">
                  ROUND {roundNum}
                </span>
                <span className="text-sm font-bold text-[#dde2f6] leading-none">
                  Turn {turnNum}
                </span>
              </div>
            </div>

            {/* Center Pot Chip */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#242a39] border border-[#f3b72c]/30 shadow-[0_0_16px_rgba(243,183,44,0.15)]">
              <Trophy size={16} className="text-[#f3b72c]" />
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-sm font-bold text-[#ffd78d]">
                  {totalPot}
                </span>
                <span className="text-[10px] text-[#f3b72c] font-semibold tracking-wider">
                  NIM POT
                </span>
              </div>
            </div>

            {/* Right Controls: Latency, Audio, VRF Audit */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#191f2e] border border-[#242a39]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#46d89d] shadow-[0_0_6px_#46d89d] animate-pulse" />
                <span className="text-[10px] text-[#d4c5ad] font-mono">18ms</span>
              </div>
              <button
                onClick={toggleSound}
                aria-label="Toggle audio"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#191f2e] hover:bg-[#242a39] active:scale-95 transition-transform text-[#d4c5ad]"
                title={isMuted ? "Unmute Sound" : "Mute Sound"}
              >
                {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              <button
                onClick={() => setShowProvablyFair(true)}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#191f2e] hover:bg-[#242a39] active:scale-95 transition-transform text-[#ffd78d]"
                title="Cryptographic VRF Audit"
              >
                <ShieldCheck size={17} />
              </button>
            </div>
          </header>

          {/* Opponent Strip */}
          {isC4 ? (
            <section className="mx-4 mt-2 p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#2f3544] overflow-hidden shadow-inner flex items-center justify-center">
                    <Bot size={22} className="text-[#a5e7ff]" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00d2ff] flex items-center justify-center shadow-[0_0_8px_#00d2ff]">
                    <Zap size={10} className="text-[#003543] font-bold" />
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-[#dde2f6] truncate leading-tight">
                      {p2Name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#2f3544] text-[10px] text-[#a5e7ff] font-mono">
                      LVL 54
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#d4c5ad]">
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#a5e7ff]">
                      <span className="w-2 h-2 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff]" />
                      Cyan Discs
                    </span>
                    <span className="text-[#4f4534]">•</span>
                    <span className="text-[11px] font-mono text-[#d4c5ad]">
                      {c4OppDiscsLeft} Discs Left
                    </span>
                  </div>
                </div>
              </div>

              {/* Opponent Status Pill */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2f3544]">
                  <RotateCw
                    size={12}
                    className={`text-[#a5e7ff] ${!isYourTurn ? "animate-spin" : ""}`}
                  />
                  <span className="text-[11px] text-[#a5e7ff] font-mono font-medium">
                    {!isYourTurn ? "Thinking…" : "Waiting…"}
                  </span>
                </div>
                <span className="text-[10px] text-[#d4c5ad] font-mono mt-0.5">
                  Time: {secondsLeft}s
                </span>
              </div>
            </section>
          ) : (
            <section className="mx-4 mt-2 px-3 py-2 rounded-xl bg-[#191f2e] border border-[#242a39] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[#2f3544] flex items-center justify-center text-[#a5e7ff] border border-white/5">
                    <Bot size={18} />
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1 rounded-full bg-[#a5e7ff] text-[#003543] font-mono text-[9px] font-bold leading-none">
                    L.42
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#dde2f6] truncate">
                      {p2Name}
                    </span>
                    <Diamond size={13} className="text-[#a5e7ff] shrink-0" />
                  </div>
                  <span className="text-[10px] text-[#d4c5ad] font-mono">
                    Cyan Legion · Rank Diamond
                  </span>
                </div>
              </div>

              {/* Opponent Pawn State Indicators */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                <span className="text-[10px] text-[#a5e7ff] font-mono">
                  IN YARD: {oppYardCount}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  {[0, 1, 2, 3].map((idx) => (
                    <span
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        idx < oppYardCount
                          ? "bg-[#00d2ff] shadow-[0_0_6px_#00d2ff]"
                          : "bg-[#2f3544]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* TACTICAL ARENA VIEWPORT & ACTION ZONE                                     */}
          {/* ========================================================================= */}
          {isC4 ? (
            <section className="relative px-4 my-2 flex flex-col items-center justify-center">
              {/* Emote Overlay */}
              <EmoteOverlay
                emotes={activeEmotes}
                chats={activeChats}
                yourSeat={yourSeat}
              />

              {snapshot && (
                <Connect4Board2D
                  board={(snapshot as any).board || []}
                  currentPlayer={(snapshot as any).currentPlayer ?? 0}
                  winner={(snapshot as any).winner ?? null}
                  winningLine={(snapshot as any).winningLine ?? null}
                  yourSeat={yourSeat}
                  isYourTurn={isYourTurn}
                  onDropDisc={sendConnect4Drop}
                  disabled={c4Command.isPending || isBotTurn}
                  onSendEmote={sendQuickEmote}
                  secondsLeft={secondsLeft}
                />
              )}
            </section>
          ) : (
            <>
              <section className="relative px-4 my-2 flex flex-col items-center justify-center">
                <div className="relative w-full max-w-[390px] aspect-square rounded-2xl bg-[#080e1c] border border-[#242a39] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center">
                  {/* Ambient Board Glow Elements */}
                  <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-[#00d2ff]/10 blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-[#f3b72c]/15 blur-2xl pointer-events-none" />

                  {/* Emote Overlay */}
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
                      canRoll={canRoll}
                      isRolling={command.isPending}
                      disabled={command.isPending || isBotTurn}
                      isBotMatch={isBotMatch}
                    />
                  )}

                  {/* Floating Tactical Overlay: LIVE SYNC Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#191f2e]/90 backdrop-blur-sm border border-white/10 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-ping" />
                    <span className="text-[10px] text-[#a5e7ff] font-mono font-bold">
                      LIVE SYNC
                    </span>
                  </div>
                </div>
              </section>

              {/* LUDO TURN STATUS & ACTION HUD (Thumb Zone) */}
              <section className="px-4 flex flex-col items-center">
                {/* Turn Announcement Bar */}
                <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#191f2e] border border-[#242a39] shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                        isYourTurn
                          ? "bg-[#f3b72c] shadow-[0_0_10px_#f3b72c]"
                          : "bg-[#00d2ff] shadow-[0_0_10px_#00d2ff]"
                      }`}
                    />
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-extrabold tracking-wide leading-tight font-mono ${
                          isYourTurn ? "text-[#ffd78d]" : "text-[#a5e7ff]"
                        }`}
                      >
                        {isYourTurn ? "YOUR TURN" : `${p2Name.toUpperCase()}'S TURN`}
                      </span>
                      <span className="text-xs text-[#d4c5ad] leading-none mt-0.5">
                        {turnSubCaption}
                      </span>
                    </div>
                  </div>

                  {/* Circular Countdown Timer Badge */}
                  <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        fill="none"
                        r="15"
                        stroke="#242a39"
                        strokeWidth="3"
                      />
                      <circle
                        className="transition-all duration-1000"
                        cx="18"
                        cy="18"
                        fill="none"
                        id="timer-circle"
                        r="15"
                        stroke={secondsLeft <= 4 ? "#ffb4ab" : "#f3b72c"}
                        strokeDasharray="94.2"
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                        strokeWidth="3"
                      />
                    </svg>
                    <span
                      className={`absolute text-xs font-bold font-mono ${
                        secondsLeft <= 4 ? "text-[#ffb4ab]" : "text-[#ffd78d]"
                      }`}
                    >
                      {secondsLeft}s
                    </span>
                  </div>
                </div>

                {/* Interactive Tactical Dice Roller Block */}
                <div className="w-full mt-2 grid grid-cols-5 gap-2 items-center">
                  {/* 3D Holographic Dice Visual Trigger */}
                  <button
                    onClick={() => {
                      if (canRoll) void sendCommand({ kind: "roll" });
                    }}
                    disabled={!canRoll}
                    aria-label="Tactile dice roll"
                    className={`col-span-2 h-16 rounded-xl border flex items-center justify-center relative overflow-hidden group shadow-[0_4px_16px_rgba(0,0,0,0.5)] active:scale-95 transition-all ${
                      canRoll
                        ? "bg-[#242a39] border-[#f3b72c]/50 cursor-pointer hover:border-[#f3b72c]"
                        : "bg-[#151b29] border-[#242a39] opacity-75"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#f3b72c]/10 via-transparent to-transparent pointer-events-none" />
                    
                    {/* 3D Holographic Dice Face */}
                    <DiceFace
                      value={currentDice}
                      isRolling={command.isPending}
                    />
                    <div className="absolute bottom-1 right-2 text-[8px] text-[#f9bd32] font-mono tracking-widest uppercase">
                      VRF ROLLED
                    </div>
                  </button>

                  {/* Primary Action CTA Button */}
                  <button
                    onClick={() => {
                      if (canRoll) {
                        void sendCommand({ kind: "roll" });
                      } else if (currentDice !== null && isYourTurn) {
                        const movableIdx = myPieces.findIndex((p: any) => {
                          if (p.position === -1) return currentDice === 6;
                          return p.position + currentDice <= 56;
                        });
                        if (movableIdx !== -1) {
                          void sendCommand({
                            kind: "move",
                            pieceIndex: movableIdx,
                            dieValue: currentDice,
                          });
                        } else {
                          toast.info("Select your pawn on the board to move");
                        }
                      }
                    }}
                    disabled={!isYourTurn || command.isPending}
                    className={`col-span-3 h-16 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_20px_-2px_rgba(243,183,44,0.35)] ${
                      canRoll
                        ? "bg-[#f3b72c] text-[#412d00] hover:bg-[#ffdea4] animate-pulse"
                        : currentDice !== null && isYourTurn
                        ? "bg-[#68f5b8] text-[#003824] hover:bg-[#46d89d]"
                        : "bg-[#191f2e] text-[#d4c5ad] border border-[#242a39] opacity-70"
                    }`}
                  >
                    {command.isPending ? (
                      <>
                        <RotateCw size={20} className="animate-spin" />
                        <span>RESOLVING VRF…</span>
                      </>
                    ) : canRoll ? (
                      <>
                        <Dices size={22} />
                        <span>ROLL DICE</span>
                      </>
                    ) : currentDice !== null && isYourTurn ? (
                      <>
                        <Sparkles size={20} />
                        <span>ADVANCE PAWN</span>
                      </>
                    ) : (
                      <>
                        <span>WAITING…</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick-Sport Reaction Bar */}
                <div className="w-full mt-2 flex items-center justify-between gap-1 px-2 py-1.5 rounded-xl bg-[#151b29] border border-[#242a39]">
                  <span className="text-[10px] text-[#d4c5ad] uppercase tracking-wider font-mono pl-1">
                    Taunt / Chat:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {["GG", "🔥", "⚡", "🎲"].map((em) => (
                      <button
                        key={em}
                        onClick={() => void sendQuickEmote(em)}
                        className="px-2.5 py-1 rounded-lg bg-[#191f2e] border border-[#242a39] hover:bg-[#242a39] active:scale-90 transition-transform text-xs font-mono text-[#dde2f6]"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Player HUD Footer Bar */}
          {isC4 ? (
            <footer className="mt-2 mx-4 mb-2 p-2.5 rounded-xl bg-[#151b29] border border-[#242a39] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#2f3544] flex items-center justify-center text-[#ffd78d] border border-white/5 shadow-inner">
                    <User size={22} />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#f3b72c] flex items-center justify-center shadow-[0_0_8px_#f3b72c]">
                    <Sparkles size={10} className="text-[#412d00] font-bold" />
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-[#ffd78d] leading-tight truncate">
                      You ({p1Name})
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#2f3544] text-[10px] text-[#ffd78d] font-mono">
                      Gold Legion
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#d4c5ad]">
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#ffd78d]">
                      <span className="w-2 h-2 rounded-full bg-[#f3b72c] shadow-[0_0_6px_#f3b72c]" />
                      {c4MyDiscsLeft} Discs in Mag
                    </span>
                    <span className="text-[#4f4534]">•</span>
                    <span className="text-[11px] font-mono text-[#68f5b8]">Ready</span>
                  </div>
                </div>
              </div>

              {/* Escrow Protection Badge */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2f3544]">
                  <Lock size={12} className="text-[#68f5b8]" />
                  <span className="text-[11px] text-[#dde2f6] font-semibold font-mono">
                    {gameplayStakeNim} NIM Escrow
                  </span>
                </div>
                <span className="text-[10px] text-[#d4c5ad] font-mono mt-0.5">
                  Protected Vault
                </span>
              </div>
            </footer>
          ) : (
            <footer className="mt-2 mx-4 mb-2 px-3.5 py-2 rounded-xl bg-[#191f2e] border border-[#242a39] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[#2f3544] flex items-center justify-center text-[#f3b72c] border border-white/5">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#68f5b8] absolute -top-0.5 -right-0.5 shadow-[0_0_6px_#68f5b8]" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#ffd78d]">
                      You
                    </span>
                    <span className="text-[10px] text-[#d4c5ad] font-mono">
                      ({p1Name})
                    </span>
                  </div>
                  <span className="text-[10px] text-[#4edea3] font-mono">
                    {playerInArenaCount}/4 Pawns in Arena
                  </span>
                </div>
              </div>

              {/* Stake Status Guard */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <Lock size={13} className="text-[#f3b72c]" />
                  <span className="text-xs text-[#dde2f6] font-bold font-mono">
                    {gameplayStakeNim} NIM
                  </span>
                </div>
                <span className="text-[10px] text-[#d4c5ad] font-mono">
                  Escrow Protected
                </span>
              </div>
            </footer>
          )}

        </main>

        {/* ========================================================================= */}
        {/* MODALS & OVERLAYS                                                         */}
        {/* ========================================================================= */}
        <EscrowDepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          matchId={matchId}
          stakeNim={gameplayStakeNim}
          onDepositSuccess={() => {
            void escrowQuery.refetch();
            void stateQuery.refetch();
          }}
        />

        {isFinished && (
          <VictoryPayoutBanner
            matchId={matchId}
            winnerUserId={
              escrow?.playerStatuses.find(
                (p) => p.seat === snapshot?.winner
              )?.userId ??
              (snapshot?.winner === yourSeat ? authQuery.data?.id ?? 0 : 0)
            }
            yourUserId={authQuery.data?.id ?? 0}
            totalPotNim={escrow?.totalPotNim || 0}
            isReplaying={isReplaying}
            onPlayAgain={async () => {
              if (isReplaying) return;
              setIsReplaying(true);
              const gameSlug = isC4 ? "connect-four" : "ludo-league";
              try {
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
                toast.error("Failed to start replay");
              }
            }}
            onReturnToLobby={() => {
              window.location.href = returnRoute;
            }}
          />
        )}

        <ProvablyFairModal
          isOpen={showProvablyFair}
          onClose={() => setShowProvablyFair(false)}
          matchId={matchId}
          stateVersion={state?.stateVersion ?? 0}
          dice={(snapshot as any)?.diceValues ?? (snapshot as any)?.dice ?? null}
        />

        {/* MOBILE BOTTOM NAVIGATION */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
