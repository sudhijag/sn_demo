import { motion } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import { formatDeltaPct, formatMillions, getObjectiveLabel, getStrategyLabel } from "@/lib/scenario";

export default function TopBar({ simDay, simHour, isPlaying, onTogglePlay }: { simDay: number; simHour: number; isPlaying: boolean; onTogglePlay: () => void }) {
  const { state, scenarios, currentScenario, bestScenario } = useGameState();
  const baseline = scenarios.baseline;
  const ai = scenarios.ai;
  const objectiveLabel = getObjectiveLabel(state.objective);

  const timelinePoints = [
    { label: "Baseline Set", time: "T0", active: false, done: true, star: true },
    { label: "Equipment Failure", time: "T1", active: false, done: true, star: true },
    { label: currentScenario.mode === "baseline" ? "Observe Impact" : currentScenario.mode === "manual" ? "Manual Plan" : "AI Plan", time: "T2", active: true, done: false, star: true },
    { label: bestScenario.mode === currentScenario.mode ? "Winning Path" : "Tradeoff Review", time: "T3", active: false, done: currentScenario.enabledInterventions.length > 0, star: false },
    { label: "Steady State", time: "T4", active: false, done: false, star: false },
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

        <div className="flex items-center gap-0 flex-1 min-w-0">
          {timelinePoints.map((pt, i) => (
            <div key={pt.time} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-0.5 relative">
                {pt.star ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" className={pt.active ? "drop-shadow-[0_0_4px_var(--sn-green)]" : ""}>
                    <polygon
                      points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                      fill={pt.active ? "var(--sn-green)" : pt.done ? "var(--sn-green)" : "transparent"}
                      stroke={pt.active ? "var(--sn-green)" : pt.done ? "var(--sn-green)" : "oklch(0.4 0.02 240)"}
                      strokeWidth="1.5"
                      opacity={pt.active ? 1 : pt.done ? 0.6 : 0.4}
                    />
                  </svg>
                ) : (
                  <div className={`w-3 h-3 rounded-full border-2 ${
                    pt.active
                      ? "border-primary bg-primary glow-green-sm"
                      : pt.done
                        ? "border-primary bg-primary/40"
                        : "border-muted-foreground/40 bg-transparent"
                  }`} />
                )}
                {pt.active && (
                  <motion.div
                    className="absolute -inset-1 rounded-full"
                    style={{ boxShadow: "0 0 8px var(--sn-green-glow)" }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
                <span className={`text-[9px] font-mono whitespace-nowrap ${pt.active ? "text-primary text-glow" : "text-muted-foreground"}`}>
                  {pt.label}
                </span>
              </div>
              {i < timelinePoints.length - 1 && (
                <div className={`flex-1 h-px mx-1 mt-[-14px] ${pt.done ? "bg-primary/60" : "bg-border"}`} />
              )}
            </div>
          ))}
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
