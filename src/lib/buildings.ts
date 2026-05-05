// Building catalog + initial plant data for the tycoon simulation.

export type BuildingKind = "factory" | "warehouse" | "hub" | "rnd" | "store";

export type PlantStatus = "active" | "warning" | "alert" | "down";
export type LineStatus = "active" | "bottleneck" | "maintenance" | "idle";

export interface ProductionLine {
  id: string;
  name: string;
  status: LineStatus;
  output: number; // units / hour
  target: number;
}

export interface Building {
  id: string;
  kind: BuildingKind;
  label: string;
  coords: [number, number]; // [longitude, latitude]
  status: PlantStatus;
  capacity: number; // 0-100
  level: number;
  workers: number;
  workersCapacity: number;
  morale: number; // 0-1
  machines: number;
  machinesCapacity: number;
  machineCondition: number; // 0-1
  machineUtil: number; // 0-1
  lines: ProductionLine[];
  revenuePerHr: number; // $/hr
  upkeepPerHr: number; // $/hr
  isSeed?: boolean; // true for the original 8 plants
}

export interface CatalogItem {
  kind: BuildingKind;
  label: string;
  cost: number;
  upkeepPerHr: number;
  revenuePerHr: number;
  capacityStart: number;
  workers: number;
  machines: number;
  description: string;
  icon: string; // single-char visual hint
}

export const BUILDING_CATALOG: CatalogItem[] = [
  {
    kind: "factory",
    label: "Factory",
    cost: 2_400_000,
    upkeepPerHr: 620,
    revenuePerHr: 2_100,
    capacityStart: 68,
    workers: 180,
    machines: 24,
    description: "Heavy assembly line. High output, high upkeep.",
    icon: "🏭",
  },
  {
    kind: "warehouse",
    label: "Warehouse",
    cost: 780_000,
    upkeepPerHr: 140,
    revenuePerHr: 520,
    capacityStart: 84,
    workers: 48,
    machines: 6,
    description: "Cold-chain storage and cross-dock. Buffers inventory shocks.",
    icon: "📦",
  },
  {
    kind: "hub",
    label: "Logistics Hub",
    cost: 1_400_000,
    upkeepPerHr: 310,
    revenuePerHr: 1_180,
    capacityStart: 75,
    workers: 92,
    machines: 10,
    description: "Regional routing node. Opens new lanes on the network.",
    icon: "🛰",
  },
  {
    kind: "rnd",
    label: "R&D Lab",
    cost: 1_800_000,
    upkeepPerHr: 280,
    revenuePerHr: 340,
    capacityStart: 40,
    workers: 60,
    machines: 14,
    description: "Pilot lines for process innovations. Slow ROI, compounding gains.",
    icon: "🧪",
  },
  {
    kind: "store",
    label: "Retail Store",
    cost: 460_000,
    upkeepPerHr: 95,
    revenuePerHr: 780,
    capacityStart: 58,
    workers: 22,
    machines: 2,
    description: "Customer-facing outlet. Converts finished inventory to cash fast.",
    icon: "🛒",
  },
];

export const CATALOG_BY_KIND: Record<BuildingKind, CatalogItem> = Object.fromEntries(
  BUILDING_CATALOG.map((c) => [c.kind, c]),
) as Record<BuildingKind, CatalogItem>;

function lines(prefix: string): ProductionLine[] {
  return [
    { id: `${prefix}-L1`, name: "Line 1 · Sub-assembly", status: "active", output: 184, target: 200 },
    { id: `${prefix}-L2`, name: "Line 2 · Welding", status: "active", output: 172, target: 180 },
    { id: `${prefix}-L3`, name: "Line 3 · Paint", status: "bottleneck", output: 96, target: 160 },
    { id: `${prefix}-L4`, name: "Line 4 · QA", status: "active", output: 158, target: 160 },
    { id: `${prefix}-L5`, name: "Line 5 · Pack-out", status: "maintenance", output: 0, target: 140 },
  ];
}

