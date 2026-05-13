import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { geoAlbers } from "d3-geo";
import { useGameState } from "@/lib/game-state";
import type { Building, BuildingKind, PlantStatus } from "@/lib/buildings";

// Secondary distribution centers / warehouses (real cities, decorative)
const secondaryLocations: [number, number][] = [
  [-104.9903, 39.7392], // Denver
  [-97.5164, 35.4676],  // Oklahoma City
  [-90.0490, 35.1495],  // Memphis
  [-86.7816, 36.1627],  // Nashville
  [-93.2650, 44.9778],  // Minneapolis
  [-94.5786, 39.0997],  // Kansas City
  [-95.3698, 29.7604],  // Houston
  [-98.4936, 29.4241],  // San Antonio
  [-81.6557, 30.3322],  // Jacksonville
  [-80.1918, 25.7617],  // Miami
  [-78.6382, 35.7796],  // Raleigh
  [-80.8431, 35.2271],  // Charlotte
  [-77.0369, 38.9072],  // DC
  [-71.0589, 42.3601],  // Boston
  [-79.9959, 40.4406],  // Pittsburgh
  [-81.6944, 41.4993],  // Cleveland
  [-86.1581, 39.7684],  // Indianapolis
  [-90.1994, 38.6270],  // St. Louis
  [-106.4850, 31.7619], // El Paso
  [-111.8910, 40.7608], // Salt Lake City
  [-115.1398, 36.1699], // Las Vegas
  [-117.1611, 32.7157], // San Diego
  [-121.4944, 38.5816], // Sacramento
  [-122.6765, 45.5152], // Portland
  [-116.2023, 43.6150], // Boise
  [-100.4459, 46.8083], // Bismarck
  [-92.2896, 34.7465],  // Little Rock
  [-86.9023, 32.3792],  // Montgomery
  [-89.3985, 43.0731],  // Madison
  [-76.6122, 39.2904],  // Baltimore
];

const flows = [
  { from: "dal", to: "det", disrupted: true },
  { from: "dal", to: "atl", disrupted: true },
  { from: "dal", to: "phx", disrupted: true },
  { from: "sea", to: "chi", disrupted: false },
  { from: "chi", to: "det", disrupted: false },
  { from: "det", to: "nj", disrupted: false },
  { from: "la", to: "phx", disrupted: false },
  { from: "la", to: "sea", disrupted: false },
  { from: "chi", to: "atl", disrupted: false },
];

const statusColor: Record<string, string> = {
  active: "var(--sn-green)",
  warning: "var(--sn-warning)",
  alert: "var(--sn-danger)",
  down: "oklch(0.65 0.22 25)",
};

const statusGlow: Record<string, string> = {
  active: "var(--sn-green-dim)",
  warning: "oklch(0.8 0.16 80 / 30%)",
  alert: "oklch(0.65 0.22 25 / 30%)",
  down: "oklch(0.65 0.22 25 / 35%)",
};

// ── Building glyphs ─────────────────────────────────────────────────

function FactoryGlyph({ status }: { status: PlantStatus }) {
  const color = statusColor[status];
  const isLive = status === "active" || status === "warning";
  const puffClass = status === "warning" ? "smoke-puff-slow" : "smoke-puff";
  const bodyFill = status === "down" ? "oklch(0.16 0.02 240)" : "var(--sn-surface)";
  return (
    <g>
      {isLive && (
        <g>
          <circle cx={-6} cy={-11} r={2.4} fill="oklch(0.78 0.01 240)" opacity={0.55} className={puffClass} style={{ animationDelay: "0s" }} />
          <circle cx={-6} cy={-11} r={2.4} fill="oklch(0.78 0.01 240)" opacity={0.55} className={puffClass} style={{ animationDelay: "1.4s" }} />
          <circle cx={6} cy={-11} r={2.1} fill="oklch(0.78 0.01 240)" opacity={0.45} className={puffClass} style={{ animationDelay: "0.7s" }} />
        </g>
      )}
      <rect x={-8.5} y={-10} width={4} height={8} fill="var(--sn-navy-light)" stroke={color} strokeWidth={0.8} />
      <rect x={4.5} y={-10} width={4} height={8} fill="var(--sn-navy-light)" stroke={color} strokeWidth={0.8} />
      <path d="M -12 -2 L -9 -6 L -6 -2 L -3 -6 L 0 -2 L 3 -6 L 6 -2 L 9 -6 L 12 -2" fill="none" stroke={color} strokeWidth={0.9} strokeLinejoin="round" />
      <rect x={-12} y={-2} width={24} height={10} fill={bodyFill} stroke={color} strokeWidth={1.2} />
      <rect x={-2} y={3} width={4} height={5} fill={color} opacity={status === "down" ? 0.25 : 0.55} />
      <rect x={-9} y={0.5} width={2.5} height={2} fill={color} opacity={status === "down" ? 0.15 : 0.7} />
      <rect x={6.5} y={0.5} width={2.5} height={2} fill={color} opacity={status === "down" ? 0.15 : 0.7} />
    </g>
  );
}

