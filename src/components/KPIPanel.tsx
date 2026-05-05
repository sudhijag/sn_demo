import { motion } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import { BASELINE_ASSUMPTIONS, formatMillions, getChangedAssumptions } from "@/lib/scenario";

function fmtDelta(n: number) {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default function KPIPanel() {
  const { currentScenario, bestScenario, state } = useGameState();
  const changes = getChangedAssumptions(state.assumptions);
  const kpis = [
    { label: "Scenario Margin", value: fmtDelta(currentScenario.outcome.marginDeltaPct), trend: `vs plan`, up: currentScenario.outcome.marginDeltaPct > -5 },
    { label: "Revenue Impact", value: formatMillions(currentScenario.outcome.revenueDelta), trend: currentScenario.label, up: currentScenario.outcome.revenueDelta > -7_000_000 },
    { label: "Service Level", value: `${currentScenario.outcome.serviceLevelPct.toFixed(1)}%`, trend: bestScenario.label, up: currentScenario.outcome.serviceLevelPct > 90 },
    { label: "Recovery Time", value: `${currentScenario.outcome.recoveryDays.toFixed(1)}d`, trend: `${Math.round(currentScenario.outcome.confidencePct)}% conf`, up: currentScenario.outcome.recoveryDays < 12 },
  ];

  return (
    <div className="w-64 flex flex-col gap-3 p-3 border-r border-border overflow-y-auto">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Decision Brief</div>

      <div className="flex flex-col gap-2">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-surface px-3 py-2"
          >
            <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
            <div className="flex items-baseline justify-between mt-0.5 gap-2">
              <span className="text-sm font-mono font-bold text-foreground">{kpi.value}</span>
              <span className={`text-[10px] font-mono ${kpi.up ? "text-primary" : "text-sn-danger"}`}>
                {kpi.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
          Active Assumptions
        </div>
        <div className="card-surface px-3 py-2 space-y-1.5 text-[10px]">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Outage</span>
            <span className="font-mono text-foreground">{state.assumptions.outageDurationDays}d</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Spare capacity</span>
            <span className="font-mono text-foreground">{state.assumptions.spareCapacityPct}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Labor</span>
            <span className="font-mono text-foreground">{state.assumptions.laborAvailabilityPct}%</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Freight</span>
            <span className="font-mono text-foreground capitalize">{state.assumptions.freightMode}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Lead time</span>
            <span className="font-mono text-foreground">{state.assumptions.supplierLeadTimeDays}d</span>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Delta From Baseline</div>
        <div className="card-surface px-3 py-2 space-y-1.5">
          {changes.length > 0 ? (
            changes.map((change, i) => (
              <div key={i} className="text-[10px] text-primary leading-tight">
                {change}
              </div>
            ))
          ) : (
            <div className="text-[10px] text-muted-foreground leading-tight">
              Matching baseline assumptions: {BASELINE_ASSUMPTIONS.outageDurationDays}d outage, {BASELINE_ASSUMPTIONS.spareCapacityPct}% spare capacity.
            </div>
          )}
        </div>
      </div>

      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Decision Readout</div>
        <div className="card-surface px-3 py-2 space-y-1.5">
          <div className="text-[10px] text-muted-foreground">Best current strategy</div>
          <div className="text-[12px] font-semibold text-primary">{bestScenario.label}</div>
          <div className="text-[10px] text-muted-foreground leading-tight">
            {bestScenario.outcome.summary}
          </div>
        </div>
      </div>
    </div>
  );
}
