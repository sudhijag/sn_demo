import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Network, ShieldPlus, Users, Truck } from "lucide-react";
import { useGameState } from "@/lib/game-state";
import { formatInvestmentCost, type InvestmentTrack } from "@/lib/scenario";

const TRACK_META: Record<InvestmentTrack, { label: string; icon: ReactNode }> = {
  logistics: { label: "Logistics", icon: <Truck size={14} /> },
  labor: { label: "Labor", icon: <Users size={14} /> },
  resilience: { label: "Resilience", icon: <ShieldPlus size={14} /> },
  sourcing: { label: "Sourcing", icon: <Network size={14} /> },
};

function TreeNode({
  label,
  description,
  cost,
  purchased,
  available,
  locked,
  onClick,
}: {
  label: string;
  description: string;
  cost: number;
  purchased: boolean;
  available: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const shortDescription = description.length > 72 ? `${description.slice(0, 69).trimEnd()}...` : description;

  return (
    <button
      onClick={onClick}
      disabled={purchased || !available}
      className={`relative w-[13rem] rounded-2xl border px-3 py-3 text-left transition-colors ${
        purchased
          ? "border-primary/50 bg-primary/10"
          : available
            ? "border-border bg-background/75 hover:border-primary/50 hover:bg-primary/5"
            : locked
              ? "border-border/60 bg-background/30 opacity-80"
              : "border-border/60 bg-background/30 opacity-65"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[13px] font-semibold leading-tight text-foreground">{label}</div>
        <div className="text-[10px] font-mono text-primary">{formatInvestmentCost(cost)}</div>
      </div>
      <div className="mt-2 text-[12px] leading-snug text-muted-foreground">{shortDescription}</div>
      <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.12em]">
        <span className={purchased ? "text-primary" : !available && !locked ? "text-sn-danger" : "text-muted-foreground"}>
          {purchased ? "Funded" : available ? "" : locked ? "" : "Need cash"}
        </span>
        {locked && <Lock size={12} className="text-sn-warning" />}
      </div>
    </button>
  );
}

export default function CapitalTree() {
  const { state, investments, purchaseInvestment } = useGameState();
  const [open, setOpen] = useState(false);

  const grouped = useMemo(
    () =>
      Object.entries(TRACK_META).map(([track, meta]) => {
        const nodes = investments.filter((investment) => investment.track === track);
        return {
          track: track as InvestmentTrack,
          ...meta,
          tierOne: nodes.find((node) => node.tier === 1)!,
          tierTwo: nodes.find((node) => node.tier === 2)!,
        };
      }),
    [investments],
  );

  return (
    <div className="absolute bottom-3 left-40 z-20 flex flex-col items-start gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="w-[32rem] rounded-[1.6rem] border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">Investment Tree</div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-right">
                <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-primary/80">Remaining Pool</div>
                <div className="mt-1 text-lg font-mono font-semibold text-primary">{formatInvestmentCost(state.availableCapital)}</div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {grouped.map((group) => (
                <div key={group.track} className="rounded-2xl border border-border bg-secondary/18 px-3 py-3">
                  <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                    <span className="text-primary">{group.icon}</span>
                    {group.label}
                  </div>
                  <div className="relative flex items-center justify-between gap-3">
                    <TreeNode
                      {...group.tierOne}
                      onClick={() => purchaseInvestment(group.tierOne.id)}
                    />
                    <div className="pointer-events-none absolute left-[13rem] right-[13rem] top-1/2 h-[2px] -translate-y-1/2 bg-border">
                      <div
                        className={`h-full ${group.tierOne.purchased ? "bg-primary" : "bg-border"}`}
                        style={{ width: group.tierTwo.purchased || group.tierTwo.available ? "100%" : "55%" }}
                      />
                    </div>
                    <TreeNode
                      {...group.tierTwo}
                      onClick={() => purchaseInvestment(group.tierTwo.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-md border border-primary/50 bg-card/95 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.16em] text-primary shadow-lg backdrop-blur-sm transition-colors hover:bg-card"
      >
        <Network size={13} strokeWidth={2.2} />
        {open ? "Close Investments" : "Investment Tree"}
      </button>
    </div>
  );
}
