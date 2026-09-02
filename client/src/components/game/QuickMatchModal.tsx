import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bot, Radar, ShieldCheck, Swords, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { soundEngine } from "@/lib/audio";

interface QuickMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameSlug?: string;
}

export const QuickMatchModal: React.FC<QuickMatchModalProps> = ({
  isOpen,
  onClose,
  gameSlug = "ludo-league",
}) => {
  const [, setLocation] = useLocation();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isMatched, setIsMatched] = useState<boolean>(false);
  const [opponentName, setOpponentName] = useState<string | null>(null);

  const statsQuery = trpc.auth.stats.useQuery(
    { gameSlug },
    { enabled: isOpen, retry: false }
  );
  const findMatch = trpc.match.findOrCreateQuickMatch.useMutation();
  const cancelMatch = trpc.match.cancelWaitingMatch.useMutation();
  const createSolo = trpc.match.createSoloMatch.useMutation();

  const queueStatusQuery = trpc.match.queueStatus.useQuery(
    { matchId: matchId ?? "" },
    {
      enabled: Boolean(matchId) && !isMatched && isOpen,
      refetchInterval: 1_500,
    }
  );

  // Instant fallback to Arena AI Bot so users are never stuck waiting
  const handlePlayAiNow = async () => {
    if (isMatched) return;
    try {
      setIsMatched(true);
      setOpponentName("Nimiq Arena AI Bot");
      soundEngine.playBonusTurn();
      toast.success("AI Challenger Matched!", {
        description: "Launching arena table…",
      });

      if (matchId) {
        try {
          await cancelMatch.mutateAsync({ matchId });
        } catch {
          // Ignore cancellation error
        }
      }

      const solo = await createSolo.mutateAsync({ gameSlug });
      setTimeout(() => {
        setLocation(`/matches/${solo.id}`);
      }, 1000);
    } catch (err) {
      setIsMatched(false);
      toast.error("Could not start AI match", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  // Timer counter
  useEffect(() => {
    if (!isOpen || isMatched) return;
    const timer = setInterval(() => {
      setElapsedSec(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isMatched]);

  // Auto-pair with AI bot after 7 seconds if no live human joins
  useEffect(() => {
    if (!isOpen || isMatched || createSolo.isPending) return;
    if (elapsedSec >= 7) {
      void handlePlayAiNow();
    }
  }, [elapsedSec, isOpen, isMatched]);

  // Initiate queue on open
  useEffect(() => {
    if (!isOpen) {
      setMatchId(null);
      setElapsedSec(0);
      setIsMatched(false);
      setOpponentName(null);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const res = await findMatch.mutateAsync({ gameSlug });
        if (!active) return;
        setMatchId(res.matchId);

        if (res.status === "in_progress") {
          setIsMatched(true);
          soundEngine.playBonusTurn();
          toast.success("Match Found!", {
            description: "Connecting to live match table…",
          });
          setTimeout(() => {
            setLocation(`/matches/${res.matchId}`);
          }, 1200);
        }
      } catch (err) {
        if (!active) return;
        toast.error("Matchmaking error", {
          description:
            err instanceof Error ? err.message : "Please try again.",
        });
        onClose();
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen, gameSlug]);

  // Check queue status polling
  useEffect(() => {
    if (!queueStatusQuery.data || isMatched || !matchId) return;

    if (queueStatusQuery.data.status === "in_progress") {
      setIsMatched(true);
      if (queueStatusQuery.data.opponent?.name) {
        setOpponentName(queueStatusQuery.data.opponent.name);
      }
      soundEngine.playBonusTurn();
      toast.success("Opponent Found!", {
        description: "Launching game table…",
      });
      setTimeout(() => {
        setLocation(`/matches/${matchId}`);
      }, 1200);
    }
  }, [queueStatusQuery.data, isMatched, matchId, setLocation]);

  const handleCancel = async () => {
    if (matchId && !isMatched) {
      try {
        await cancelMatch.mutateAsync({ matchId });
      } catch {
        // Ignore cancellation error if match already started
      }
    }
    toast.info("Match search cancelled");
    onClose();
  };

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${mins}:${s}`;
  };

  const rating = statsQuery.data?.rating ?? 1000;

  return (
    <div className="quickmatch-modal-overlay">
      <div className="quickmatch-modal-card">
        <header className="quickmatch-modal-header">
          <div className="quickmatch-header-left">
            <Radar size={16} className="radar-header-icon" />
            <span className="card-label">PUBLIC MATCHMAKING / QUICK MATCH</span>
          </div>
          <button
            type="button"
            className="quickmatch-close-btn"
            onClick={handleCancel}
            title="Cancel & Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="quickmatch-modal-body">
          {isMatched ? (
            <div className="quickmatch-found-state">
              <div className="match-found-icon-burst">
                <Swords size={36} className="match-found-swords" />
              </div>
              <h2>⚔️ Opponent Found!</h2>
              <p>
                {opponentName
                  ? `Matched with ${opponentName}. Preparing table…`
                  : "Match ready! Loading arena board…"}
              </p>
            </div>
          ) : (
            <div className="quickmatch-searching-state">
              {/* Radar Sonar Graphic */}
              <div className="radar-sonar-container">
                <div className="radar-circle radar-c1" />
                <div className="radar-circle radar-c2" />
                <div className="radar-circle radar-c3" />
                <div className="radar-sweep-beam" />
                <div className="radar-center-blip" />
              </div>

              <div className="quickmatch-search-info">
                <span className="search-timer-display">
                  {formatTimer(elapsedSec)}
                </span>
                <h2>Searching for Opponent…</h2>
                <p>
                  Scanning live queue near your Elo (<strong>{rating} ELO</strong>).
                </p>
              </div>

              {/* Fast fallback button so users never wait indefinitely */}
              <div className="quickmatch-ai-fallback-zone">
                <button
                  type="button"
                  className="quickmatch-ai-btn"
                  onClick={handlePlayAiNow}
                  disabled={createSolo.isPending}
                >
                  <Bot size={18} /> Play vs Arena AI Bot Now
                </button>
                <span className="quickmatch-ai-timer-note">
                  {elapsedSec < 7
                    ? `Auto-matching with Arena AI in ${Math.max(0, 7 - elapsedSec)}s if no human joins…`
                    : "Pairing with Arena AI Challenger…"}
                </span>
              </div>

              <div className="quickmatch-rating-badge">
                <ShieldCheck size={14} className="rating-badge-icon" />
                <span>Season 1 / FIDE Elo ($K=32$) / Ranked Public Match</span>
              </div>
            </div>
          )}
        </div>

        <footer className="quickmatch-modal-footer">
          <button
            type="button"
            className="quickmatch-cancel-btn"
            onClick={handleCancel}
            disabled={isMatched}
          >
            {isMatched ? "Connecting…" : "Cancel Search"}
          </button>
        </footer>
      </div>
    </div>
  );
};