export const SEED_PLANTS: Building[] = [
  {
    id: "det", kind: "factory", label: "Detroit", coords: [-83.0458, 42.3314],
    status: "active", capacity: 82, level: 3,
    workers: 1240, workersCapacity: 1400, morale: 0.82,
    machines: 54, machinesCapacity: 60, machineCondition: 0.88, machineUtil: 0.79,
    lines: lines("det"),
    revenuePerHr: 6800, upkeepPerHr: 2100, isSeed: true,
  },
  {
    id: "chi", kind: "factory", label: "Chicago", coords: [-87.6298, 41.8781],
    status: "active", capacity: 94, level: 4,
    workers: 1520, workersCapacity: 1600, morale: 0.89,
    machines: 68, machinesCapacity: 72, machineCondition: 0.92, machineUtil: 0.88,
    lines: lines("chi"),
    revenuePerHr: 8400, upkeepPerHr: 2400, isSeed: true,
  },
  {
    id: "dal", kind: "factory", label: "Dallas", coords: [-96.7970, 32.7767],
    status: "active", capacity: 84, level: 3,
    workers: 1180, workersCapacity: 1200, morale: 0.81,
    machines: 42, machinesCapacity: 48, machineCondition: 0.87, machineUtil: 0.78,
    lines: lines("dal"),
    revenuePerHr: 5900, upkeepPerHr: 1800, isSeed: true,
  },
  {
    id: "phx", kind: "factory", label: "Phoenix", coords: [-112.0740, 33.4484],
    status: "active", capacity: 76, level: 2,
    workers: 760, workersCapacity: 900, morale: 0.77,
    machines: 32, machinesCapacity: 40, machineCondition: 0.82, machineUtil: 0.74,
    lines: lines("phx"),
    revenuePerHr: 3600, upkeepPerHr: 1400, isSeed: true,
  },
  {
    id: "sea", kind: "factory", label: "Seattle", coords: [-122.3321, 47.6062],
    status: "active", capacity: 88, level: 3,
    workers: 980, workersCapacity: 1100, morale: 0.86,
    machines: 46, machinesCapacity: 50, machineCondition: 0.91, machineUtil: 0.83,
    lines: lines("sea"),
    revenuePerHr: 5200, upkeepPerHr: 1800, isSeed: true,
  },
  {
    id: "atl", kind: "factory", label: "Atlanta", coords: [-84.3880, 33.7490],
    status: "active", capacity: 79, level: 2,
    workers: 860, workersCapacity: 1000, morale: 0.76,
    machines: 38, machinesCapacity: 46, machineCondition: 0.81, machineUtil: 0.74,
    lines: lines("atl"),
    revenuePerHr: 4200, upkeepPerHr: 1600, isSeed: true,
  },
  {
    id: "nj", kind: "factory", label: "Newark", coords: [-74.1724, 40.7357],
    status: "active", capacity: 90, level: 3,
    workers: 1140, workersCapacity: 1200, morale: 0.88,
    machines: 52, machinesCapacity: 56, machineCondition: 0.90, machineUtil: 0.85,
    lines: lines("nj"),
    revenuePerHr: 6100, upkeepPerHr: 2000, isSeed: true,
  },
  {
    id: "la", kind: "factory", label: "Los Angeles", coords: [-118.2437, 34.0522],
    status: "active", capacity: 85, level: 4,
    workers: 1380, workersCapacity: 1500, morale: 0.84,
    machines: 62, machinesCapacity: 68, machineCondition: 0.89, machineUtil: 0.82,
    lines: lines("la"),
    revenuePerHr: 7200, upkeepPerHr: 2300, isSeed: true,
  },
];

export function upgradeCost(level: number): number {
  // Level 1→2: $800k, 2→3: $1.4M, 3→4: $2.2M, 4→5: $3.2M
  return Math.round(([0, 800, 1400, 2200, 3200][level] ?? 0) * 1000);
}

export function upgradeCapacityGain(level: number): number {
  return [0, 12, 10, 8, 6][level] ?? 0;
}