function WarehouseGlyph({ status }: { status: PlantStatus }) {
  const color = statusColor[status];
  return (
    <g>
      <polygon points="-14,-3 0,-9 14,-3" fill="var(--sn-navy-light)" stroke={color} strokeWidth={1} strokeLinejoin="round" />
      <rect x={-14} y={-3} width={28} height={10} fill="var(--sn-surface)" stroke={color} strokeWidth={1.2} />
      <rect x={-10} y={0} width={5} height={7} fill={color} opacity={0.2} stroke={color} strokeWidth={0.5} />
      <rect x={-3.5} y={0} width={7} height={7} fill={color} opacity={0.35} stroke={color} strokeWidth={0.6} />
      <rect x={5} y={0} width={5} height={7} fill={color} opacity={0.2} stroke={color} strokeWidth={0.5} />
      <rect x={-14} y={0} width={28} height={1.4} fill={color} opacity={0.5} />
    </g>
  );
}

function HubGlyph({ status }: { status: PlantStatus }) {
  const color = statusColor[status];
  return (
    <g>
      {/* Dish */}
      <ellipse cx={0} cy={-2} rx={10} ry={3} fill="var(--sn-surface)" stroke={color} strokeWidth={1} />
      <line x1={0} y1={-2} x2={0} y2={5} stroke={color} strokeWidth={1.1} />
      <rect x={-5} y={5} width={10} height={3} fill="var(--sn-navy-light)" stroke={color} strokeWidth={0.8} />
      {/* Signals */}
      <path d="M -6 -6 A 6 6 0 0 1 6 -6" fill="none" stroke={color} strokeWidth={0.6} opacity={0.6} />
      <path d="M -10 -8 A 10 10 0 0 1 10 -8" fill="none" stroke={color} strokeWidth={0.5} opacity={0.4} />
      <circle cx={0} cy={-6} r={0.9} fill={color} />
    </g>
  );
}

function RndGlyph({ status }: { status: PlantStatus }) {
  const color = statusColor[status];
  return (
    <g>
      {/* Flask */}
      <path
        d="M -4 -8 L -4 -4 L -10 6 L 10 6 L 4 -4 L 4 -8 Z"
        fill="var(--sn-surface)"
        stroke={color}
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      {/* Neck cap */}
      <rect x={-5} y={-10} width={10} height={2} fill={color} opacity={0.8} />
      {/* Liquid */}
      <path d="M -8 2 L 8 2 L 10 6 L -10 6 Z" fill={color} opacity={0.35} />
      {/* Bubbles */}
      <circle cx={-2} cy={-2} r={0.7} fill={color} opacity={0.65} />
      <circle cx={2} cy={-5} r={0.6} fill={color} opacity={0.6} />
    </g>
  );
}

function StoreGlyph({ status }: { status: PlantStatus }) {
  const color = statusColor[status];
  return (
    <g>
      {/* Awning */}
      <path d="M -11 -3 L 11 -3 L 9 2 L -9 2 Z" fill={color} opacity={0.6} stroke={color} strokeWidth={0.7} strokeLinejoin="round" />
      <path d="M -9 2 Q -6 5 -3 2 Q 0 5 3 2 Q 6 5 9 2" fill="none" stroke={color} strokeWidth={0.5} />
      {/* Body */}
      <rect x={-10} y={2} width={20} height={7} fill="var(--sn-surface)" stroke={color} strokeWidth={1} />
      <rect x={-3} y={4} width={6} height={5} fill={color} opacity={0.5} />
      {/* Sign */}
      <rect x={-1} y={-7} width={2} height={4} fill={color} opacity={0.8} />
      <text x={0} y={-4} textAnchor="middle" fontSize={4} fontFamily="var(--font-mono)" fill="var(--sn-navy)">$</text>
    </g>
  );
}

