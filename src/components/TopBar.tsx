import { motion } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import { formatDeltaPct, formatMillions, getObjectiveLabel, getStrategyLabel } from "@/lib/scenario";

export default function TopBar({ simDay, simHour, isPlaying, onTogglePlay }: { simDay: number; simHour: number; isPlaying: boolean; onTogglePlay: () => void }) {
  const { state, scenarios, currentScenario, bestScenario } = useGameState();
  const baseline = scenarios.baseline;
  const objectiveLabel = getObjectiveLabel(state.objective);
  const progressPct = Math.min(100, (state.lastTick / 12) * 100);
  const phaseOrder = ["baseline", "incident", "response", "recovery", "steady"];
  const activePhaseIndex = phaseOrder.indexOf(state.simulationPhase);

  const timelinePoints = [
    { label: "Baseline Set", time: "T0", phase: "baseline" },
    { label: "Equipment Failure", time: "T1", phase: "incident" },
    { label: currentScenario.mode === "baseline" ? "Observe Impact" : currentScenario.mode === "manual" ? "Manual Plan" : "AI Plan", time: "T2", phase: "response" },
    { label: bestScenario.mode === currentScenario.mode ? "Winning Path" : "Tradeoff Review", time: "T3", phase: "recovery" },
    { label: "Steady State", time: "T4", phase: "steady" },
  ];

  const plMetrics = [
    {
      label: "Revenue Impact",
      left: formatMillions(baseline.outcome.revenueDelta),
      right: formatMillions(currentScenario.outcome.revenueDelta),
      delta: formatMillions(currentScenario.outcome.revenueDelta - baseline.outcome.revenueDelta),
      positive: currentScenario.outcome.revenueDelta > baseline.outcome.revenueDelta,
    },
    {
      label: "Recovery (days)",
      left: baseline.outcome.recoveryDays.toFixed(1),
      right: currentScenario.outcome.recoveryDays.toFixed(1),
      delta: `${(baseline.outcome.recoveryDays - currentScenario.outcome.recoveryDays).toFixed(1)}d`,
      positive: currentScenario.outcome.recoveryDays < baseline.outcome.recoveryDays,
    },
    {
      label: "Service Level",
      left: `${baseline.outcome.serviceLevelPct.toFixed(1)}%`,
      right: `${currentScenario.outcome.serviceLevelPct.toFixed(1)}%`,
      delta: formatDeltaPct(currentScenario.outcome.serviceLevelPct - baseline.outcome.serviceLevelPct),
      positive: currentScenario.outcome.serviceLevelPct >= baseline.outcome.serviceLevelPct,
    },
  ];

  return (
    <div className="flex items-center gap-6 px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm">
      <div className="flex flex-col items-center pr-5 border-r border-border">
        <motion.div
          className="text-lg font-mono font-bold text-primary text-glow tabular-nums"
          key={`${simDay}-${simHour}`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
        >
          DAY {simDay}, {String(simHour).padStart(2, "0")}:00
        </motion.div>
        <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-muted-foreground mt-1">
          {getStrategyLabel(currentScenario.mode)}
        </div>
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
          <div key={m.label} className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-muted-foreground">{m.left}</span>
              <span className="text-[10px] text-muted-foreground">→</span>
              <span className="text-xs font-mono text-primary">{m.right}</span>
              <span className={`text-[10px] font-mono font-bold ${m.positive ? "text-primary" : "text-sn-danger"}`}>
                {m.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-l border-border pl-5">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{objectiveLabel}</div>
          <div className="text-[11px] font-mono text-primary">
            Best: {getStrategyLabel(bestScenario.mode)}
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-sn-surface-hover text-xs font-medium text-foreground transition-colors border border-border">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
}
