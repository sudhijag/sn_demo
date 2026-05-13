import { motion, AnimatePresence } from "framer-motion";
import { Hammer, X } from "lucide-react";
import { useState } from "react";
import { useGameState } from "@/lib/game-state";
import type { BuildingKind } from "@/lib/buildings";

const KIND_ICON: Record<BuildingKind, string> = {
  factory: "🏭",
  warehouse: "📦",
  hub: "🛰",
  rnd: "🧪",
  store: "🛒",
};

function fmtCost(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

export default function BuildPalette() {
  const { state, catalog, enterBuildMode, exitBuildMode } = useGameState();
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-3 left-3 z-20 flex flex-col items-start gap-2">
      <AnimatePresence>
        {state.buildMode && state.pendingCatalog && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-sn-green/60 text-[10px] font-mono uppercase tracking-[0.16em]"
            style={{ background: "oklch(0.2 0.06 175 / 85%)", color: "var(--sn-green)", backdropFilter: "blur(8px)" }}
          >
            <span className="w-2 h-2 rounded-full bg-sn-green pulse-dot" />
            CLICK MAP TO PLACE {state.pendingCatalog.toUpperCase()}
            <button
              onClick={exitBuildMode}
              className="ml-2 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X size={10} /> cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="card-surface p-3 w-[340px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-muted-foreground">Build Catalog</span>
              <span className="text-[10px] font-mono text-sn-green">
                Cash: {state.cash >= 1_000_000 ? `$${(state.cash / 1_000_000).toFixed(2)}M` : `$${(state.cash / 1000).toFixed(0)}K`}
              </span>
            </div>
            <div className="space-y-1.5">
              {catalog.map((item) => {
                const affordable = state.cash >= item.cost;
                return (
                  <button
                    key={item.kind}
                    disabled={!affordable}
                    onClick={() => {
                      enterBuildMode(item.kind);
                      setOpen(false);
                    }}
                    className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-md border border-border hover:border-sn-green/60 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {KIND_ICON[item.kind]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] font-semibold text-foreground">{item.label}</span>
                        <span className="text-[11px] font-mono text-sn-green">{fmtCost(item.cost)}</span>
                      </div>
                      <div className="text-[10.5px] text-muted-foreground leading-snug">{item.description}</div>
                      <div className="mt-1 flex items-center gap-2 text-[9.5px] font-mono text-muted-foreground">
                        <span>+{fmtCost(item.revenuePerHr)}/hr</span>
                        <span>·</span>
                        <span>upkeep {fmtCost(item.upkeepPerHr)}/hr</span>
                        <span>·</span>
                        <span>{item.workers}w · {item.machines}m</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-sn-green/60 text-[11px] font-mono uppercase tracking-[0.16em] hover:bg-secondary transition-colors"
        style={{ background: open ? "oklch(0.2 0.06 175 / 70%)" : "oklch(0.16 0.02 240)", color: "var(--sn-green)" }}
      >
        <Hammer size={13} strokeWidth={2.3} />
        {open ? "Close Build" : "Build Mode"}
      </button>
    </div>
  );
}
