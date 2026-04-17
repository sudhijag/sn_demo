import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { geoAlbers } from "d3-geo";

type PlantStatus = "active" | "warning" | "alert" | "down";

// Real geographic coordinates [longitude, latitude]
const plants = [
  { id: "det", label: "Detroit", coords: [-83.0458, 42.3314] as [number, number], status: "active" as PlantStatus, capacity: 82 },
  { id: "chi", label: "Chicago", coords: [-87.6298, 41.8781] as [number, number], status: "active" as PlantStatus, capacity: 94 },
  { id: "dal", label: "Dallas", coords: [-96.7970, 32.7767] as [number, number], status: "down" as PlantStatus, capacity: 0 },
  { id: "phx", label: "Phoenix", coords: [-112.0740, 33.4484] as [number, number], status: "warning" as PlantStatus, capacity: 61 },
  { id: "sea", label: "Seattle", coords: [-122.3321, 47.6062] as [number, number], status: "active" as PlantStatus, capacity: 88 },
  { id: "atl", label: "Atlanta", coords: [-84.3880, 33.7490] as [number, number], status: "warning" as PlantStatus, capacity: 72 },
  { id: "nj", label: "Newark", coords: [-74.1724, 40.7357] as [number, number], status: "active" as PlantStatus, capacity: 90 },
  { id: "la", label: "Los Angeles", coords: [-118.2437, 34.0522] as [number, number], status: "active" as PlantStatus, capacity: 85 },
];

// Secondary distribution centers / warehouses (real cities)
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

function getPlant(id: string) {
  return plants.find((p) => p.id === id)!;
}

