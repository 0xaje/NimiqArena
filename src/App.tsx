import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Crown,
  Dice5,
  Flame,
  Gamepad2,
  Home,
  Menu,
  Share2,
  Shield,
  Trophy,
  UserRound,
  Zap,
} from 'lucide-react';
import { devLeaderboard, devProfile } from './data/devData';
import type { MatchMode, Screen } from './types/domain';
import './styles.css';

type Tone = 'violet' | 'orange' | 'green';

const modes: { id: MatchMode; title: string; copy: string; tag: string; icon: string }[] = [
  { id: 'solo', title: 'Solo', copy: 'Practice against the Arena bot.', tag: 'FREE', icon: '◉' },
  { id: 'challenge', title: 'Challenge friend', copy: 'Create a private match and invite someone.', tag: 'PRIVATE', icon: '↗' },
  { id: 'quick', title: 'Quick match', copy: 'Find another player when you are ready.', tag: 'CASUAL', icon: '⚡' },
  { id: 'ranked', title: 'Ranked', copy: 'Compete for rating on the season ladder.', tag: 'RATING', icon: '◆' },
];

function Avatar({ label = devProfile.handle, large = false }: { label?: string; large?: boolean }) {
  const initials = label.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'NA';
  return <div className={`avatar ${large ? 'avatar-large' : ''}`} aria-label={`${label} avatar`}><span>{initials}</span></div>;
}

