import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import { formatMillions } from "@/lib/scenario";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function countUp(target: number, progress: number) {
  return target * progress;
}

function seededBadgeDeck(score: number) {
  if (score >= 92) return ["Service Shield", "Flow Master", "CC Closer"];
  if (score >= 88) return ["Fast Hands", "Margin Minder", "Queue Tamer"];
  if (score >= 84) return ["Reroute Runner", "Calm Under Fire", "Ops Relay"];
  return ["Steady Nerve", "Incident Survivor", "Recovery Push"];
}

function buildMockEntries(player: {
  initials: string;
  score: number;
  revenueSaved: number;
  recoveryGain: number;
  serviceLift: number;
  badges: string[];
}) {
  const seeded = [
    { initials: "KJ", score: 94, revenueSaved: 1_600_000, recoveryGain: 2.7, serviceLift: 3.4, badges: ["Service Shield", "No-Panic Win"] },
    { initials: "AL", score: 91, revenueSaved: 1_300_000, recoveryGain: 2.1, serviceLift: 2.8, badges: ["Flow Master", "Rapid Recovery"] },
    { initials: "MR", score: 87, revenueSaved: 980_000, recoveryGain: 1.8, serviceLift: 2.1, badges: ["Lane Whisperer", "Ops Relay"] },
    { initials: "ST", score: 84, revenueSaved: 760_000, recoveryGain: 1.2, serviceLift: 1.7, badges: ["Freight Fox", "Steady Nerve"] },
  ];

  const withPlayer = [...seeded, player]
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1, isPlayer: entry.initials === player.initials }));

  return withPlayer;
}

function MetricCount({
  label,
  value,
  suffix = "",
  decimals = 1,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const next = clamp((now - start) / 1500, 0, 1);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <div className="rounded-2xl border border-border bg-black/20 px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-mono font-semibold text-primary">
        {countUp(value, progress).toFixed(decimals)}
        {suffix}
      </div>
    </div>
  );
}

export default function EndgameLeaderboard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { scenarios, currentScenario, state } = useGameState();
  const baseline = scenarios.baseline;

  const revenueSaved = Math.max(0, currentScenario.outcome.revenueDelta - baseline.outcome.revenueDelta);
  const recoveryGain = Math.max(0, baseline.outcome.recoveryDays - currentScenario.outcome.recoveryDays);
  const serviceLift = Math.max(0, currentScenario.outcome.serviceLevelPct - baseline.outcome.serviceLevelPct);
  const score = clamp(
    Math.round(78 + revenueSaved / 150_000 + recoveryGain * 3.5 + serviceLift * 2.4 + (currentScenario.mode === "ai" ? 6 : 2)),
    80,
    98,
  );
  const playerBadges = seededBadgeDeck(score);
  const leaderboard = useMemo(
    () =>
      buildMockEntries({
        initials: "YOU",
        score,
        revenueSaved,
        recoveryGain,
        serviceLift,
        badges: playerBadges,
      }),
    [playerBadges, recoveryGain, revenueSaved, score, serviceLift],
  );
  const accomplishments = [
    `${state.activeScenarioMode === "ai" ? "Command Center edge" : "Manual control"} locked by steady state`,
    `${playerBadges[0]} earned on final response package`,
    `${Math.round(currentScenario.outcome.confidencePct)}% confidence closeout`,
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(136,255,102,0.14),_rgba(2,6,23,0.95)_48%)] px-6 py-8 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-primary/20 bg-[#04110b]/95 shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
          >
            <div className="border-b border-primary/10 bg-[linear-gradient(120deg,rgba(120,255,92,0.14),rgba(4,17,11,0.4)_52%,rgba(255,255,255,0.02))] px-8 py-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-primary/80">Simulation Complete</div>
                  <div className="mt-2 text-4xl font-semibold tracking-tight text-foreground">Command Center Leaderboard</div>
                  <div className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Final standings, badges, and closeout metrics from the Dallas recovery run.
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-border bg-secondary/70 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Keep exploring
                </button>
              </div>
            </div>

            <div className="grid gap-6 px-8 py-7 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCount label="Revenue Saved" value={revenueSaved / 1_000_000} suffix="M" />
                  <MetricCount label="Recovery Gained" value={recoveryGain} suffix="d" />
                  <MetricCount label="Service Lift" value={serviceLift} suffix=" pts" />
                </div>

                <div className="rounded-2xl border border-border bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Standings</div>
                    <div className="text-[11px] font-mono text-primary">{currentScenario.label}</div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {leaderboard.map((entry) => (
                      <div
                        key={entry.initials}
                        className={`grid grid-cols-[0.5fr_0.8fr_1fr_1.1fr] items-center gap-3 rounded-xl border px-4 py-3 ${
                          entry.isPlayer
                            ? "border-primary/40 bg-primary/10 shadow-[0_0_0_1px_rgba(120,255,92,0.08)]"
                            : "border-border bg-black/10"
                        }`}
                      >
                        <div className="text-lg font-mono text-muted-foreground">#{entry.rank}</div>
                        <div className="text-xl font-mono font-semibold text-foreground">{entry.initials}</div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">{entry.score} pts</div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatMillions(entry.revenueSaved)} saved · +{entry.serviceLift.toFixed(1)} pts service
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-start gap-1.5">
                          {entry.badges.slice(0, 2).map((badge) => (
                            <span
                              key={badge}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                                entry.isPlayer ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-primary/20 bg-primary/8 p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-primary/80">Your Run</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">{score} pts · Rank #{leaderboard.find((entry) => entry.isPlayer)?.rank}</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {currentScenario.mode === "manual" ? "Response" : currentScenario.label} closed the incident with {currentScenario.outcome.serviceLevelPct.toFixed(1)}% service and recovery in{" "}
                    {currentScenario.outcome.recoveryDays.toFixed(1)} days.
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-black/20 p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Badges & Accomplishments</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {playerBadges.map((badge) => (
                      <span key={badge} className="rounded-full border border-primary/30 bg-primary/12 px-3 py-1.5 text-[11px] font-medium text-primary">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {accomplishments.map((item) => (
                      <div key={item} className="rounded-xl bg-secondary/40 px-3 py-2 text-[11px] text-foreground">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-black/20 p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Final Metrics</div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Revenue impact</span>
                      <span className="font-mono text-foreground">{formatMillions(currentScenario.outcome.revenueDelta)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Recovery time</span>
                      <span className="font-mono text-foreground">{currentScenario.outcome.recoveryDays.toFixed(1)}d</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Service level</span>
                      <span className="font-mono text-foreground">{currentScenario.outcome.serviceLevelPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
