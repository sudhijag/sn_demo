import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type LineStatus = "active" | "warning" | "bottleneck" | "alert" | "down";
type PlantLine = { id: string; label: string; util: number; status: LineStatus };

const plant1Lines: PlantLine[] = [
  { id: "p1-l1", label: "CNC Cell A", util: 94, status: "active" },
  { id: "p1-l2", label: "CNC Cell B", util: 88, status: "active" },
  { id: "p1-l3", label: "Line 3 Sub-Assy", util: 42, status: "bottleneck" },
  { id: "p1-l4", label: "QC Station", util: 76, status: "warning" },
  { id: "p1-out", label: "Sub-Assy Output", util: 58, status: "warning" },
];

const plant2Lines: PlantLine[] = [
  { id: "p2-in", label: "Input Buffer", util: 34, status: "alert" },
  { id: "p2-l1", label: "Press 1", util: 91, status: "active" },
  { id: "p2-l2", label: "Press 2", util: 87, status: "active" },
  { id: "p2-l3", label: "Final Assembly", util: 65, status: "warning" },
  { id: "p2-l4", label: "Press 4", util: 0, status: "down" },
];

const statusColor: Record<string, string> = {
  active: "var(--sn-green)",
  warning: "var(--sn-warning)",
  bottleneck: "var(--sn-danger)",
  alert: "var(--sn-danger)",
  down: "oklch(0.4 0.02 240)",
};

function UtilBar({ util, status }: { util: number; status: string }) {
  const color = statusColor[status];
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--sn-surface)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${util}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
}

function PlantSchematic({ name, subtitle, lines, side }: {
  name: string; subtitle: string; lines: PlantLine[]; side: "left" | "right";
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{name}</h3>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full pulse-dot" style={{
            backgroundColor: lines.some(l => l.status === "bottleneck" || l.status === "down") ? "var(--sn-danger)" : "var(--sn-green)"
          }} />
          <span className="text-[10px] font-mono text-muted-foreground">
            {Math.round(lines.reduce((a, l) => a + l.util, 0) / lines.length)}% avg
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {lines.map((line, i) => (
          <motion.div
            key={line.id}
            initial={{ opacity: 0, x: side === "left" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`card-surface px-3 py-2 relative overflow-hidden ${
              line.status === "bottleneck" || line.status === "down" ? "border-sn-danger/50" : ""
            }`}
          >
            {line.status === "bottleneck" && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{ background: "var(--sn-danger)" }}
                animate={{ opacity: [0.03, 0.08, 0.03] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor[line.status] }} />
                <span className="text-[11px] font-medium text-foreground">{line.label}</span>
              </div>
              <span className={`text-[11px] font-mono font-bold ${
                line.status === "down" ? "text-muted-foreground" : ""
              }`} style={{ color: line.status !== "down" ? statusColor[line.status] : undefined }}>
                {line.status === "down" ? "DOWN" : `${line.util}%`}
              </span>
            </div>
            <div className="mt-1.5 relative z-10">
              <UtilBar util={line.util} status={line.status} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FlowingUnits({ linkHealth }: { linkHealth: number }) {
  const unitCount = Math.max(1, Math.floor(linkHealth / 25));
  return (
    <div className="relative h-full flex flex-col items-center justify-center">
      <div className="relative w-px flex-1 mx-auto overflow-hidden" style={{ minHeight: 60 }}>
        <div className="absolute inset-0 w-px mx-auto" style={{
          background: `linear-gradient(to bottom, var(--sn-green-dim), oklch(0.75 0.14 175 / ${linkHealth}%), var(--sn-green-dim))`,
        }} />
        {Array.from({ length: unitCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{
              background: "var(--sn-green)",
              boxShadow: "0 0 6px var(--sn-green-glow)",
              border: "1px solid oklch(0.85 0.14 175)"
            }}
            animate={{ top: ["-5%", "105%"] }}
            transition={{ repeat: Infinity, duration: 2 + i * 0.5, delay: i * 0.6, ease: "linear" }}
          />
        ))}
      </div>
    </div>
  );
}

export default function InterPlantSimulation({ simDay }: { simDay: number }) {
  const [linkHealth, setLinkHealth] = useState(58);

  useEffect(() => {
    const interval = setInterval(() => {
      setLinkHealth(h => {
        const delta = (Math.random() - 0.55) * 8;
        return Math.max(20, Math.min(80, h + delta));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Operational</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sn-warning" /> Warning</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sn-danger" /> Bottleneck</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "oklch(0.4 0.02 240)" }} /> Down</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-stretch p-6 pt-10 overflow-hidden gap-4">
        <PlantSchematic name="Plant 1: Austin" subtitle="Sub-Assembly Production" lines={plant1Lines} side="left" />

        {/* Inter-Plant Link */}
        <div className="flex flex-col items-center w-28 flex-shrink-0">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground text-center mb-2 font-medium">
            Inter-Plant Link
          </div>
          <div className="card-surface px-2 py-1.5 mb-2 text-center glow-green-sm">
            <div className="text-[10px] text-muted-foreground">Throughput</div>
            <motion.div
              className="text-sm font-mono font-bold"
              style={{ color: linkHealth > 50 ? "var(--sn-green)" : linkHealth > 30 ? "var(--sn-warning)" : "var(--sn-danger)" }}
              key={Math.round(linkHealth)}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {Math.round(linkHealth)}%
            </motion.div>
          </div>
          <div className="flex-1 relative w-full">
            <FlowingUnits linkHealth={linkHealth} />
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{
                border: `1px solid oklch(0.75 0.14 175 / ${linkHealth * 0.4}%)`,
                boxShadow: `0 0 ${linkHealth * 0.3}px var(--sn-green-dim)`,
              }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />
          </div>
          <div className="mt-2 text-center">
            <div className="text-[9px] text-muted-foreground">Units in Transit</div>
            <div className="text-xs font-mono text-primary font-bold">{Math.round(linkHealth * 2.4)}</div>
          </div>
        </div>

        <PlantSchematic name="Plant 2: Detroit" subtitle="Final Assembly" lines={plant2Lines} side="right" />
      </div>

      {/* Bottom stats bar */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-border text-[10px] font-mono text-muted-foreground">
        <span>2 Plants Active • 10 Lines Monitored • 1 Line Down</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
          Cascading Sim Active — Day {simDay}
        </span>
        <span>Inter-Plant Link: {Math.round(linkHealth)}% throughput</span>
      </div>
    </div>
  );
}
