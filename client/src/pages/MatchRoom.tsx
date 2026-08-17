import { ArrowLeft, Copy, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function MatchRoom() {
  const [, params] = useRoute("/matches/:id");
  const matchQuery = trpc.match.getById.useQuery({ id: params?.id ?? "" }, { enabled: Boolean(params?.id) });
  const match = matchQuery.data;

  async function copyCode() {
    if (!match) return;
    await navigator.clipboard?.writeText(match.joinCode);
    toast("Invite code copied");
  }

  return (
    <div className="detail-page match-room-page"><header className="detail-header"><Link href="/games/ludo-league" className="back-link"><ArrowLeft size={15} /> Ludo detail</Link><span className="detail-brand">NIMIQ ARENA / MATCH ROOM</span><span className="detail-state">{matchQuery.isLoading ? "LOADING" : matchQuery.isError ? "UNAVAILABLE" : "WAITING"}</span></header><main className="detail-main"><section className="room-hero"><span className="stamp orange">CHALLENGE FRIEND</span><p className="eyebrow">REAL MATCH / WAITING ROOM</p><h1>Table is set.<br /><em>Invite a friend.</em></h1><p className="detail-lede">This room exists in the backend. No opponent, move, result, rating, or settlement is shown until a second real player joins and the authoritative game loop is connected.</p></section><section className="room-code-card"><div><span className="card-label">MATCH ID</span><strong>{match?.id ?? "Loading…"}</strong></div><div><span className="card-label">INVITE CODE</span><strong className="room-code">{match?.joinCode ?? "—"}</strong></div><button className="copy-code" onClick={copyCode} disabled={!match}><Copy size={15} /> Copy invite code</button></section><section className="room-grid"><article className="room-panel"><div className="room-panel-icon"><Users size={18} /></div><span className="card-label">PLAYER 01</span><h2>Host connected</h2><p>You created this room. The server has persisted the initial Ludo snapshot.</p><span className="state-chip good">READY</span></article><article className="room-panel"><div className="room-panel-icon muted-icon"><LockKeyhole size={18} /></div><span className="card-label">PLAYER 02</span><h2>Waiting for friend</h2><p>Joining by invite code is not implemented yet. No opponent is simulated.</p><span className="state-chip muted">NOT CONNECTED</span></article><article className="room-panel room-panel-dark"><div className="room-panel-icon"><ShieldCheck size={18} /></div><span className="card-label">NEXT STEP</span><h2>Gameplay is locked.</h2><p>The engine exists and is tested, but the server command API and reconnect flow are not wired yet.</p><button className="text-action" onClick={() => toast("Game commands are not implemented", { description: "The room remains a truthful waiting state." })}>View engine status <ArrowLeft size={14} /></button></article></section></main><footer className="detail-footer"><span>Real match status: {match?.status ?? "unavailable"}</span><Link href="/">Return to Arena</Link></footer></div>
  );
}
