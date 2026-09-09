import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  initializeNimiqMiniApp,
  getNimiqProvider,
  getHostLanguage,
  runNimiqThreeRequests,
} from "@/lib/nimiq-miniapp";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Coins,
  Gamepad2,
  Gift,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  User,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";
import { LudoEntryFlowModal } from "@/components/game/LudoEntryFlowModal";
import { MiniAppDevModal } from "@/components/game/MiniAppDevModal";
import { WalletConnectModal } from "@/components/game/WalletConnectModal";
import { NimiqArenaLogo } from "@/components/brand/NimiqArenaLogo";
import { IdentityRegistrationModal } from "@/components/profile/IdentityRegistrationModal";
import {
  restoreSavedWallet,
  getWalletConnectionMode,
  getLiveTestnetStatus,
  isRunningInNimiqPay,
  sendNimiqPayment,
  fetchNimiqBalance,
  type WalletConnectionMode,
} from "@/lib/nimiq-wallet";

type ProviderState = "checking" | "ready" | "browser" | "error";

type GameCard = {
  title: string;
  genre: string;
  status: "FEATURED" | "COMING SOON" | "CONCEPT" | "UNAVAILABLE";
  image: string;
  accent: string;
  description: string;
};

function formatAddress(address: string) {
  return address.length > 14
    ? `${address.slice(0, 7)}…${address.slice(-5)}`
    : address;
}

function providerError(value: unknown) {
  if (typeof value !== "object" || value === null || !("error" in value))
    return null;
  const error = (value as { error?: { message?: unknown } }).error;
  return error && typeof error.message === "string"
    ? error.message
    : "Provider request failed.";
}

const LUDO_SLUG_INPUT = { slug: "ludo-league" } as const;
const CONNECT4_SLUG_INPUT = { slug: "connect-four" } as const;

