import { useState } from "react";
import { motion } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import { BASELINE_ASSUMPTIONS, getChangedAssumptions } from "@/lib/scenario";

function OptionPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[10px] font-mono transition-colors ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export default function KPIPanel() {
  const { state, updateAssumption } = useGameState();
  const changes = getChangedAssumptions(state.assumptions);
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute left-3 top-3 z-20">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-md border border-border bg-card/90 px-3 py-2 text-[11px] font-medium text-foreground shadow-lg backdrop-blur-sm transition-colors hover:bg-card"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18" />
          <path d="M3 12h18" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Assumptions
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="mt-2 w-[21rem] rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Scenario Inputs</div>
              <div className="mt-1 text-sm font-semibold text-foreground">Assumptions Control Panel</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-4 text-[11px]">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">Outage duration</span>
                <span className="font-mono text-foreground">{state.assumptions.outageDurationDays}d</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 21, 28].map((days) => (
                  <OptionPill
                    key={days}
                    active={state.assumptions.outageDurationDays === days}
                    label={`${days}d`}
                    onClick={() => updateAssumption("outageDurationDays", days)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">Spare capacity</span>
                <span className="font-mono text-foreground">{state.assumptions.spareCapacityPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={40}
                step={2}
                value={state.assumptions.spareCapacityPct}
                onChange={(event) => updateAssumption("spareCapacityPct", Number(event.target.value))}
                className="w-full accent-[var(--sn-green)]"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">Labor availability</span>
                <span className="font-mono text-foreground">{state.assumptions.laborAvailabilityPct}%</span>
              </div>
              <input
                type="range"
                min={70}
                max={100}
                step={1}
                value={state.assumptions.laborAvailabilityPct}
                onChange={(event) => updateAssumption("laborAvailabilityPct", Number(event.target.value))}
                className="w-full accent-[var(--sn-green)]"
              />
            </div>

            <div>
              <div className="mb-2 text-muted-foreground">Freight mode</div>
              <div className="flex gap-2">
                <OptionPill
                  active={state.assumptions.freightMode === "standard"}
                  label="Standard"
                  onClick={() => updateAssumption("freightMode", "standard")}
                />
                <OptionPill
                  active={state.assumptions.freightMode === "expedited"}
                  label="Expedited"
                  onClick={() => updateAssumption("freightMode", "expedited")}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground">Supplier lead time</span>
                <span className="font-mono text-foreground">{state.assumptions.supplierLeadTimeDays}d</span>
              </div>
              <input
                type="range"
                min={5}
                max={18}
                step={1}
                value={state.assumptions.supplierLeadTimeDays}
                onChange={(event) => updateAssumption("supplierLeadTimeDays", Number(event.target.value))}
                className="w-full accent-[var(--sn-green)]"
              />
            </div>

            <div>
              <div className="mb-2 text-muted-foreground">Decision priority</div>
              <div className="flex flex-wrap gap-2">
                <OptionPill
                  active={state.assumptions.serviceLevelPriority === "margin"}
                  label="Margin"
                  onClick={() => updateAssumption("serviceLevelPriority", "margin")}
                />
                <OptionPill
                  active={state.assumptions.serviceLevelPriority === "balanced"}
                  label="Balanced"
                  onClick={() => updateAssumption("serviceLevelPriority", "balanced")}
                />
                <OptionPill
                  active={state.assumptions.serviceLevelPriority === "service"}
                  label="Service"
                  onClick={() => updateAssumption("serviceLevelPriority", "service")}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-muted-foreground">SKU focus</div>
              <div className="flex flex-wrap gap-2">
                <OptionPill
                  active={state.assumptions.skuPriority === "all"}
                  label="All"
                  onClick={() => updateAssumption("skuPriority", "all")}
                />
                <OptionPill
                  active={state.assumptions.skuPriority === "high_margin"}
                  label="High margin"
                  onClick={() => updateAssumption("skuPriority", "high_margin")}
                />
                <OptionPill
                  active={state.assumptions.skuPriority === "strategic"}
                  label="Strategic"
                  onClick={() => updateAssumption("skuPriority", "strategic")}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/70 bg-secondary/30 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Delta From Baseline</div>
            <div className="mt-2 space-y-1.5">
              {changes.length > 0 ? (
                changes.map((change) => (
                  <div key={change} className="text-[10px] leading-tight text-primary">
                    {change}
                  </div>
                ))
              ) : (
                <div className="text-[10px] leading-tight text-muted-foreground">
                  Matching baseline assumptions: {BASELINE_ASSUMPTIONS.outageDurationDays}d outage, {BASELINE_ASSUMPTIONS.spareCapacityPct}% spare capacity.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
