import { motion } from "framer-motion";

const kpis = [
  { label: "Network OEE", value: "78.4%", trend: "-3.2%", up: false },
  { label: "Network Throughput", value: "9.8K u/hr", trend: "-18%", up: false },
  { label: "Plant-to-Plant WIP", value: "1,240", trend: "+380", up: false },
  { label: "Network Cycle Time", value: "6.8d", trend: "+2.1d", up: false },
  { label: "Inventory $", value: "$32.1M", trend: "Stable", up: true },
  { label: "Energy (kWh)", value: "892K", trend: "-2.1%", up: true },
];

const alerts = [
  { text: "P1-Line 3: Yield drop — Sensor Calibration Error", severity: "danger" as const, time: "2m ago" },
  { text: "P2-Press 4: Unplanned downtime — Hydraulic Leak", severity: "danger" as const, time: "14m ago" },
  { text: "P1-CNC Cell B: Vibration anomaly — within tolerance", severity: "ok" as const, time: "22m ago" },
  { text: "P3-Line 1: Throughput recovery confirmed", severity: "ok" as const, time: "35m ago" },
];

export default function KPIPanel() {
  return (
    <div className="w-56 flex flex-col gap-3 p-3 border-r border-border overflow-y-auto">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Client KPIs</div>

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
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-sm font-mono font-bold text-foreground">{kpi.value}</span>
              <span className={`text-[10px] font-mono ${kpi.up ? "text-primary" : "text-sn-danger"}`}>
                {kpi.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Separator */}
      <div className="h-px bg-border/50 my-3" />

      {/* System Alerts */}
      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">
          System Alerts
        </div>
        {alerts.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className={`flex items-start gap-2 px-2 py-1.5 rounded-md mb-1.5 text-[11px] ${
              a.severity === "danger"
                ? "bg-sn-danger/10 text-sn-danger"
                : a.severity === "ok"
                  ? "bg-primary/10 text-primary"
                  : "bg-sn-warning/10 text-sn-warning"
            }`}
          >
            <span className="pulse-dot mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
              backgroundColor: a.severity === "danger" ? "var(--sn-danger)" : a.severity === "ok" ? "var(--sn-green)" : "var(--sn-warning)"
            }} />
            <div className="flex-1 min-w-0">
              <div className="leading-tight">{a.text}</div>
              <div className="text-[9px] opacity-60 mt-0.5">{a.time}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Scenario params */}
      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Active Scenario</div>
        <div className="card-surface px-3 py-2 space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Type</span>
            <span className="font-mono text-sn-danger font-bold">Equipment Failure</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Severity</span>
            <span className="font-mono text-sn-danger">Critical</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Affected</span>
            <span className="font-mono text-foreground">P1-L3, P2-Press4</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">AI Mode</span>
            <span className="font-mono text-primary">Active Reroute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
