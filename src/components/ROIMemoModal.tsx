import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./chart";
import { useGameState } from "@/lib/game-state";

type MetricKey = "profitPerHr" | "downtimePct" | "throughputUnits";

const chartConfig = {
  profitPerHr: { label: "Profit / hr", color: "var(--sn-green)" },
  downtimePct: { label: "Downtime %", color: "var(--sn-danger)" },
  throughputUnits: { label: "Throughput", color: "oklch(0.73 0.12 195)" },
} satisfies ChartConfig;

function formatCurrency(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

function metricValue(metric: MetricKey, value: number) {
  if (metric === "profitPerHr") return formatCurrency(value);
  if (metric === "downtimePct") return `${value.toFixed(1)}%`;
  return `${Math.round(value).toLocaleString()} units`;
}

function metricTone(metric: MetricKey, change: number) {
  if (Math.abs(change) < 0.05) return "text-muted-foreground";
  if (metric === "downtimePct") return change <= 0 ? "text-primary" : "text-sn-danger";
  return change >= 0 ? "text-primary" : "text-sn-danger";
}

export default function ROIMemoModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { state } = useGameState();
  const [activeMetric, setActiveMetric] = useState<MetricKey>("profitPerHr");

  const chartData = useMemo(
    () => state.history.map((snapshot) => ({ ...snapshot, label: `T${snapshot.tick}` })),
    [state.history],
  );

  const latest = chartData[chartData.length - 1];
  const baseline = chartData[0];
  const activePoint = latest ?? baseline;

  const metricSummary = useMemo(() => {
    const buildSummary = (metric: MetricKey) => {
      const values = chartData.map((point) => point[metric]);
      const current = activePoint?.[metric] ?? 0;
      const start = baseline?.[metric] ?? 0;
      const best = metric === "downtimePct" ? Math.min(...values) : Math.max(...values);
      const worst = metric === "downtimePct" ? Math.max(...values) : Math.min(...values);
      return {
        current,
        change: current - start,
        best,
        worst,
      };
    };

    return {
      profitPerHr: buildSummary("profitPerHr"),
      downtimePct: buildSummary("downtimePct"),
      throughputUnits: buildSummary("throughputUnits"),
    };
  }, [activePoint, baseline, chartData]);

  const activeSummary = metricSummary[activeMetric];

  const phaseSummary = useMemo(() => {
    const grouped = new Map<string, { profit: number; downtime: number; throughput: number; count: number }>();
    for (const point of chartData) {
      const current = grouped.get(point.phase) ?? { profit: 0, downtime: 0, throughput: 0, count: 0 };
      current.profit += point.profitPerHr;
      current.downtime += point.downtimePct;
      current.throughput += point.throughputUnits;
      current.count += 1;
      grouped.set(point.phase, current);
    }

    return Array.from(grouped.entries()).map(([phase, values]) => ({
      phase,
      profit: values.profit / values.count,
      downtime: values.downtime / values.count,
      throughput: values.throughput / values.count,
    }));
  }, [chartData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[78rem] border-border bg-card p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="text-xl text-foreground">ROI Memo</DialogTitle>
          <DialogDescription>
            Live simulation memo with tick-by-tick profit, downtime, and throughput. Export currently downloads a blank sheet stub.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[1.55fr_0.95fr] gap-0">
          <div className="border-r border-border px-6 py-5">
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "profitPerHr", label: "Profit / hr" },
                { key: "downtimePct", label: "Downtime" },
                { key: "throughputUnits", label: "Throughput" },
              ] as Array<{ key: MetricKey; label: string }>).map((metric) => (
                <button
                  key={metric.key}
                  onClick={() => setActiveMetric(metric.key)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    activeMetric === metric.key ? "border-primary bg-primary/8" : "border-border bg-secondary/35 hover:bg-secondary/55"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</div>
                  <div className="mt-2 text-lg font-mono text-foreground">{metricValue(metric.key, metricSummary[metric.key].current)}</div>
                  <div className={`mt-1 text-[11px] font-mono ${metricTone(metric.key, metricSummary[metric.key].change)}`}>
                    vs T0 {metricValue(metric.key, metricSummary[metric.key].change)}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Profit trajectory</div>
                    <div className="text-[11px] text-muted-foreground">Actual network profit per simulated hour</div>
                  </div>
                  <div className="text-sm font-mono text-foreground">{latest ? metricValue("profitPerHr", latest.profitPerHr) : "$0"}</div>
                </div>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <AreaChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} width={78} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Area type="monotone" dataKey="profitPerHr" stroke="var(--color-profitPerHr)" fill="var(--color-profitPerHr)" fillOpacity={0.2} strokeWidth={2.4} />
                  </AreaChart>
                </ChartContainer>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Downtime exposure</div>
                    <div className="text-[11px] text-muted-foreground">Share of disrupted lines by tick</div>
                  </div>
                  <div className="text-sm font-mono text-foreground">{latest ? metricValue("downtimePct", latest.downtimePct) : "0.0%"}</div>
                </div>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <LineChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} width={62} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)}%`} />} />
                    <Line type="monotone" dataKey="downtimePct" stroke="var(--color-downtimePct)" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ChartContainer>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Throughput output</div>
                    <div className="text-[11px] text-muted-foreground">Aggregate line output tied to the live building state</div>
                  </div>
                  <div className="text-sm font-mono text-foreground">{latest ? metricValue("throughputUnits", latest.throughputUnits) : "0 units"}</div>
                </div>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <AreaChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value)}`} width={62} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Math.round(Number(value)).toLocaleString()} units`} />} />
                    <Area type="monotone" dataKey="throughputUnits" stroke="var(--color-throughputUnits)" fill="var(--color-throughputUnits)" fillOpacity={0.18} strokeWidth={2.4} />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="rounded-2xl border border-border bg-secondary/25 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Drill Down</div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {activeMetric === "profitPerHr" ? "Profit / hr" : activeMetric === "downtimePct" ? "Downtime %" : "Throughput"}
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {activeMetric === "profitPerHr"
                  ? "Tracks live network profit using simulation revenue minus upkeep at every tick."
                  : activeMetric === "downtimePct"
                    ? "Measures the share of lines currently in bottleneck, idle, or maintenance states."
                    : "Sums current line output across the network to show production recovery over time."}
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-mono text-foreground">{metricValue(activeMetric, activeSummary.current)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Best seen</span>
                  <span className="font-mono text-foreground">{metricValue(activeMetric, activeSummary.best)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Worst seen</span>
                  <span className="font-mono text-foreground">{metricValue(activeMetric, activeSummary.worst)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cash now</span>
                  <span className="font-mono text-foreground">{latest ? formatCurrency(latest.cash) : "$0"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-secondary/25 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Phase Averages</div>
              <div className="mt-3 space-y-3">
                {phaseSummary.map((phase) => (
                  <div key={phase.phase} className="rounded-xl border border-border/70 bg-background/45 px-3 py-2">
                    <div className="text-[11px] font-semibold capitalize text-foreground">{phase.phase}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Profit</span>
                      <span className="font-mono text-foreground">{formatCurrency(phase.profit)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Downtime</span>
                      <span className="font-mono text-foreground">{phase.downtime.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Throughput</span>
                      <span className="font-mono text-foreground">{Math.round(phase.throughput).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