export default function Home() {
  const utils = trpc.useUtils();
  const authQuery = trpc.auth.me.useQuery();
  const guestLogin = trpc.auth.guestLogin.useMutation();
  const user = authQuery.data;
  const ludoQuery = trpc.game.getBySlug.useQuery(LUDO_SLUG_INPUT);
  const connect4Query = trpc.game.getBySlug.useQuery(CONNECT4_SLUG_INPUT);
  const gameCards: GameCard[] = [
    {
      title: ludoQuery.data?.name ?? "Ludo League",
      genre: "STRATEGY / SOCIAL",
      status: ludoQuery.data ? "FEATURED" : "UNAVAILABLE",
      image:
        "https://images.unsplash.com/photo-1605870445919-838d190e8e1b?auto=format&fit=crop&w=900&q=85",
      accent: "orange",
      description:
        ludoQuery.data?.description ??
        "The real Ludo game record is unavailable right now.",
    },
    {
      title: connect4Query.data?.name ?? "Connect NIM",
      genre: "TACTICAL / STRATEGY",
      status: connect4Query.data ? "FEATURED" : "UNAVAILABLE",
      image:
        "https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&w=900&q=85",
      accent: "blue",
      description:
        connect4Query.data?.description ??
        "Vertical 7x6 tactical strategy game. Drop discs to connect 4 in a row horizontally, vertically, or diagonally.",
    },
  ];
  const [providerState, setProviderState] = useState<ProviderState>(() =>
    isRunningInNimiqPay() ? "checking" : "browser"
  );
  const [consensus, setConsensus] = useState<boolean | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [connectionMode, setConnectionMode] = useState<WalletConnectionMode>(() =>
    getWalletConnectionMode()
  );
  const [address, setAddress] = useState<string | null>(() =>
    restoreSavedWallet()
  );
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!address) {
      setWalletBalance(null);
      return;
    }
    fetchNimiqBalance(address)
      .then(bal => setWalletBalance(bal))
      .catch(() => {});
  }, [address]);

  const [language, setLanguage] = useState(() =>
    getHostLanguage() || (typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : "en") || "en"
  );
  const [providerMessage, setProviderMessage] = useState(() => {
    if (isRunningInNimiqPay()) return "Checking Nimiq wallet provider…";
    const saved = restoreSavedWallet();
    return saved
      ? "Connected via Official Nimiq Hub / Web Wallet."
      : "Web Browser: Connect via Official Nimiq Hub.";
  });
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isGameLibraryOpen, setIsGameLibraryOpen] = useState(false);
  const [isLudoFlowOpen, setIsLudoFlowOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const createSolo = trpc.match.createSoloMatch.useMutation();
  const loginWithNimiq = trpc.auth.loginWithNimiq.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();

  // Auto-sync wallet session on mount if wallet is connected but current session is guest
  useEffect(() => {
    if (address && user && user.loginMethod === "guest") {
      utils.client.auth.requestChallenge.query().then(challengeRes => {
        return loginWithNimiq.mutateAsync({
          address,
          challenge: challengeRes.challenge,
        });
      }).then(loginRes => {
        if (loginRes?.token) {
          sessionStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
          localStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
        }
        if (loginRes?.user?.name && !loginRes.user.name.startsWith("Nimiq (") && !loginRes.user.name.startsWith("NQ")) {
          try {
            localStorage.setItem(`onboarding_completed_${address}`, "true");
          } catch {}
        }
        void utils.auth.me.invalidate();
      }).catch(err => {
        console.warn("[Auth] Auto-sync wallet session:", err);
      });
    }
  }, [address, user?.id, user?.loginMethod]);

  // Auto-onboarding for newly connected wallets: prompt identity registration ONLY if no custom nickname set
  useEffect(() => {
    if (!address || !user) return;

    // Check if dismissed or already completed
    try {
      const isDismissed = sessionStorage.getItem("dismissed_identity_modal") === "true";
      const isCompleted = localStorage.getItem(`onboarding_completed_${address}`) === "true";
      if (isDismissed || isCompleted) return;
    } catch {}

    const name = user.name?.trim() || "";
    // Check if user already has a custom name
    const isGenericName =
      !name ||
      name.startsWith("Player 1") ||
      name.startsWith("Player 2") ||
      name.startsWith("guest-") ||
      name.startsWith("0x") ||
      name.startsWith("NQ") ||
      name.startsWith("Nimiq (");

    if (isGenericName && !isIdentityModalOpen) {
      setIsIdentityModalOpen(true);
    } else if (!isGenericName) {
      // User already has a custom name registered. Mark complete so we never bother them again.
      try {
        localStorage.setItem(`onboarding_completed_${address}`, "true");
      } catch {}
    }
  }, [address, user, isIdentityModalOpen]);

  async function handleStartSoloPractice() {
    try {
      if (!user) {
        toast.info("Signing in as Player 1…");
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
      toast.info("Launching Practice Table vs Arena Bot…");
      const match = await createSolo.mutateAsync({ gameSlug: "ludo-league" });
      window.location.href = `/matches/${match.id}`;
    } catch (err) {
      toast.error("Failed to launch solo practice", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  }

  async function switchPlayer(name: string) {
    try {
      const res = await guestLogin.mutateAsync({ name, newIdentity: true });
      if (res.token) {
        sessionStorage.setItem("manus-cookie", `manus-session=${res.token}`);
      }
      await utils.auth.me.invalidate();
      toast.success(`Signed in as ${name}`);
    } catch (e) {
      toast.error("Failed to switch player");
    }
  }

  useEffect(() => {
    // 1. Query live on-chain Testnet status from public RPC
    getLiveTestnetStatus().then(status => {
      setConsensus(status.consensus);
      setBlockNumber(status.blockNumber);
    });

    // 2. Connect to Nimiq Pay if running inside Mini App
    if (isRunningInNimiqPay()) {
      initializeNimiqMiniApp()
        .then(({ provider, isInsideNimiqPay: inApp, error }) => {
          if (inApp && provider) {
            setProviderState("ready");
            setProviderMessage("Connected to native Nimiq Pay mobile host.");
            runNimiqThreeRequests(provider)
              .then(res => {
                if (res.accounts.length > 0) {
                  setAddress(res.accounts[0]);
                  setConnectionMode("mini-app");
                }
              })
              .catch(() => {});
          } else {
            setProviderState("browser");
            setProviderMessage(error || "Nimiq Pay host not detected.");
          }
        })
        .catch(() => {
          setProviderState("browser");
        });
    }
  }, []);

  const providerLabel = useMemo(() => {
    if (address) {
      return connectionMode === "mini-app"
        ? "NIMIQ PAY"
        : connectionMode === "hub"
          ? "NIMIQ HUB"
          : "WALLET CONNECTED";
    }
    return isRunningInNimiqPay()
      ? "NIMIQ PAY"
      : "BROWSER (WEB WALLET)";
  }, [providerState, address, connectionMode]);

  async function connectWallet() {
    setIsWalletModalOpen(true);
  }

  function unavailable(feature: string) {
    toast(`${feature} is not implemented yet`, {
      description:
        "This control is visible for platform structure only; no simulated action was performed.",
    });
  }

  return (
    <div className="arena-app">
      <LudoEntryFlowModal
        isOpen={isLudoFlowOpen}
        onClose={() => setIsLudoFlowOpen(false)}
      />
      <MiniAppDevModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
      />
      <IdentityRegistrationModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        currentName={user?.name}
        currentAvatar={(user as any)?.avatar}
        walletAddress={address || (user as any)?.walletAddress}
      />
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        connectedAddress={address}
        connectionMode={connectionMode}
        onConnected={async (addr, mode) => {
          setAddress(addr);
          setConnectionMode(mode);
          fetchNimiqBalance(addr).then(bal => setWalletBalance(bal)).catch(() => {});
          try {
            const challengeRes = await utils.client.auth.requestChallenge.query();
            const loginRes = await loginWithNimiq.mutateAsync({
              address: addr,
              challenge: challengeRes.challenge,
            });
            if (loginRes?.token) {
              sessionStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
              localStorage.setItem("manus-cookie", `manus-session=${loginRes.token}`);
            }
            if (loginRes?.user?.name && !loginRes.user.name.startsWith("Nimiq (") && !loginRes.user.name.startsWith("NQ")) {
              try {
                localStorage.setItem(`onboarding_completed_${addr}`, "true");
              } catch {}
            }
            await utils.auth.me.invalidate();
            toast.success("Signed in with Nimiq Wallet", {
              description: `Session bound to ${addr.slice(0, 8)}...`,
            });
          } catch (e) {
            console.warn("[Auth] Failed to sync session with wallet:", e);
          }
        }}
        onDisconnected={async () => {
          setAddress(null);
          setConnectionMode("none");
          try {
            await logoutMutation.mutateAsync();
            void utils.auth.me.invalidate();
            toast.info("Wallet Disconnected", {
              description: "Returned to guest session.",
            });
          } catch (e) {
            console.warn("[Auth] Logout error:", e);
          }
        }}
      />
      <aside className={`arena-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="sidebar-topline">
          <div className="brand-lockup" aria-label="Nimiq Arena">
            <NimiqArenaLogo size={36} showText={true} />
          </div>
          <button
            className="icon-button mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileMenu(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-rule" />
        <p className="sidebar-kicker">THE GAME ROOM / 001</p>
        <nav className="side-nav" aria-label="Primary navigation">
          <a
            className="side-nav-link active"
            href="#featured"
            onClick={() => setMobileMenu(false)}
          >
            Discover <span>01</span>
          </a>
          <div className="side-nav-group">
            <button
              type="button"
              className={`side-nav-link ${isGameLibraryOpen ? "active" : ""}`}
              style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                color: isGameLibraryOpen ? "#ffffff" : "var(--silver)",
                fontFamily: "inherit",
              }}
              onClick={() => setIsGameLibraryOpen(!isGameLibraryOpen)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Game Library {isGameLibraryOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span>02</span>
            </button>
            {isGameLibraryOpen && (
              <div
                className="side-nav-sublinks"
                style={{
                  paddingLeft: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginTop: "2px",
                  marginBottom: "6px",
                }}
              >
                <Link
                  className="side-nav-sublink"
                  href="/games/ludo-league"
                  onClick={() => setMobileMenu(false)}
                  style={{
                    fontSize: "12px",
                    color: "rgba(255, 255, 255, 0.75)",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.03)",
                  }}
                >
                  Ludo League <span style={{ fontSize: "10px", color: "#EC9918", fontWeight: 700 }}>LIVE</span>
                </Link>
                <Link
                  className="side-nav-sublink"
                  href="/games/connect-four"
                  onClick={() => setMobileMenu(false)}
                  style={{
                    fontSize: "12px",
                    color: "rgba(255, 255, 255, 0.75)",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.03)",
                  }}
                >
                  Connect NIM <span style={{ fontSize: "10px", color: "#00f0ff", fontWeight: 700 }}>LIVE</span>
                </Link>
              </div>
            )}
          </div>
          <Link
            className="side-nav-link"
            href="/leaderboard"
            onClick={() => setMobileMenu(false)}
          >
            Leaderboard <span>03</span>
          </Link>
          <Link
            className="side-nav-link"
            href="/earn"
            onClick={() => setMobileMenu(false)}
          >
            Earn & Rewards <span>04</span>
          </Link>
          <Link
            className="side-nav-link"
            href="/profile"
            onClick={() => setMobileMenu(false)}
          >
            Player Profile <span>05</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-status">
            <span
              className={`status-dot ${providerState === "ready" ? "ready" : ""}`}
            />
            <div>
              <strong>{providerLabel}</strong>
              <span>
                {providerState === "ready"
                  ? "Nimiq Pay detected"
                  : "Awaiting host wallet"}
              </span>
            </div>
          </div>
          <button
            className="language-button"
            onClick={() =>
              toast(`Nimiq Pay language: ${language.toUpperCase()}`)
            }
          >
            <span>Language</span>
            <strong>{language.toUpperCase()}</strong>
          </button>
          <button
            className="language-button"
            onClick={() => setIsDevModalOpen(true)}
            style={{ marginTop: 8 }}
          >
            <span>Mini App SDK</span>
            <strong>INSPECT</strong>
          </button>
        </div>
      </aside>
      {mobileMenu && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenu(false)}
          aria-hidden="true"
        />
      )}

      <main className="arena-main">
        <header className="topbar">
          <button
            className="icon-button mobile-trigger"
            aria-label="Open navigation"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={20} />
          </button>
          <div className="topbar-brand">
            <span className="topbar-kicker">NIMIQ ARENA</span>
            <span className="topbar-title">
              A place to play, meet, and compete.
            </span>
          </div>
          <div className="top-actions">
            {user?.name && !user.name.startsWith("Player 1") && !user.name.startsWith("guest-") && (
              <Link
                href="/profile"
                className="search-button"
                title="View Player Profile & Rewards"
                style={{
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  color: "#f59e0b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  textDecoration: "none",
                }}
              >
                <Sparkles size={14} />
                @{user.name}
              </Link>
            )}
            <button
              className="search-button"
              onClick={() =>
                switchPlayer(
                  user?.name?.includes("1")
                    ? "Player 2 (Guest)"
                    : "Player 1 (Host)"
                )
              }
              title="Switch between Player 1 and Player 2 for two-client testing"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <User size={14} /> {user?.name ? user.name : "Sign in as Player 1"}
            </button>
            <button className="wallet-button" onClick={connectWallet}>
              <WalletCards size={16} />{" "}
              {address ? (
                <>
                  {walletBalance !== null ? (
                    <span style={{ color: "#EC9918", fontWeight: 700, marginRight: "4px" }}>
                      {walletBalance.toFixed(1)} NIM ·
                    </span>
                  ) : null}
                  {formatAddress(address)}
                </>
              ) : (
                "Connect wallet"
              )}
            </button>
          </div>
        </header>

        <section className="platform-intro" id="featured">
          <div className="intro-copy">
            <div className="stamp-row">
              <span className="stamp orange">SEASON 01</span>
              <span className="stamp">WEB3 MULTI-GAME ARENA</span>
            </div>
            <p className="eyebrow">ON-CHAIN MICRO-STAKES ESPORTS</p>
            <h1>
              Enter the Nimiq
              <br />
              <em>Gaming Arena.</em>
            </h1>
            <p className="hero-dek">
              Provably fair multiplayer strategy games powered by the ultra-fast Nimiq blockchain.
              Claim your Web3 identity, invite friends to earn 5% match commissions, and compete for on-chain pots.
            </p>
            <div className="hero-actions" style={{ flexWrap: "wrap", gap: "12px" }}>
              <a
                href="#games"
                className="primary-action"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  boxShadow: "0 4px 16px rgba(245, 158, 11, 0.4)",
                  padding: "14px 24px",
                  fontSize: "14px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  textDecoration: "none",
                }}
              >
                <Gamepad2 size={18} /> BROWSE GAMES
              </a>
              <button
                type="button"
                className="secondary-chip"
                onClick={handleStartSoloPractice}
                disabled={createSolo.isPending}
                style={{
                  padding: "12px 18px",
                  background: "rgba(234, 179, 8, 0.15)",
                  borderColor: "rgba(234, 179, 8, 0.4)",
                  color: "#fbbf24",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Zap size={16} /> {createSolo.isPending ? "Launching…" : "Practice"}
              </button>
              <button
                type="button"
                className="secondary-chip"
                onClick={() => setIsIdentityModalOpen(true)}
                style={{ padding: "12px 18px" }}
              >
                <Sparkles size={16} /> Claim Identity (+1,000 Pts)
              </button>
              <Link className="text-action" href="/join" style={{ padding: "12px 16px" }}>
                <Coins size={16} /> Join by Match Code
              </Link>
            </div>
            <div className="trust-line">
              <ShieldCheck size={15} />
              <span>
                Live players, balances, and match results appear only when
                verified systems are connected.
              </span>
            </div>
          </div>
          <div className="feature-stage">
            <div className="feature-art">
              <img src={gameCards[0].image} alt="Ludo table preview" />
              <div className="feature-wash" />
              <div className="feature-copy">
                <span className="card-label">01 / FEATURED GAME</span>
                <h2>
                  {ludoQuery.data?.name ?? "Ludo"}
                  <br />
                  <em>League</em>
                </h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                  <Link className="stage-button" href="/games/ludo-league">
                    <Gamepad2 size={15} /> Play Arena
                  </Link>
                  <button
                    type="button"
                    className="stage-button"
                    onClick={handleStartSoloPractice}
                    disabled={createSolo.isPending}
                    style={{
                      background: "rgba(245, 158, 11, 0.2)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      color: "#fbbf24",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Zap size={14} /> {createSolo.isPending ? "Loading…" : "Practice"}
                  </button>
                  <Link
                    className="stage-button"
                    href="/games/ludo-league"
                    style={{ background: "rgba(234, 179, 8, 0.2)", border: "1px solid rgba(234, 179, 8, 0.4)", color: "#facc15" }}
                  >
                    <Coins size={14} /> Wager Escrow
                  </Link>
                </div>
              </div>
              <span className="feature-chip" style={{ background: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "1px solid rgba(34, 197, 94, 0.4)" }}>● LIVE ON NIMIQ TESTNET</span>
            </div>
            <div className="feature-footer">
              <span>
                <Zap size={13} /> FIRST ON THE TABLE
              </span>
              <span>STRATEGY / SOCIAL</span>
            </div>
          </div>
        </section>

        <section className="section-block" id="games">
          <div className="section-topline">
            <div>
              <p className="eyebrow">THE ARENA INDEX</p>
              <h2>
                Pick a room.
                <br />
                <em>Stay for the games.</em>
              </h2>
            </div>
            <button
              className="browse-link"
              onClick={() => unavailable("Full game library")}
            >
              <span>View all games</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="game-grid">
            {gameCards.map((game, index) => (
              <article
                className={`game-card ${game.status === "FEATURED" ? "featured-card" : ""}`}
                key={game.title}
                onClick={() => {
                  if (game.title.includes("Ludo")) {
                    window.location.href = "/games/ludo-league";
                  } else if (game.title.includes("Connect")) {
                    window.location.href = "/games/connect-four";
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <div className={`game-card-art ${game.accent}`}>
                  <img src={game.image} alt="" />
                  <div className="game-card-shade" />
                  <span className="game-status">{game.status}</span>
                  <span className="game-index">0{index + 1}</span>
                </div>
                <div className="game-card-body">
                  <div>
                    <span className="card-label">{game.genre}</span>
                    <h3>{game.title}</h3>
                  </div>
                  <button
                    className="round-arrow"
                    onClick={() => {
                      if (game.title.includes("Ludo")) {
                        window.location.href = "/games/ludo-league";
                      } else if (game.title.includes("Connect")) {
                        window.location.href = "/games/connect-four";
                      }
                    }}
                    aria-label={`Open ${game.title}`}
                  >
                    <ArrowUpRight size={15} />
                  </button>
                  <p>{game.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Arena Ecosystem Navigation Grid */}
        <section className="section-block" id="hub-navigation" style={{ marginTop: "36px" }}>
          <div className="section-topline">
            <div>
              <p className="eyebrow">ARENA ECOSYSTEM</p>
              <h2>
                Standings, records,
                <br />
                <em>and community tables.</em>
              </h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            {/* Leaderboard Card */}
            <div
              style={{
                background: "linear-gradient(145deg, #131b2e 0%, #0d121f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fbbf24",
                    marginBottom: "16px",
                  }}
                >
                  <Trophy size={22} />
                </div>
                <span className="card-label" style={{ color: "#fbbf24" }}>SEASON 01 RANKINGS</span>
                <h3 style={{ fontSize: "1.25rem", margin: "6px 0 10px 0", color: "#f8fafc" }}>
                  Global Leaderboards
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
                  Explore top competitive Elo rankings, win streaks, and seasonal champion crowns across all Arena games.
                </p>
              </div>
              <Link
                href="/leaderboard"
                style={{
                  marginTop: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#fbbf24",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                View Standings <ArrowUpRight size={15} />
              </Link>
            </div>

            {/* Profile Card */}
            <div
              style={{
                background: "linear-gradient(145deg, #131b2e 0%, #0d121f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(56, 189, 248, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#38bdf8",
                    marginBottom: "16px",
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <span className="card-label" style={{ color: "#38bdf8" }}>YOUR WEB3 RECORD</span>
                <h3 style={{ fontSize: "1.25rem", margin: "6px 0 10px 0", color: "#f8fafc" }}>
                  Player Profile & Identity
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
                  Review your personal win-loss ratio, lifetime NIM earned, rating tier, and cryptographic match receipts.
                </p>
              </div>
              <Link
                href="/profile"
                style={{
                  marginTop: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Open Profile <ArrowUpRight size={15} />
              </Link>
            </div>

            {/* Join Private Match Card */}
            <div
              style={{
                background: "linear-gradient(145deg, #131b2e 0%, #0d121f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(34, 197, 94, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#4ade80",
                    marginBottom: "16px",
                  }}
                >
                  <Coins size={22} />
                </div>
                <span className="card-label" style={{ color: "#4ade80" }}>CHALLENGE ROOMS</span>
                <h3 style={{ fontSize: "1.25rem", margin: "6px 0 10px 0", color: "#f8fafc" }}>
                  Join Friend by Code
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
                  Have an invite code from a friend? Enter directly into a private match table with zero waiting time.
                </p>
              </div>
              <Link
                href="/join"
                style={{
                  marginTop: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  color: "#4ade80",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Enter Room <ArrowUpRight size={15} />
              </Link>
            </div>

            {/* Earn & Referral Rewards Card */}
            <div
              style={{
                background: "linear-gradient(145deg, #131b2e 0%, #0d121f 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "rgba(168, 85, 247, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#c084fc",
                    marginBottom: "16px",
                  }}
                >
                  <Gift size={22} />
                </div>
                <span className="card-label" style={{ color: "#c084fc" }}>ARENA REWARDS</span>
                <h3 style={{ fontSize: "1.25rem", margin: "6px 0 10px 0", color: "#f8fafc" }}>
                  Earn & Referrals
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: "1.5" }}>
                  Claim your +1,000 pts welcome bonus, invite friends for +500 pts each, and earn 5% commissions on all match pots.
                </p>
              </div>
              <Link
                href="/earn"
                style={{
                  marginTop: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  background: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  color: "#c084fc",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Claim & Invite <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        <section className="arena-rails" style={{ marginTop: "36px" }}>
          <div className="rail-card rail-dark">
            <span className="card-label">THE POINT OF THE ARENA</span>
            <h3>
              Play something
              <br />
              <em>worth coming back to.</em>
            </h3>
            <p>
              Games are the beginning. Community, progression, and fair
              competition are the long game.
            </p>
            <button
              className="rail-link"
              onClick={() => unavailable("Arena community")}
            >
              <Sparkles size={14} /> Explore the vision
            </button>
          </div>
          <div className="rail-card">
            <span className="card-label">NIMIQ WALLET / LIVE STATUS</span>
            <div className="rail-status">
              <span
                className={`status-dot ${address || providerState === "ready" ? "ready" : ""}`}
              />
              <strong>{providerLabel}</strong>
            </div>
            <h3>
              {address
                ? `Connected: ${formatAddress(address)}`
                : providerState === "ready"
                  ? "Nimiq Pay mobile host ready."
                  : "Connect via Nimiq Hub or enter address."}
            </h3>
            <p>{providerMessage}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="rail-link" onClick={connectWallet}>
                <WalletCards size={14} />{" "}
                {address ? "Manage Wallet" : "Connect Nimiq Wallet"}
              </button>
              <button className="rail-link" onClick={() => setIsDevModalOpen(true)}>
                <Terminal size={14} /> Inspect Host
              </button>
            </div>
          </div>
        </section>

        <footer className="arena-footer">
          <div className="footer-mark">
            <img
              src="/manus-storage/nimiq-arena-mark_d1d871ea.png"
              alt=""
              className="footer-brand-mark"
            />
            <Sparkles size={15} />
            <span>THE GAME ROOM IS OPENING</span>
          </div>
          <span>Nimiq Arena / Multi-game platform foundation / 2026</span>
          <button onClick={() => unavailable("Terms and safeguards")}>
            <ShieldCheck size={14} /> Safeguards <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
    </div>
  );
}
