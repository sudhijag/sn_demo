import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import TopBar from "../components/TopBar";
import NetworkMap from "../components/NetworkMap";
import ChatPanel from "../components/ChatPanel";
import BuildPalette from "../components/BuildPalette";
import CapitalTree from "../components/CapitalTree";
import KPIPanel from "../components/KPIPanel";
import PlantDetail from "../components/PlantDetail";
import EndgameLeaderboard from "../components/EndgameLeaderboard";
import { GameStateProvider, useGameState } from "@/lib/game-state";
import { SIM_TICK_MS } from "@/lib/sim-config";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Manufacturing Tycoon — Executive Simulation" },
      { name: "description", content: "AI-powered manufacturing tycoon simulator with buildings, upgrades, workforce, machines, and a live economy." },
    ],
  }),
});

function Index() {
  return (
    <GameStateProvider>
      <IndexBody />
    </GameStateProvider>
  );
}

function IndexBody() {
  const [simDay, setSimDay] = useState(11);
  const [simHour, setSimHour] = useState(6);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardShown, setLeaderboardShown] = useState(false);
  const { tick, state, effectiveAssumptions } = useGameState();
  const previousPhaseRef = useRef(state.simulationPhase);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimHour((h) => {
        if (h >= 23) {
          setSimDay((d) => d + 1);
          return 0;
        }
        return h + 1;
      });
      tick();
    }, SIM_TICK_MS);
    return () => clearInterval(interval);
  }, [isPlaying, tick]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = state.simulationPhase;
    if (previousPhase === state.simulationPhase) return;

    setIsPlaying(false);
  }, [state.simulationPhase]);

  useEffect(() => {
    if (state.simulationPhase !== "steady" || leaderboardShown) return;
    setIsPlaying(false);
    const timeout = window.setTimeout(() => {
      setShowLeaderboard(true);
      setLeaderboardShown(true);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [leaderboardShown, state.simulationPhase]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Brand header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-sn-navy border-b border-border">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--sn-green)" />
            <path d="M16 7C11.03 7 7 11.03 7 16s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 14.4c-2.98 0-5.4-2.42-5.4-5.4S13.02 10.6 16 10.6s5.4 2.42 5.4 5.4-2.42 5.4-5.4 5.4z" fill="var(--sn-navy)" />
          </svg>
          <div>
            <span className="text-xl font-bold text-foreground tracking-tight">Tycoon</span>
            <span className="text-[10px] text-muted-foreground ml-2">ServiceNow AI Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-secondary border border-border">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--sn-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <span className="text-[11px] font-mono text-primary">
              {state.lastTick === 0
                ? "Ready to set baseline · press play to begin"
                : state.simulationPhase === "baseline"
                ? "Baseline set · all network plants online"
                : `Dallas outage · ${effectiveAssumptions.outageDurationDays}d`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
            <span>Command Center Operational</span>
          </div>
        </div>
      </div>

      {/* Top bar with shared sim clock */}
      <TopBar simDay={simDay} simHour={simHour} isPlaying={isPlaying} onTogglePlay={() => setIsPlaying((p) => !p)} />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <NetworkMap simDay={simDay} simHour={simHour} />
          <KPIPanel />
          <CapitalTree />
          <BuildPalette />
        </div>

        <ChatPanel />
      </div>

      {/* Plant detail drawer (global, mounted once) */}
      <PlantDetail />
      <EndgameLeaderboard open={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </div>
  );
}
