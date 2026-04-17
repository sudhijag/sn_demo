import { useState } from "react";
import { motion } from "framer-motion";

const timelinePoints = [
  { label: "Baseline Set", time: "T0", active: false, done: true, star: true },
  { label: "Equipment Failure", time: "T1", active: false, done: true, star: true },
  { label: "AI Reroute", time: "T2", active: true, done: false, star: true },
  { label: "Recovery", time: "T3", active: false, done: false, star: false },
  { label: "Steady State", time: "T4", active: false, done: false, star: false },
];

const plMetrics = [
  { label: "Revenue Impact", baseline: "-$4.2M", ai: "-$1.1M", delta: "+$3.1M", positive: true },
  { label: "Downtime (hrs)", baseline: "142", ai: "38", delta: "-73%", positive: true },
  { label: "Network ROI", baseline: "—", ai: "312%", delta: "", positive: true },
];

export default function TopBar({ simDay, simHour, isPlaying, onTogglePlay }: { simDay: number; simHour: number; isPlaying: boolean; onTogglePlay: () => void }) {
  return (
    <div className="flex items-center gap-6 px-5 py-3 border-b border-border bg-card/60 backdrop-blur-sm">
      {/* Simulation Clock */}
      <div className="flex flex-col items-center pr-5 border-r border-border">
        <motion.div
          className="text-lg font-mono font-bold text-primary text-glow tabular-nums"
          key={`${simDay}-${simHour}`}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
        >
          DAY {simDay}, {String(simHour).padStart(2, "0")}:00
        </motion.div>
      </div>

      {/* Play/Pause + Scenario timeline with stars */}
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

        {/* Timeline track wrapped in elongated oval */}
        <div className="flex items-center gap-0 flex-1 min-w-0 px-4 py-2 rounded-full border border-border/50 bg-secondary/30 relative">
          {/* Progress line background */}
          <div className="absolute left-4 right-4 h-0.5 bg-border" style={{ top: 'calc(50% - 10px)' }} />
          {/* Progress line filled portion */}
          <div
            className="absolute left-4 h-0.5 bg-primary/60 transition-all duration-500"
            style={{
              top: 'calc(50% - 10px)',
              width: `calc(${(timelinePoints.findIndex(p => p.active) / (timelinePoints.length - 1)) * 100}% - 0.5rem)`
            }}
          />

          <div className="flex items-center justify-between flex-1 relative z-10">
            {timelinePoints.map((pt, i) => (
              <div key={pt.time} className="flex flex-col items-center gap-0.5 relative">
                {/* Star for decision points */}
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
                <span className={`text-[9px] font-mono whitespace-nowrap ${pt.active ? "text-primary text-glow" : "text-muted-foreground"}`}>
                  {pt.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* P&L comparison */}
      <div className="flex items-center gap-4 border-l border-border pl-5">
        {plMetrics.map((m) => (
          <div key={m.label} className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-muted-foreground">{m.baseline}</span>
              <span className="text-[10px] text-muted-foreground">→</span>
              <span className="text-xs font-mono text-primary">{m.ai}</span>
              {m.delta && (
                <span className={`text-[10px] font-mono font-bold ${m.positive ? "text-primary" : "text-sn-danger"}`}>
                  {m.delta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Export */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-sn-surface-hover text-xs font-medium text-foreground transition-colors border border-border">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
      </button>
    </div>
  );
}
