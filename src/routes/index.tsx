import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import TopBar from "../components/TopBar";
import KPIPanel from "../components/KPIPanel";
import InterPlantSimulation from "../components/InterPlantSimulation";
import NetworkMap from "../components/NetworkMap";
import ChatPanel from "../components/ChatPanel";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Manufacturing Tycoon — Executive Simulation" },
      { name: "description", content: "AI-powered manufacturing simulation for executive what-if scenario planning across a national plant network." },
    ],
  }),
});

type CenterView = "map" | "plant" | "capacity";

function Index() {
  const [simDay, setSimDay] = useState(11);
  const [simHour, setSimHour] = useState(6);
  const [centerView, setCenterView] = useState<CenterView>("map");
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimHour(h => {
        if (h >= 23) {
          setSimDay(d => d + 1);
          return 0;
        }
        return h + 1;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Brand header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-sn-navy border-b border-border">
        <div className="flex items-center gap-3">
          {/* ServiceNow logo mark */}
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--sn-green)" />
            <path d="M16 7C11.03 7 7 11.03 7 16s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 14.4c-2.98 0-5.4-2.42-5.4-5.4S13.02 10.6 16 10.6s5.4 2.42 5.4 5.4-2.42 5.4-5.4 5.4z" fill="var(--sn-navy)" />
          </svg>
          <div>
            <span className="text-xl font-bold text-foreground tracking-tight">Manufacturing Tycoon</span>
            <span className="text-xs text-foreground/90 ml-2 font-semibold">ServiceNow AI Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Scenario label */}
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-foreground">Scenario: Major Plant Outage</span>
            {/* Git branch */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary border border-border">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sn-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
              <span className="text-[10px] font-mono text-primary">extended_downtime</span>
            </div>
          </div>
          <motion.span
            className="flex items-center gap-1 text-[10px] text-muted-foreground"
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            Live
          </motion.span>
        </div>
      </div>

      {/* Top bar with shared sim clock */}
      <TopBar simDay={simDay} simHour={simHour} isPlaying={isPlaying} onTogglePlay={() => setIsPlaying(p => !p)} />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <KPIPanel />

        {/* Center panel with view tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* View tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-1">
            {([
              { key: "map" as CenterView, label: "Network Map", icon: "🌐" },
              { key: "plant" as CenterView, label: "Plant Comparison", icon: "🏭" },
              { key: "capacity" as CenterView, label: "Future Capacity", icon: "📊" },
            ]).map((v) => (
              <button
                key={v.key}
                onClick={() => setCenterView(v.key)}
                className={`px-3 py-1.5 text-[11px] rounded-md font-medium transition-colors ${
                  centerView === v.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          {/* Active view */}
          {centerView === "map" && <NetworkMap simDay={simDay} />}
          {centerView === "plant" && <InterPlantSimulation simDay={simDay} />}
          {centerView === "capacity" && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="card-surface p-6 max-w-xl w-full">
                <div className="text-sm font-semibold text-foreground mb-4">Future Capacity Forecast — Network</div>
                <div className="flex items-end gap-2 h-40">
                  {[72, 68, 74, 71, 78, 82, 80, 85, 83, 88, 90, 92].map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-sm relative overflow-hidden" style={{ height: `${v}%`, background: "var(--sn-green-dim)" }}>
                        <div
                          className="absolute inset-x-0 bottom-0 transition-all duration-500"
                          style={{ background: "var(--sn-green)", height: "100%" }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-between text-[10px] text-muted-foreground">
                  <span>Projected: +12% by Q4</span>
                  <span className="text-primary font-mono">AI Confidence: 87%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <ChatPanel />
      </div>
    </div>
  );
}
