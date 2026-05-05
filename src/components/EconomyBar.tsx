import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";
import { DollarSign, Boxes, Users, TrendingUp, Zap, Star, Wallet } from "lucide-react";
import { useGameState } from "@/lib/game-state";
import { formatMillions, getStrategyLabel, INTERVENTION_LIBRARY } from "@/lib/scenario";

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  format: (n: number) => string;
  sub?: string;
  tone?: "green" | "amber" | "danger" | "neutral";
  pct?: number;
}

const toneColor: Record<NonNullable<StatProps["tone"]>, string> = {
  green: "var(--sn-green)",
  amber: "var(--sn-warning)",
  danger: "var(--sn-danger)",
  neutral: "oklch(0.85 0.01 240)",
};

function Stat({ icon, label, value, format, sub, tone = "green", pct }: StatProps) {
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => format(v));
  const color = toneColor[tone];

  useEffect(() => {
    const c = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    return () => c.stop();
  }, [mv, value]);

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-border min-w-[160px]"
      style={{ background: "oklch(0.16 0.02 240)" }}
    >
      <div
        className="w-7 h-7 rounded flex items-center justify-center"
        style={{ background: "oklch(0.2 0.02 240)", color }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[9px] font-mono tracking-[0.18em] uppercase text-muted-foreground leading-none">{label}</div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <motion.span
            className="text-[14px] font-semibold tabular-nums leading-none"
            style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {display}
          </motion.span>
          {sub && <span className="text-[9.5px] text-muted-foreground leading-none">{sub}</span>}
        </div>
        {typeof pct === "number" && (
          <div className="mt-1.5 h-[3px] rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.02 240)" }}>
            <motion.div
              className="h-full"
              style={{ background: color }}
              initial={false}
              animate={{ width: `${Math.max(2, Math.min(100, pct * 100))}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function formatCurrency(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export default function EconomyBar() {
  const { state, currentScenario, bestScenario } = useGameState();
  const totalWorkers = state.buildings.reduce((s, b) => s + b.workers, 0);
  const totalCapacity = state.buildings.reduce((s, b) => s + b.workersCapacity, 0);
  const laborUtil = totalCapacity > 0 ? totalWorkers / totalCapacity : 0;

  const netPerHr = state.revenuePerHr - state.upkeepPerHr;
  const cashTone = state.cash > 10_000_000 ? "green" : state.cash > 2_000_000 ? "amber" : "danger";
  const projectedPlanCost = currentScenario.enabledInterventions.reduce((sum, type) => {
    const intervention = INTERVENTION_LIBRARY.find((item) => item.type === type);
    return sum + (intervention?.estimatedCost ?? 0);
  }, 0);

  return (
    <div
      className="flex items-center gap-2 px-5 py-2 border-b border-border overflow-x-auto"
      style={{ background: "oklch(0.15 0.02 240)" }}
    >
      <Stat
        icon={<Wallet size={14} strokeWidth={2.2} />}
        label="CASH"
        value={state.cash}
        format={formatCurrency}
        sub={`${netPerHr >= 0 ? "+" : ""}${formatCurrency(netPerHr)}/hr`}
        tone={cashTone}
      />
      <Stat
        icon={<DollarSign size={14} strokeWidth={2.2} />}
        label="REV IMPACT"
        value={currentScenario.outcome.revenueDelta}
        format={formatMillions}
        sub={getStrategyLabel(currentScenario.mode)}
        tone={currentScenario.outcome.revenueDelta > -7_000_000 ? "green" : "danger"}
      />
      <Stat
        icon={<Boxes size={14} strokeWidth={2.2} />}
        label="SERVICE"
        value={currentScenario.outcome.serviceLevelPct}
        format={(n) => `${n.toFixed(1)}%`}
        sub={`best ${bestScenario.outcome.serviceLevelPct.toFixed(1)}%`}
        pct={currentScenario.outcome.serviceLevelPct / 100}
        tone={currentScenario.outcome.serviceLevelPct > 90 ? "green" : "amber"}
      />
      <Stat
        icon={<Users size={14} strokeWidth={2.2} />}
        label="LABOR"
        value={totalWorkers}
        format={(n) => Math.round(n).toLocaleString()}
        sub={`${state.assumptions.laborAvailabilityPct}% available`}
        pct={laborUtil}
        tone="green"
      />
      <Stat
        icon={<TrendingUp size={14} strokeWidth={2.2} />}
        label="RECOVERY"
        value={currentScenario.outcome.recoveryDays}
        format={(n) => `${n.toFixed(1)}d`}
        sub={`${currentScenario.enabledInterventions.length} actions`}
        tone={currentScenario.outcome.recoveryDays <= 12 ? "green" : "amber"}
      />
      <Stat
        icon={<Zap size={14} strokeWidth={2.2} />}
        label="PLAN COST"
        value={projectedPlanCost}
        format={formatCurrency}
        sub={`freight ${formatCurrency(currentScenario.outcome.expediteCost)}`}
        tone={projectedPlanCost > 900_000 ? "amber" : "green"}
      />
      <Stat
        icon={<Star size={14} strokeWidth={2.2} />}
        label="NETWORK"
        value={state.reputation}
        format={() => `${Math.round(currentScenario.outcome.confidencePct)}% conf`}
        sub={`wip ${Math.round(state.wipInventory)} · raw ${Math.round(state.rawInventory)}t`}
        pct={state.reputation / 5}
        tone="green"
      />
    </div>
  );
}
