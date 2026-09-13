import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { initTelegramApp } from "./lib/telegram";
import Home from "./pages/Home";
import LudoDetail from "./pages/LudoDetail";
import Connect4Detail from "./pages/Connect4Detail";
import JoinMatch from "./pages/JoinMatch";
import MatchRoom from "./pages/MatchRoom";
import Leaderboard from "./pages/Leaderboard";
import SyndicateRanks from "./pages/SyndicateRanks";
import SyndicatePlayoffs from "./pages/SyndicatePlayoffs";
import NimiqWatchExplorer from "./pages/NimiqWatchExplorer";
import CashoutReceiptPage from "./pages/CashoutReceiptPage";
import MatchVictoryPage from "./pages/MatchVictoryPage";
import MatchReplay from "./pages/MatchReplay";
import PlayerProfile from "./pages/PlayerProfile";
import GamesShowroom from "./pages/GamesShowroom";
import MatchesHub from "./pages/MatchesHub";
import Earn from "./pages/Earn";
import NotFound from "./pages/NotFound";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/games" component={GamesShowroom} />
      <Route path="/games/ludo-league" component={LudoDetail} />
      <Route path="/games/connect-four" component={Connect4Detail} />
      <Route path="/matches" component={MatchesHub} />
      <Route path="/matches/:id/replay" component={MatchReplay} />
      <Route path="/replay" component={MatchReplay} />
      <Route path="/matches/:id" component={MatchRoom} />
      <Route path="/join" component={JoinMatch} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/syndicates" component={SyndicateRanks} />
      <Route path="/guilds" component={SyndicateRanks} />
      <Route path="/playoffs" component={SyndicatePlayoffs} />
      <Route path="/syndicates/playoffs" component={SyndicatePlayoffs} />
      <Route path="/tournament" component={SyndicatePlayoffs} />
      <Route path="/explorer" component={NimiqWatchExplorer} />
      <Route path="/watch" component={NimiqWatchExplorer} />
      <Route path="/watch/:hash" component={NimiqWatchExplorer} />
      <Route path="/tx/:hash" component={NimiqWatchExplorer} />
      <Route path="/cashout-receipt" component={CashoutReceiptPage} />
      <Route path="/receipt" component={CashoutReceiptPage} />
      <Route path="/victory" component={MatchVictoryPage} />
      <Route path="/match-victory" component={MatchVictoryPage} />
      <Route path="/profile" component={PlayerProfile} />
      <Route path="/earn" component={Earn} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { NimiqWalletProvider } from "./lib/useNimiqWallet";
import { NimiqForensicPanel } from "./components/dev/NimiqForensicPanel";

export default function App() {
  useEffect(() => {
    initTelegramApp();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <NimiqWalletProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <NimiqForensicPanel />
          </TooltipProvider>
        </NimiqWalletProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