function Badge({ children, tone = 'violet' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function PreviewNotice({ children = 'Development preview only. No live users, ratings, matchmaking, wallet, or blockchain results are connected.' }: { children?: React.ReactNode }) {
  return <div className="notice"><Shield size={16} /><span>{children}</span></div>;
}

function App() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [mode, setMode] = useState<MatchMode>('challenge');
  const [copied, setCopied] = useState(false);
  const [turn, setTurn] = useState<'you' | 'opponent'>('you');
  const [dice, setDice] = useState(5);
  const challengeCode = 'A7K9X';

  useEffect(() => {
    const timer = window.setTimeout(() => setScreen('home'), 1250);
    return () => window.clearTimeout(timer);
  }, []);

  const go = (next: Screen) => setScreen(next);
  const selectedMode = useMemo(() => modes.find((item) => item.id === mode) ?? modes[1], [mode]);

  const copyCode = async () => {
    try {
      await navigator.clipboard?.writeText(challengeCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const rollDice = () => {
    setDice((value) => (value % 6) + 1);
    setTurn('opponent');
    window.setTimeout(() => setTurn('you'), 900);
  };

  if (screen === 'splash') return <Splash />;

  return <div className="app-shell">
    <header className="topbar">
      {screen !== 'home' ? <button className="icon-button" onClick={() => go('home')} aria-label="Back to home"><ArrowLeft size={18} /></button> : <div className="brand-mark">N</div>}
      <div className="wordmark">NIMIQ <span>ARENA</span></div>
      <button className="icon-button" onClick={() => go('profile')} aria-label="Open profile"><Avatar /></button>
    </header>

    <main className="content" key={screen}>
      {screen === 'home' && <HomeView go={go} />}
      {screen === 'games' && <GamesView go={go} />}
      {screen === 'match' && <MatchView go={go} mode={mode} setMode={setMode} selectedMode={selectedMode} />}
      {screen === 'challenge' && <ChallengeView go={go} code={challengeCode} copied={copied} copyCode={copyCode} />}
      {screen === 'ludo' && <LudoView go={go} turn={turn} dice={dice} rollDice={rollDice} />}
      {screen === 'result' && <ResultView go={go} />}
      {screen === 'leaderboard' && <LeaderboardView go={go} />}
      {screen === 'profile' && <ProfileView go={go} />}
    </main>

    {screen !== 'ludo' && <nav className="bottom-nav" aria-label="Primary navigation">
      <NavButton active={screen === 'home'} icon={<Home size={18} />} label="Arena" onClick={() => go('home')} />
      <NavButton active={screen === 'games' || screen === 'match'} icon={<Gamepad2 size={18} />} label="Games" onClick={() => go('games')} />
      <NavButton active={screen === 'leaderboard'} icon={<Trophy size={18} />} label="Ranks" onClick={() => go('leaderboard')} />
      <NavButton active={screen === 'profile'} icon={<UserRound size={18} />} label="Profile" onClick={() => go('profile')} />
    </nav>}
  </div>;
}

function Splash() {
  return <div className="splash"><div className="splash-orbit orbit-one" /><div className="splash-orbit orbit-two" /><div className="splash-mark">N</div><p className="splash-name">NIMIQ <span>ARENA</span></p><p className="splash-tagline">PLAY. CHALLENGE. COMPETE.</p><span className="splash-loader" /></div>;
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function HomeView({ go }: { go: (s: Screen) => void }) {
  return <>
    <section className="hero-row"><div><p className="eyebrow">SEASON 01 · DEVELOPMENT PREVIEW</p><h1>Welcome to<br /><em>the Arena.</em></h1><p className="muted">Play sharp. Climb higher. Leave your mark.</p></div><Avatar large /></section>
    <section className="profile-strip"><div><span className="label">CURRENT RANK</span><strong>{devProfile.rank}</strong></div><div><span className="label">RATING</span><strong>{devProfile.rating.toLocaleString()}</strong></div><div><span className="label">STREAK</span><strong className="orange"><Flame size={15} /> {devProfile.streak}</strong></div></section>
    <div className="action-grid"><button className="primary-action" onClick={() => go('games')}><Zap size={18} /> QUICK MATCH <ChevronRight size={18} /></button><button className="secondary-action" onClick={() => go('challenge')}><Share2 size={17} /> CHALLENGE FRIEND</button></div>
    <section className="section-heading"><div><p className="eyebrow">FEATURED GAME</p><h2>Ludo</h2></div><button className="text-button" onClick={() => go('games')}>View all <ChevronRight size={15} /></button></section>
    <button className="feature-card" onClick={() => go('match')}><div className="board-mini">{Array.from({ length: 16 }).map((_, i) => <span key={i} className={i % 5 === 0 ? 'hot' : ''} />)}</div><div className="feature-copy"><Badge tone="green">AVAILABLE</Badge><h3>The classic.<br /><em>Reimagined.</em></h3><p>Strategy, luck, and one more turn.</p></div><ChevronRight className="feature-arrow" /></button>
    <section className="section-heading"><div><p className="eyebrow">SEASON 01</p><h2>Leaderboard</h2></div><button className="text-button" onClick={() => go('leaderboard')}>Full board <ChevronRight size={15} /></button></section>
    <div className="leader-preview">{devLeaderboard.slice(0, 3).map((entry) => <LeaderLine entry={entry} key={entry.rank} />)}</div>
  </>;
}

function GamesView({ go }: { go: (s: Screen) => void }) {
  return <><section className="page-heading"><p className="eyebrow">THE ARENA</p><h1>Choose your<br /><em>game.</em></h1><p className="muted">Every match is a chance to make a name.</p></section><button className="game-hero" onClick={() => go('match')}><div className="ludo-orb"><Dice5 size={42} /></div><div><Badge tone="green">AVAILABLE NOW</Badge><h2>Ludo</h2><p>The classic. Reimagined.</p><span className="play-link">Enter the Arena <ChevronRight size={16} /></span></div></button><div className="coming-card"><div className="coming-icon"><Menu size={20} /></div><div><p className="eyebrow">THE COLLECTION</p><h3>More games coming soon</h3><p className="muted">New ways to play are in the works.</p></div></div></>;
}

function MatchView({ go, mode, setMode, selectedMode }: { go: (s: Screen) => void; mode: MatchMode; setMode: (m: MatchMode) => void; selectedMode: { title: string } }) {
  return <><section className="page-heading compact"><p className="eyebrow">LUDO · MATCH TYPE</p><h1>How do you<br /><em>want to play?</em></h1></section><div className="mode-list">{modes.map((item) => <button key={item.id} className={`mode-card ${mode === item.id ? 'selected' : ''}`} onClick={() => setMode(item.id)}><span className="mode-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.copy}</small></span><Badge>{item.tag}</Badge><ChevronRight size={18} /></button>)}</div><PreviewNotice /><button className="primary-action full" onClick={() => go(mode === 'challenge' ? 'challenge' : 'ludo')}>CONTINUE WITH {selectedMode.title.toUpperCase()} <ChevronRight size={18} /></button></>;
}

function ChallengeView({ go, code, copied, copyCode }: { go: (s: Screen) => void; code: string; copied: boolean; copyCode: () => void }) {
  return <><section className="page-heading compact"><p className="eyebrow">LUDO · PRIVATE MATCH</p><h1>Bring your<br /><em>best move.</em></h1><p className="muted">Create a room and share the code with your opponent.</p></section><div className="challenge-panel"><span className="status-dot">WAITING FOR OPPONENT</span><p className="label">CHALLENGE CODE</p><div className="challenge-code">{code}</div><p className="muted center">Share this code with your opponent.</p><div className="challenge-actions"><button className="secondary-action" onClick={copyCode}><Copy size={16} /> {copied ? 'COPIED' : 'COPY CODE'}</button><button className="secondary-action" onClick={() => navigator.share?.({ title: 'Nimiq Arena challenge', text: `Join my Ludo match with code ${code}` })}><Share2 size={16} /> SHARE</button></div></div><PreviewNotice>Private rooms are a frontend preview. No real room or opponent is connected yet.</PreviewNotice><button className="ghost-button" onClick={() => go('match')}>CANCEL MATCH</button></>;
}

function LudoView({ go, turn, dice, rollDice }: { go: (s: Screen) => void; turn: 'you' | 'opponent'; dice: number; rollDice: () => void }) {
  const cells = Array.from({ length: 49 });
  return <div className="ludo-screen"><div className="ludo-top"><div><span className="eyebrow">LUDO · SOLO PREVIEW</span><h2>Make your move.</h2></div><button className="icon-button" onClick={() => go('home')} aria-label="Exit match"><Menu size={18} /></button></div><div className="match-players"><div className="match-player active"><Avatar label="0xAje" /><span><strong>0xAje</strong><small>YOUR TURN</small></span></div><div className="turn-timer">00:18</div><div className="match-player right"><span><strong>BOT · ORBIT</strong><small>RATING 1768</small></span><Avatar label="Orbit" /></div></div><div className="ludo-board">{cells.map((_, i) => <div key={i} className={`board-cell cell-${i} ${i % 7 === 0 ? 'path-hot' : ''}`}>{[8, 14, 34, 40].includes(i) && <span className={`piece piece-${i}`} />}</div>)}<div className="home-zone zone-red" /><div className="home-zone zone-blue" /><div className="home-zone zone-yellow" /><div className="home-zone zone-green" /></div><div className="dice-row"><div><span className="label">TURN</span><strong>{turn === 'you' ? 'Your move' : 'Orbit is thinking'}</strong></div><button className="dice" onClick={rollDice} aria-label="Roll dice"><span>{dice}</span><small>ROLL</small></button></div><PreviewNotice>Solo gameplay is a presentation preview. The authoritative Ludo engine is not implemented.</PreviewNotice><button className="ghost-button" onClick={() => go('result')}>END PREVIEW MATCH</button></div>;
}

function ResultView({ go }: { go: (s: Screen) => void }) {
  return <><div className="result-hero"><div className="trophy-ring"><Crown size={32} /></div><p className="eyebrow">MATCH COMPLETE · DEVELOPMENT PREVIEW</p><h1><em>Victory.</em></h1><p className="muted">You outplayed Orbit in 08:42.</p></div><div className="result-stats"><div><span className="label">XP</span><strong>+38</strong></div><div><span className="label">RATING</span><strong>+29</strong></div><div><span className="label">STREAK</span><strong className="orange"><Flame size={14} /> 8</strong></div></div><PreviewNotice>Results shown here are presentation-only. No rating, XP, NIM, or blockchain transaction has been recorded.</PreviewNotice><button className="primary-action full" onClick={() => go('games')}>PLAY AGAIN <ChevronRight size={18} /></button><button className="secondary-action full" onClick={() => go('leaderboard')}>VIEW LEADERBOARD</button></>;
}

function LeaderLine({ entry }: { entry: (typeof devLeaderboard)[number] }) {
  return <div className={`leader-line ${entry.isCurrentUser ? 'current' : ''}`}><span className="leader-rank">{String(entry.rank).padStart(2, '0')}</span><Avatar label={entry.handle} /><span className="leader-name">{entry.handle}{entry.isCurrentUser && <Badge>YOU</Badge>}</span><strong>{entry.rating.toLocaleString()}</strong></div>;
}

function LeaderboardView({ go }: { go: (s: Screen) => void }) {
  return <><section className="page-heading compact"><p className="eyebrow">SEASON 01 · RANKED</p><h1>The <em>ladder.</em></h1><p className="muted">Climb it one match at a time.</p></section><div className="podium">{devLeaderboard.slice(0, 3).map((entry) => <div className={`podium-player p${entry.rank}`} key={entry.rank}><div className="podium-avatar"><Avatar label={entry.handle} /></div><span className="podium-rank">{String(entry.rank).padStart(2, '0')}</span><strong>{entry.handle}</strong><small>{entry.rating.toLocaleString()} rating</small></div>)}</div><div className="leader-table">{devLeaderboard.map((entry) => <LeaderLine entry={entry} key={entry.rank} />)}</div><PreviewNotice>Leaderboard rows are isolated development data and are not live rankings.</PreviewNotice><button className="ghost-button" onClick={() => go('profile')}>VIEW YOUR PROFILE</button></>;
}

function ProfileView({ go }: { go: (s: Screen) => void }) {
  return <><section className="profile-hero"><Avatar large label={devProfile.handle} /><p className="eyebrow">ARENA PROFILE · DEVELOPMENT PREVIEW</p><h1>{devProfile.handle}</h1><Badge>{devProfile.rank}</Badge></section><div className="profile-rating"><span className="label">CURRENT RATING</span><strong>{devProfile.rating.toLocaleString()}</strong><span className="orange"><Flame size={15} /> {devProfile.streak} win streak</span></div><div className="stats-grid"><div><strong>{devProfile.games}</strong><span>Games</span></div><div><strong>{devProfile.wins}</strong><span>Wins</span></div><div><strong>{((devProfile.wins / devProfile.games) * 100).toFixed(1)}%</strong><span>Win rate</span></div></div><section className="section-heading"><div><p className="eyebrow">PROGRESS</p><h2>Achievements</h2></div></section><div className="achievement-list"><div><span>✦</span><strong>First Victory</strong><small>Win your first Arena match</small></div><div><span>◒</span><strong>Hot Streak</strong><small>Reach a 5 match streak</small></div><div><span>◆</span><strong>Diamond</strong><small>Reach Diamond rank</small></div></div><PreviewNotice>Profile data is local development state. Production identity, ratings, and achievements are not connected.</PreviewNotice><button className="ghost-button" onClick={() => go('leaderboard')}>VIEW LEADERBOARD</button></>;
}

export default App;
