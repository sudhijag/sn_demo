import { motion } from "framer-motion";
import { ArrowUp, Cog, Hammer, Plus, UserPlus, Wrench, X } from "lucide-react";
import { useGameState } from "@/lib/game-state";
import type { Building, ProductionLine } from "@/lib/buildings";
import { upgradeCapacityGain, upgradeCost } from "@/lib/buildings";

function fmt$(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

const statusColor: Record<string, string> = {
  active: "var(--sn-green)",
  warning: "var(--sn-warning)",
  alert: "var(--sn-danger)",
  down: "var(--sn-danger)",
};

const lineStatusColor: Record<ProductionLine["status"], string> = {
  active: "var(--sn-green)",
  bottleneck: "var(--sn-danger)",
  maintenance: "var(--sn-warning)",
  idle: "oklch(0.5 0.02 240)",
};

function Bar({ pct, color }: { pct: number; color: string }) {
  const w = Math.max(0, Math.min(100, pct * 100));
  return (
    <div className="h-[4px] w-full rounded-full overflow-hidden" style={{ background: "oklch(0.22 0.02 240)" }}>
      <motion.div
        className="h-full"
        style={{ background: color }}
        initial={false}
        animate={{ width: `${w}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "default",
  hint,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
  hint?: string;
}) {
  const styles: Record<string, string> = {
    default: "border-border text-foreground hover:bg-secondary",
    primary: "border-sn-green/60 text-sn-green hover:bg-sn-green/10",
    danger: "border-sn-warning/60 text-sn-warning hover:bg-sn-warning/10",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border text-[11px] font-mono uppercase tracking-[0.12em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      <span className="flex items-center gap-2">{children}</span>
      {hint && <span className="text-[10px] opacity-75">{hint}</span>}
    </button>
  );
}

function PlantDetailBody({ building }: { building: Building }) {
  const { state, upgrade, repair, hire, buyMachine, selectBuilding } = useGameState();
  const color = statusColor[building.status];
  const nextUpCost = upgradeCost(building.level);
  const nextUpGain = upgradeCapacityGain(building.level);
  const canUpgrade = building.level < 5 && state.cash >= nextUpCost;
  const canRepair = building.status !== "active" && state.cash >= 420_000;
  const canHire = state.cash >= 10 * 4200 && building.workers < building.workersCapacity;
  const canBuyMachine = state.cash >= 180_000 && building.machines < building.machinesCapacity;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
              {building.kind} · LV {building.level}
            </span>
          </div>
          <div className="text-[20px] font-semibold text-foreground leading-tight">{building.label}</div>
          <div className="text-[11px] font-mono mt-1" style={{ color }}>
            {building.status === "down" ? "OFFLINE" : `${building.capacity}% CAPACITY`}
          </div>
        </div>
        <button
          onClick={() => selectBuilding(null)}
          className="w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Economics */}
        <section>
          <div className="label-mono text-[9px] tracking-[0.22em] font-mono uppercase text-muted-foreground mb-2">
            Economics
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="card-surface p-2.5">
              <div className="text-[8.5px] font-mono text-muted-foreground uppercase tracking-[0.16em]">Revenue/hr</div>
              <div className="text-[14px] font-semibold text-sn-green tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmt$(building.revenuePerHr)}
              </div>
            </div>
            <div className="card-surface p-2.5">
              <div className="text-[8.5px] font-mono text-muted-foreground uppercase tracking-[0.16em]">Upkeep/hr</div>
              <div className="text-[14px] font-semibold text-sn-warning tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {fmt$(building.upkeepPerHr)}
              </div>
            </div>
            <div className="card-surface p-2.5">
              <div className="text-[8.5px] font-mono text-muted-foreground uppercase tracking-[0.16em]">Net/hr</div>
              <div
                className="text-[14px] font-semibold tabular-nums"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: building.revenuePerHr - building.upkeepPerHr >= 0 ? "var(--sn-green)" : "var(--sn-danger)",
                }}
              >
                {fmt$(building.revenuePerHr - building.upkeepPerHr)}
              </div>
            </div>
          </div>
        </section>

        {/* People & Machines */}
        <section>
          <div className="label-mono text-[9px] tracking-[0.22em] font-mono uppercase text-muted-foreground mb-2">
            People & Machines
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="card-surface p-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[10.5px] text-muted-foreground uppercase tracking-[0.16em] font-mono">Workers</span>
                <span className="text-[11px] font-mono text-sn-green">{building.workers.toLocaleString()} / {building.workersCapacity.toLocaleString()}</span>
              </div>
              <Bar pct={building.workers / building.workersCapacity} color="var(--sn-green)" />
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-[10.5px] text-muted-foreground uppercase tracking-[0.16em] font-mono">Morale</span>
                <span className="text-[11px] font-mono" style={{ color: building.morale > 0.7 ? "var(--sn-green)" : "var(--sn-warning)" }}>
                  {Math.round(building.morale * 100)}%
                </span>
              </div>
              <Bar pct={building.morale} color={building.morale > 0.7 ? "var(--sn-green)" : "var(--sn-warning)"} />
            </div>
            <div className="card-surface p-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[10.5px] text-muted-foreground uppercase tracking-[0.16em] font-mono">Machines</span>
                <span className="text-[11px] font-mono text-sn-green">{building.machines} / {building.machinesCapacity}</span>
              </div>
              <Bar pct={building.machines / building.machinesCapacity} color="var(--sn-green)" />
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-[10.5px] text-muted-foreground uppercase tracking-[0.16em] font-mono">Condition</span>
                <span className="text-[11px] font-mono" style={{ color: building.machineCondition > 0.7 ? "var(--sn-green)" : "var(--sn-danger)" }}>
                  {Math.round(building.machineCondition * 100)}%
                </span>
              </div>
              <Bar pct={building.machineCondition} color={building.machineCondition > 0.7 ? "var(--sn-green)" : "var(--sn-danger)"} />
            </div>
          </div>
        </section>

        {/* Production lines */}
        <section>
          <div className="label-mono text-[9px] tracking-[0.22em] font-mono uppercase text-muted-foreground mb-2">
            Production Lines
          </div>
          <div className="space-y-1.5">
            {building.lines.map((line) => {
              const pct = line.target > 0 ? line.output / line.target : 0;
              const color = lineStatusColor[line.status];
              return (
                <div key={line.id} className="card-surface px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      <span className="text-[11px] font-medium text-foreground">{line.name}</span>
                    </div>
                    <span
                      className="text-[9px] font-mono uppercase tracking-[0.2em]"
                      style={{ color }}
                    >
                      {line.status}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 text-[10px] font-mono text-muted-foreground">
                    <span style={{ color }} className="font-semibold">{line.output}</span>
                    <span>/ {line.target} u/hr</span>
                    <span className="ml-auto">{Math.round(pct * 100)}%</span>
                  </div>
                  <div className="mt-1">
                    <Bar pct={pct} color={color} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Upgrade card */}
        {building.level < 5 ? (
          <section>
            <div className="label-mono text-[9px] tracking-[0.22em] font-mono uppercase text-muted-foreground mb-2">
              Upgrade Path
            </div>
            <div className="card-surface p-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[13px] font-semibold text-foreground">
                  Level {building.level} → Level {building.level + 1}
                </span>
                <span className="text-[12px] font-mono text-sn-green">{fmt$(nextUpCost)}</span>
              </div>
              <div className="text-[11px] text-muted-foreground leading-snug mb-3">
                +{nextUpGain}% capacity · +18% revenue · +4 machine slots · +80 headcount · 4-day ramp
              </div>
              <ActionButton
                variant="primary"
                disabled={!canUpgrade}
                onClick={() => upgrade(building.id)}
                hint={canUpgrade ? undefined : state.cash < nextUpCost ? "insufficient cash" : undefined}
              >
                <ArrowUp size={13} strokeWidth={2.5} /> Upgrade now
              </ActionButton>
            </div>
          </section>
        ) : (
          <section>
            <div className="card-surface p-3 text-center text-[11px] text-sn-green font-mono">
              MAX LEVEL · FULLY UPGRADED
            </div>
          </section>
        )}

        {/* Operations */}
        <section>
          <div className="label-mono text-[9px] tracking-[0.22em] font-mono uppercase text-muted-foreground mb-2">
            Ops Actions
          </div>
          <div className="space-y-1.5">
            {building.status !== "active" && (
              <ActionButton
                variant="danger"
                disabled={!canRepair}
                onClick={() => repair(building.id)}
                hint="−$420K"
              >
                <Wrench size={13} strokeWidth={2.5} /> Emergency repair
              </ActionButton>
            )}
            <ActionButton
              disabled={!canHire}
              onClick={() => hire(building.id, 10)}
              hint="−$42K"
            >
              <UserPlus size={13} strokeWidth={2.5} /> Hire 10 workers
            </ActionButton>
            <ActionButton
              disabled={!canBuyMachine}
              onClick={() => buyMachine(building.id)}
              hint="−$180K"
            >
              <Plus size={13} strokeWidth={2.5} /> Commission new machine
            </ActionButton>
            <ActionButton disabled>
              <Cog size={13} strokeWidth={2.5} /> Tune production mix
            </ActionButton>
            <ActionButton disabled>
              <Hammer size={13} strokeWidth={2.5} /> Build sub-assembly line
            </ActionButton>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function PlantDetail() {
  const { selectedBuilding, selectBuilding } = useGameState();

  return (
    <>
      {/* Overlay */}
      {selectedBuilding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black pointer-events-auto"
          onClick={() => selectBuilding(null)}
        />
      )}
      {/* Drawer */}
      <motion.aside
        initial={false}
        animate={{ x: selectedBuilding ? 0 : 440 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="fixed top-0 right-0 h-full w-[420px] z-50 border-l border-border shadow-2xl"
        style={{ background: "oklch(0.14 0.02 240)" }}
      >
        {selectedBuilding && <PlantDetailBody building={selectedBuilding} />}
      </motion.aside>
    </>
  );
}