// TopoJSON of US states + countries (Natural Earth via topojson CDN)
const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const COUNTRIES_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Albers USA-friendly projection (we'll use a custom albers to also show CA/MX context)
const projection = geoAlbers()
  .rotate([96, 0])
  .center([-0.6, 38.7])
  .parallels([29.5, 45.5])
  .scale(900)
  .translate([475, 230]);

export default function NetworkMap({ simDay }: { simDay: number }) {
  const [hoveredPlant, setHoveredPlant] = useState<string | null>(null);

  // Project coords to pixel positions for hover tooltip / overlays
  const projected = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    plants.forEach((p) => {
      const pt = projection(p.coords);
      if (pt) map[p.id] = { x: pt[0], y: pt[1] };
    });
    return map;
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Dallas Down banner */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
        <motion.div
          className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-sn-danger/50"
          style={{ background: "oklch(0.2 0.06 25 / 80%)", backdropFilter: "blur(8px)" }}
          animate={{ borderColor: ["oklch(0.65 0.22 25 / 30%)", "oklch(0.65 0.22 25 / 70%)", "oklch(0.65 0.22 25 / 30%)"] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <span className="w-2 h-2 rounded-full bg-sn-danger pulse-dot" />
          <span className="text-[11px] font-mono font-bold text-sn-danger">
            DALLAS PLANT DOWN — DAY {simDay} — CASCADING FAILURES ACTIVE
          </span>
        </motion.div>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Operational</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sn-warning" /> Degraded</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sn-danger" /> Down</span>
      </div>

      {/* Map */}
      <div className="flex-1 flex items-center justify-center p-4 pt-12 overflow-hidden">
        <div className="w-full h-full max-h-[560px] relative">
          <ComposableMap
            projection={projection as never}
            width={950}
            height={460}
            style={{ width: "100%", height: "100%" }}
          >
            {/* Canada + Mexico (context countries) */}
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

            {/* US states with visible boundaries */}
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

            {/* Country labels */}
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

            {/* Disrupted flows from Dallas */}
            {flows.filter((f) => f.disrupted).map((f) => {
              const from = getPlant(f.from);
              const to = getPlant(f.to);
              return (
                <g key={`d-${f.from}-${f.to}`}>
                  <Line
                    from={from.coords}
                    to={to.coords}
                    stroke="oklch(0.65 0.22 25 / 18%)"
                    strokeWidth={6}
                  />
                  <Line
                    from={from.coords}
                    to={to.coords}
                    stroke="oklch(0.65 0.22 25 / 70%)"
                    strokeWidth={2}
                    strokeDasharray="8 6"
                  >
                    <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="1s" repeatCount="indefinite" />
                  </Line>
                </g>
              );
            })}

            {/* Normal flows */}
            {flows.filter((f) => !f.disrupted).map((f) => {
              const from = getPlant(f.from);
              const to = getPlant(f.to);
              return (
                <g key={`n-${f.from}-${f.to}`}>
                  <Line from={from.coords} to={to.coords} stroke="var(--sn-green-dim)" strokeWidth={1.5} />
                  <Line from={from.coords} to={to.coords} stroke="var(--sn-green)" strokeWidth={1.5} strokeDasharray="4 6" opacity={0.6}>
                    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.5s" repeatCount="indefinite" />
                  </Line>
                </g>
              );
            })}

            {/* Plant nodes */}
            {plants.map((p) => (
              <Marker
                key={p.id}
                coordinates={p.coords}
                onMouseEnter={() => setHoveredPlant(p.id)}
                onMouseLeave={() => setHoveredPlant(null)}
                style={{ default: { cursor: "pointer" }, hover: { cursor: "pointer" }, pressed: { cursor: "pointer" } }}
              >
                <circle r={22} fill={statusGlow[p.status]} opacity={hoveredPlant === p.id ? 0.6 : 0.25}>
                  {(p.status === "down" || p.status === "warning") && (
                    <animate attributeName="opacity" values="0.15;0.45;0.15" dur="1.5s" repeatCount="indefinite" />
                  )}
                </circle>
                <circle r={14} fill="none" stroke={statusColor[p.status]} strokeWidth={1.5} opacity={hoveredPlant === p.id ? 0.9 : 0.5} />
                <circle r={8} fill={statusColor[p.status]}>
                  {p.status === "down" && (
                    <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
                  )}
                </circle>
                <circle r={3} fill="var(--sn-navy)" />

                <text y={28} textAnchor="middle" fill="var(--foreground)" fontSize={10.5} fontFamily="Inter, sans-serif" fontWeight={600}>
                  {p.label}
                </text>
                <text y={40} textAnchor="middle" fill={statusColor[p.status]} fontSize={9.5} fontFamily="'JetBrains Mono', monospace" fontWeight={700}>
                  {p.status === "down" ? "DOWN" : `${p.capacity}%`}
                </text>

                {/* Dallas X marker */}
                {p.status === "down" && (
                  <g>
                    <line x1={-7} y1={-7} x2={7} y2={7} stroke="oklch(0.95 0.02 25)" strokeWidth={2} strokeLinecap="round" />
                    <line x1={7} y1={-7} x2={-7} y2={7} stroke="oklch(0.95 0.02 25)" strokeWidth={2} strokeLinecap="round" />
                  </g>
                )}
              </Marker>
            ))}
          </ComposableMap>

          {/* Hover tooltip overlay (HTML, positioned via projection) */}
          {hoveredPlant && projected[hoveredPlant] && (() => {
            const p = getPlant(hoveredPlant);
            const pos = projected[hoveredPlant];
            return (
              <div
                className="absolute pointer-events-none card-surface p-2 text-center text-[10px] glow-green-sm"
                style={{
                  left: `${(pos.x / 950) * 100}%`,
                  top: `${(pos.y / 460) * 100}%`,
                  transform: "translate(-50%, calc(-100% - 30px))",
                  width: 170,
                }}
              >
                <div className="font-semibold text-foreground">{p.label} Plant</div>
                <div className="text-muted-foreground mt-0.5">
                  {p.status === "down" ? "OFFLINE — Equipment Failure" : `Capacity: ${p.capacity}%`}
                </div>
                <div className="font-mono" style={{ color: statusColor[p.status] }}>
                  {p.status === "down" ? "Cascading to 3 plants" : `Status: ${p.status}`}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-border text-[10px] font-mono text-muted-foreground">
        <span>7 Plants Active • 1 Plant Down (Dallas) • 3 Supply Chains Disrupted</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sn-danger pulse-dot" />
          Failure Propagation Active — Day {simDay}
        </span>
        <div className="flex flex-col gap-1">
          <button className="w-6 h-6 flex items-center justify-center rounded border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs">+</button>
          <button className="w-6 h-6 flex items-center justify-center rounded border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors text-xs">−</button>
        </div>
      </div>
    </div>
  );
}