function BuildingGlyph({ kind, status }: { kind: BuildingKind; status: PlantStatus }) {
  switch (kind) {
    case "warehouse": return <WarehouseGlyph status={status} />;
    case "hub": return <HubGlyph status={status} />;
    case "rnd": return <RndGlyph status={status} />;
    case "store": return <StoreGlyph status={status} />;
    case "factory":
    default: return <FactoryGlyph status={status} />;
  }
}

function ProductionStack({ status }: { status: PlantStatus }) {
  const color = statusColor[status];
  const alive = status !== "down";
  return (
    <g transform={`translate(-17, 10)`} opacity={alive ? 1 : 0.3}>
      <rect x={0} y={0} width={3} height={2.4} fill={color} className={alive ? "stack-breathe" : undefined} />
      <rect x={3.5} y={0} width={3} height={2.4} fill={color} className={alive ? "stack-breathe" : undefined} style={alive ? { animationDelay: "0.35s" } : undefined} />
      <rect x={0} y={-2.8} width={3} height={2.4} fill={color} className={alive ? "stack-breathe" : undefined} style={alive ? { animationDelay: "0.75s" } : undefined} />
    </g>
  );
}

function TruckGlyph({ disrupted = false }: { disrupted?: boolean }) {
  const cargo = disrupted ? "var(--sn-danger)" : "var(--sn-green)";
  return (
    <g>
      <circle cx={-2} cy={0} r={7} fill="var(--sn-navy)" opacity={0.55} />
      <rect x={-3} y={-4} width={8} height={7} fill={cargo} stroke="oklch(0.95 0.02 240)" strokeWidth={0.6} />
      <line x1={-0.5} y1={-4} x2={-0.5} y2={3} stroke="var(--sn-navy)" strokeWidth={0.35} opacity={0.55} />
      <line x1={2} y1={-4} x2={2} y2={3} stroke="var(--sn-navy)" strokeWidth={0.35} opacity={0.55} />
      <rect x={-7} y={-2.5} width={4} height={5.5} fill="oklch(0.32 0.02 240)" stroke="oklch(0.95 0.02 240)" strokeWidth={0.5} />
      <rect x={-6.2} y={-1.5} width={2.4} height={2} fill={disrupted ? "var(--sn-danger)" : "var(--sn-green-glow)"} opacity={0.95} />
      <circle cx={-5} cy={3.4} r={1.1} fill="oklch(0.08 0.02 240)" stroke="oklch(0.5 0.02 240)" strokeWidth={0.3} />
      <circle cx={-1.5} cy={3.4} r={1.1} fill="oklch(0.08 0.02 240)" stroke="oklch(0.5 0.02 240)" strokeWidth={0.3} />
      <circle cx={2.8} cy={3.4} r={1.1} fill="oklch(0.08 0.02 240)" stroke="oklch(0.5 0.02 240)" strokeWidth={0.3} />
    </g>
  );
}

// TopoJSON of US states + countries (Natural Earth via topojson CDN)
const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const COUNTRIES_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const projection = geoAlbers()
  .rotate([96, 0])
  .center([-0.6, 38.7])
  .parallels([29.5, 45.5])
  .scale(980)
  .translate([520, 250]);

interface NetworkMapProps {
  simDay: number;
  simHour?: number;
}

