import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useGameState } from "@/lib/game-state";
import { formatInvestmentCost, formatMillions, type ScenarioOutcome, type StrategyMode } from "@/lib/scenario";
import { SIM_TICK_MS } from "@/lib/sim-config";
import ROIMemoModal from "./ROIMemoModal";

function DeltaGlyph({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 9 9"
      className={direction === "up" ? "text-primary" : "text-sn-danger"}
      aria-hidden="true"
    >
      <path d={direction === "up" ? "M4.5 1 8 7H1z" : "M1 2h7L4.5 8z"} fill="currentColor" />
    </svg>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seededNoise(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function getModeBias(mode: StrategyMode) {
  if (mode === "ai") return 1;
  if (mode === "manual") return 0.35;
  return -0.2;
}

function easeOut(value: number) {
  return 1 - (1 - value) ** 2;
}

function buildLiveOutcome(
  baselineOutcome: ScenarioOutcome,
  outcome: ScenarioOutcome,
  mode: StrategyMode,
  seedBase: number,
  progression: number,
) {
  const modeBias = getModeBias(mode);
  const settledProgress = easeOut(progression);
  const volatility = 0.25 + settledProgress * 1.35;
  const revenueTarget = baselineOutcome.revenueDelta + (outcome.revenueDelta - baselineOutcome.revenueDelta) * settledProgress;
  const recoveryTarget = baselineOutcome.recoveryDays + (outcome.recoveryDays - baselineOutcome.recoveryDays) * settledProgress;
  const serviceTarget = baselineOutcome.serviceLevelPct + (outcome.serviceLevelPct - baselineOutcome.serviceLevelPct) * settledProgress;
  const revenueWobble = (seededNoise(seedBase + 1) - 0.5) * 780_000 * volatility + modeBias * 165_000 * settledProgress;
  const recoveryWobble = (seededNoise(seedBase + 2) - 0.5) * 0.85 * volatility - modeBias * 0.14 * settledProgress;
  const serviceWobble = (seededNoise(seedBase + 3) - 0.5) * 1.15 * volatility + modeBias * 0.24 * settledProgress;

  return {
    revenueDelta: Math.round(revenueTarget + revenueWobble),
    recoveryDays: clamp(recoveryTarget + recoveryWobble, 4, 32),
    serviceLevelPct: clamp(serviceTarget + serviceWobble, 72, 98.5),
  };
}

export default function TopBar({ simDay, simHour, isPlaying, onTogglePlay }: { simDay: number; simHour: number; isPlaying: boolean; onTogglePlay: () => void }) {
  const { state, scenarios, currentScenario, activeResponsePlan } = useGameState();
  const baseline = scenarios.baseline;
  const [visualQuarter, setVisualQuarter] = useState(0);
  const [roiModalOpen, setRoiModalOpen] = useState(false);
  const progressPct = Math.min(100, (state.lastTick / 12) * 100);
  const phaseOrder = ["baseline", "incident", "response", "recovery", "steady"];
  const activePhaseIndex = phaseOrder.indexOf(state.simulationPhase);
  const responseIsLive = state.simulationPhase !== "baseline" && activeResponsePlan.status !== "control";

  useEffect(() => {
    setVisualQuarter(0);
  }, [simHour, simDay]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setVisualQuarter((current) => (current + 1) % 4);
    }, Math.max(600, SIM_TICK_MS / 4));
    return () => clearInterval(interval);
  }, [isPlaying]);

  const visualMinutes = String(visualQuarter * 15).padStart(2, "0");
  const timeSeed = simDay * 97 + simHour * 13 + visualQuarter * 7 + state.lastTick * 17;
  const scenarioProgress = clamp((state.lastTick - 5) / 7, 0, 1);
  const displayedMetrics = useMemo(() => {
    const liveBaseline = buildLiveOutcome(baseline.outcome, baseline.outcome, "baseline", timeSeed + 11, 0.18 + state.lastTick / 18);
    const liveCurrent = buildLiveOutcome(baseline.outcome, currentScenario.outcome, currentScenario.mode, timeSeed + 101, scenarioProgress);

    return {
      revenuePrimary: liveCurrent.revenueDelta,
      recoveryPrimary: liveCurrent.recoveryDays,
      servicePrimary: liveCurrent.serviceLevelPct,
      revenueDelta: liveCurrent.revenueDelta - liveBaseline.revenueDelta,
      recoveryDelta: liveBaseline.recoveryDays - liveCurrent.recoveryDays,
      serviceDelta: liveCurrent.serviceLevelPct - liveBaseline.serviceLevelPct,
    };
  }, [baseline.outcome, currentScenario.mode, currentScenario.outcome, scenarioProgress, state.lastTick, timeSeed]);

  const formatDeltaMillions = (value: number) => `$${(Math.abs(value) / 1_000_000).toFixed(1)}M`;
  const formatDeltaDays = (value: number) => `${Math.abs(value).toFixed(1)}d`;
  const formatDeltaPoints = (value: number) => `${Math.abs(value).toFixed(1)} pts`;

  const getMetricTone = (value: number) => {
    if (Math.abs(value) < 0.05) return "neutral";
    if (value < 0) return "negative";
    return responseIsLive ? "positive" : "neutral";
  };

  const timelinePoints = [
    { label: "Baseline Set", time: "T0", phase: "baseline" },
    { label: "Equipment Failure", time: "T1", phase: "incident" },
    { label: currentScenario.mode === "baseline" ? "Observe Impact" : currentScenario.mode === "manual" ? "Manual Plan" : "AI Plan", time: "T2", phase: "response" },
    { label: currentScenario.mode === "baseline" ? "Impact Window" : "Plan Taking Effect", time: "T3", phase: "recovery" },
    { label: "Steady State", time: "T4", phase: "steady" },
  ];
  const plMetrics = [
    {
      label: "Revenue Impact",
      primary: formatMillions(displayedMetrics.revenuePrimary),
      delta: displayedMetrics.revenueDelta,
      deltaLabel: formatDeltaMillions(displayedMetrics.revenueDelta),
    },
    {
      label: "Recovery",
      primary: `${displayedMetrics.recoveryPrimary.toFixed(1)}d`,
      delta: displayedMetrics.recoveryDelta,
      deltaLabel: formatDeltaDays(displayedMetrics.recoveryDelta),
    },
    {
      label: "Service Level",
      primary: `${displayedMetrics.servicePrimary.toFixed(1)}%`,
      delta: displayedMetrics.serviceDelta,
      deltaLabel: formatDeltaPoints(displayedMetrics.serviceDelta),
    },
  ];

  const openRoiMemo = () => {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "roi-memo-sheet.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setRoiModalOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-6 px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col items-center pr-5 border-r border-border">
        <motion.div
          className="text-lg font-mono font-bold text-primary text-glow tabular-nums"
          key={`${simDay}-${simHour}`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
        >
          DAY {simDay}, {String(simHour).padStart(2, "0")}:{visualMinutes}
        </motion.div>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onTogglePlay}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-border bg-secondary hover:bg-sn-surface-hover transition-colors"
        >
          {isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--sn-green)">
              <rect x="5" y="3" width="5" height="18" rx="1" />
              <rect x="14" y="3" width="5" height="18" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--sn-green)">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="relative h-2 rounded-full overflow-hidden bg-secondary/80 border border-border mb-2">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--sn-green-dim), var(--sn-green))" }}
              initial={false}
              animate={{ width: `${Math.max(4, progressPct)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {timelinePoints.map((pt, i) => {
              const pointIndex = phaseOrder.indexOf(pt.phase);
              const done = pointIndex < activePhaseIndex;
              const active = pointIndex === activePhaseIndex;
              return (
                <div key={pt.time} className="flex flex-col items-center gap-0.5 relative">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                    active
                      ? "border-primary bg-primary glow-green-sm"
                      : done
                        ? "border-primary bg-primary/40"
                        : "border-muted-foreground/40 bg-transparent"
                  }`} />
                  {active && (
                    <motion.div
                      className="absolute top-[-2px] w-4 h-4 rounded-full"
                      style={{ boxShadow: "0 0 8px var(--sn-green-glow)" }}
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                  <span className={`text-[9px] font-mono whitespace-nowrap ${active ? "text-primary text-glow" : "text-muted-foreground"}`}>
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        </div>

        <div className="flex items-center gap-4 border-l border-border pl-5">
        {plMetrics.map((m) => (
          <div key={m.label} className="min-w-[124px]">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <motion.div
              key={`${m.label}-${simDay}-${simHour}-${visualQuarter}-${m.primary}`}
              initial={{ opacity: 0.55, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="mt-0.5 text-sm font-mono text-foreground"
            >
              {m.primary}
            </motion.div>
            <div
              className={`mt-1 flex items-center gap-1 text-[10px] font-mono ${
                getMetricTone(m.delta) === "positive"
                  ? "text-primary"
                  : getMetricTone(m.delta) === "negative"
                    ? "text-sn-danger"
                    : "text-muted-foreground"
              }`}
            >
              {getMetricTone(m.delta) === "positive" && <DeltaGlyph direction="up" />}
              {getMetricTone(m.delta) === "negative" && <DeltaGlyph direction="down" />}
              <span>{getMetricTone(m.delta) === "neutral" ? "No delta" : m.deltaLabel}</span>
            </div>
          </div>
        ))}
        </div>

        <div className="flex items-center gap-2 border-l border-border pl-5">
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-primary/80">Capital Pool</div>
            <div className="text-sm font-mono text-primary">{formatInvestmentCost(state.availableCapital)}</div>
          </div>
          <button
            onClick={openRoiMemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-sn-surface-hover text-xs font-medium text-foreground transition-colors border border-border"
          >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
            ROI Memo
          </button>
        </div>
      </div>
      <ROIMemoModal open={roiModalOpen} onOpenChange={setRoiModalOpen} />
    </>
  );
}
