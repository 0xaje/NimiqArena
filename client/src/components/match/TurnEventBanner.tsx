interface TurnEventBannerProps {
  isFinished: boolean;
  isYourTurn: boolean;
  isBotTurn: boolean;
  yourSeat: number;
  winner: number | "draw" | null | undefined;
  opponentName: string;
  gameKind?: "ludo" | "connect4";
  dice?: number | null;
  remainingDice?: number[] | null;
  botActionMessage?: string | null;
}

export function TurnEventBanner({
  isFinished,
  isYourTurn,
  isBotTurn,
  yourSeat,
  winner,
  opponentName,
  gameKind = "ludo",
  dice = null,
  remainingDice = null,
  botActionMessage = null,
}: TurnEventBannerProps) {
  const isC4 = gameKind === "connect4";

  return (
    <div
      className={`turn-event-banner ${
        isYourTurn
          ? dice === 6
            ? "bonus-turn"
            : "your-turn"
          : "opponent-turn"
      }`}
    >
      {isFinished ? (
        <span>
          {winner === "draw"
            ? "🤝 MATCH ENDED IN A DRAW"
            : winner === yourSeat
              ? "🎉 CONGRATULATIONS! YOU WON THE MATCH!"
              : `MATCH OVER — ${opponentName.toUpperCase()} WON`}
        </span>
      ) : botActionMessage ? (
        <span>{botActionMessage}</span>
      ) : isYourTurn ? (
        isC4 ? (
          <span>🎯 YOUR TURN — CLICK ANY COLUMN TO DROP YOUR DISC</span>
        ) : remainingDice && remainingDice.length === 2 && remainingDice[0] === 6 && remainingDice[1] === 6 ? (
          <span>🌟 DOUBLE 6! Deploy 2 pawns from base or move! (Bonus roll awaits)</span>
        ) : remainingDice && remainingDice.length === 1 ? (
          <span>👉 1 MOVE REMAINING ([{remainingDice[0]}]) — Select next piece to move</span>
        ) : dice !== null ? (
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
  );
}