export default function NetworkMap({ simDay, simHour = 0 }: NetworkMapProps) {
  const { state, currentScenario, selectBuilding, placeBuilding } = useGameState();
  const buildings = state.buildings;
  const [hoveredPlant, setHoveredPlant] = useState<string | null>(null);

  // Project seed plants to pixels for tooltip and flows
  const projected = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    buildings.forEach((p) => {
      const pt = projection(p.coords);
      if (pt) map[p.id] = { x: pt[0], y: pt[1] };
    });
    return map;
  }, [buildings]);

  const mitigatedFlowCount = currentScenario.mode === "ai" ? 2 : currentScenario.mode === "manual" ? 1 : 0;
  const scenarioFlows = useMemo(
    () => flows.map((flow, index) => ({
      ...flow,
      disrupted:
        state.simulationPhase === "baseline" || state.simulationPhase === "steady"
          ? false
          : flow.disrupted
            ? index >= mitigatedFlowCount
            : false,
    })),
    [mitigatedFlowCount, state.simulationPhase],
  );

  const flowPaths = useMemo(() => {
    return scenarioFlows
      .map((f) => {
        const a = projected[f.from];
        const b = projected[f.to];
        if (!a || !b) return null;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        return {
          id: `flow-${f.from}-${f.to}`,
          d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
          dist,
          duration: Math.max(5, Math.min(12, dist / 42)),
          disrupted: f.disrupted,
          stallX: a.x + dx * 0.4,
          stallY: a.y + dy * 0.4,
          stallAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
        };
      })
      .filter(<T,>(x: T | null): x is T => x !== null);
  }, [projected, scenarioFlows]);

  const seedPlant = (id: string) => buildings.find((b) => b.id === id);

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!state.buildMode) return;
    const svg = e.currentTarget.querySelector("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    const svgX = xPct * 1040;
    const svgY = yPct * 500;
    const geo = (projection as unknown as { invert?: (pt: [number, number]) => [number, number] | null }).invert?.([svgX, svgY]);
    if (!geo) return;
    placeBuilding(geo);
  }

  function renderMarker(p: Building) {
    return (
      <Marker
        key={p.id}
        coordinates={p.coords}
        onMouseEnter={() => setHoveredPlant(p.id)}
        onMouseLeave={() => setHoveredPlant(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (!state.buildMode) selectBuilding(p.id);
        }}
        style={{ default: { cursor: state.buildMode ? "crosshair" : "pointer" }, hover: { cursor: state.buildMode ? "crosshair" : "pointer" }, pressed: { cursor: "pointer" } }}
      >
        <circle r={22} fill={statusGlow[p.status]} opacity={hoveredPlant === p.id ? 0.6 : 0.25}>
          {(p.status === "down" || p.status === "warning") && (
            <animate attributeName="opacity" values="0.15;0.45;0.15" dur="1.5s" repeatCount="indefinite" />
          )}
        </circle>
        <circle r={16} fill="none" stroke={statusColor[p.status]} strokeWidth={1.3} opacity={hoveredPlant === p.id ? 0.85 : 0.4} strokeDasharray="2 3" />

        <BuildingGlyph kind={p.kind} status={p.status} />
        <ProductionStack status={p.status} />

        <text y={28} textAnchor="middle" fill="var(--foreground)" fontSize={10.5} fontFamily="Inter, sans-serif" fontWeight={600}>
          {p.label}
        </text>
        <text y={40} textAnchor="middle" fill={statusColor[p.status]} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fontWeight={700}>
          {p.status === "down" ? "DOWN" : `Lv${p.level} · ${p.capacity}%`}
        </text>

        {p.status === "down" && (
          <g>
            <line x1={-10} y1={-8} x2={10} y2={8} stroke="oklch(0.95 0.02 25)" strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
            <line x1={10} y1={-8} x2={-10} y2={8} stroke="oklch(0.95 0.02 25)" strokeWidth={2.2} strokeLinecap="round" opacity={0.85} />
          </g>
        )}
      </Marker>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col min-w-0 relative"
      onClick={handleMapClick}
      style={{ cursor: state.buildMode ? "crosshair" : undefined }}
    >
      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Operational</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sn-warning" /> Degraded</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sn-danger" /> Down</span>
      </div>

      {/* Map */}
      <div className="flex-1 flex items-center justify-center p-3 pt-10 overflow-hidden">
        <div className="w-full h-full max-h-[620px] relative">
          <ComposableMap
            projection={projection as never}
            width={1040}
            height={500}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={COUNTRIES_URL}>
              {({ geographies }) =>
                geographies
                  .filter((g) => ["Canada", "Mexico", "Cuba", "Guatemala", "Belize", "Honduras", "Bahamas"].includes(g.properties.name))
                  .map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="oklch(0.14 0.02 240)"
                      stroke="oklch(0.26 0.02 240)"
                      strokeWidth={0.6}
                      style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                    />
                  ))
              }
            </Geographies>

            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="oklch(0.18 0.022 240)"
                    stroke="oklch(0.32 0.02 240)"
                    strokeWidth={0.5}
                    style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                  />
                ))
              }
            </Geographies>

            <Marker coordinates={[-100, 56]}>
              <text textAnchor="middle" fill="oklch(0.4 0.02 240)" fontSize={11} fontFamily="Inter, sans-serif" fontWeight={500}>CANADA</text>
            </Marker>
            <Marker coordinates={[-100, 23]}>
              <text textAnchor="middle" fill="oklch(0.4 0.02 240)" fontSize={11} fontFamily="Inter, sans-serif" fontWeight={500}>MEXICO</text>
            </Marker>
            <Marker coordinates={[-98, 39.5]}>
              <text textAnchor="middle" fill="oklch(0.32 0.02 240)" fontSize={13} fontFamily="Inter, sans-serif" fontWeight={600} opacity={0.6}>United States</text>
            </Marker>

            {/* Secondary distribution dots */}
            {secondaryLocations.map((coords, i) => (
              <Marker key={`sec-${i}`} coordinates={coords}>
                <circle r={2} fill="oklch(0.55 0.04 200)" opacity={0.55} />
              </Marker>
            ))}

            {/* Disrupted flows (only if both seed plants exist) */}
            {scenarioFlows.filter((f) => f.disrupted && seedPlant(f.from) && seedPlant(f.to)).map((f) => {
              const from = seedPlant(f.from)!;
              const to = seedPlant(f.to)!;
              return (
                <g key={`d-${f.from}-${f.to}`}>
                  <Line from={from.coords} to={to.coords} stroke="oklch(0.65 0.22 25 / 18%)" strokeWidth={6} />
                  <Line from={from.coords} to={to.coords} stroke="oklch(0.65 0.22 25 / 70%)" strokeWidth={2} strokeDasharray="8 6">
                    <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1s" repeatCount="indefinite" />
                  </Line>
                </g>
              );
            })}

            {/* Normal flows */}
            {scenarioFlows.filter((f) => !f.disrupted && seedPlant(f.from) && seedPlant(f.to)).map((f) => {
              const from = seedPlant(f.from)!;
              const to = seedPlant(f.to)!;
              return (
                <g key={`n-${f.from}-${f.to}`}>
                  <Line from={from.coords} to={to.coords} stroke="var(--sn-green-dim)" strokeWidth={1.5} />
                  <Line from={from.coords} to={to.coords} stroke="var(--sn-green)" strokeWidth={1.5} strokeDasharray="4 6" opacity={0.6}>
                    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.5s" repeatCount="indefinite" />
                  </Line>
                </g>
              );
            })}

            {/* Trucks */}
            <g>
              {flowPaths.map((fp) => (
                <path key={`p-${fp.id}`} id={fp.id} d={fp.d} fill="none" stroke="none" />
              ))}
              {flowPaths.map((fp) =>
                fp.disrupted ? (
                  <g key={`stalled-${fp.id}`} transform={`translate(${fp.stallX}, ${fp.stallY}) rotate(${fp.stallAngle})`}>
                    <circle r={9} fill="var(--sn-danger)" className="stalled-halo" />
                    <TruckGlyph disrupted />
                  </g>
                ) : (
                  <g key={`truck-${fp.id}`}>
                    <TruckGlyph />
                    <animateMotion dur={`${fp.duration}s`} repeatCount="indefinite" rotate="auto">
                      <mpath href={`#${fp.id}`} />
                    </animateMotion>
                  </g>
                )
              )}
            </g>

            {/* Buildings (plants + placed) */}
            {buildings.map((b) => renderMarker(b))}
          </ComposableMap>

          {/* Hover tooltip */}
          {hoveredPlant && projected[hoveredPlant] && !state.buildMode && (() => {
            const p = buildings.find((x) => x.id === hoveredPlant);
            if (!p) return null;
            const pos = projected[hoveredPlant];
            return (
              <div
                className="absolute pointer-events-none card-surface p-2 text-center text-[10px] glow-green-sm"
                style={{
                  left: `${(pos.x / 1040) * 100}%`,
                  top: `${(pos.y / 500) * 100}%`,
                  transform: "translate(-50%, calc(-100% - 30px))",
                  width: 180,
                }}
              >
                <div className="font-semibold text-foreground">{p.label}</div>
                <div className="text-muted-foreground mt-0.5">
                  {p.status === "down"
                    ? "OFFLINE — click to manage"
                    : `Lv ${p.level} · Cap ${p.capacity}% · click to open`}
                </div>
                <div className="font-mono" style={{ color: statusColor[p.status] }}>
                  {p.kind.toUpperCase()} · {p.workers.toLocaleString()} workers
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-end px-5 py-2 border-t border-border text-[10px] font-mono text-muted-foreground">
        <div className="flex items-center gap-1">
          <button className="w-6 h-6 flex items-center justify-center rounded border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs">−</button>
          <button className="w-6 h-6 flex items-center justify-center rounded border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button className="w-6 h-6 flex items-center justify-center rounded border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs">+</button>
        </div>
      </div>
    </div>
  );
}
