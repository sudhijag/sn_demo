import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import {
  BUILDING_CATALOG,
  CATALOG_BY_KIND,
  SEED_PLANTS,
  upgradeCapacityGain,
  upgradeCost,
  type Building,
  type BuildingKind,
  type CatalogItem,
} from "@/lib/buildings";
import {
  BASELINE_ASSUMPTIONS,
  buildScenarioVersions,
  getBestStrategy,
  type InterventionType,
  type ScenarioAssumptions,
  type ScenarioObjective,
  type ScenarioVersion,
  type StrategyMode,
} from "@/lib/scenario";

export interface GameEvent {
  id: string;
  tick: number;
  tone: "good" | "warn" | "bad" | "info";
  text: string;
}

export interface GameState {
  cash: number;
  rawInventory: number; // tonnes
  rawCapacity: number;
  wipInventory: number; // units
  wipCapacity: number;
  finishedInventory: number; // units
  finishedCapacity: number;
  revenuePerHr: number;
  upkeepPerHr: number;
  reputation: number; // 0-5
  energyKwh: number;
  buildings: Building[];
  selectedBuildingId: string | null;
  buildMode: boolean;
  pendingCatalog: BuildingKind | null; // catalog item queued to place
  events: GameEvent[];
  lastTick: number;
  objective: ScenarioObjective;
  activeScenarioMode: StrategyMode;
  assumptions: ScenarioAssumptions;
  selectedInterventions: InterventionType[];
}

type Action =
  | { type: "TICK" }
  | { type: "SELECT_BUILDING"; id: string | null }
  | { type: "ENTER_BUILD_MODE"; kind: BuildingKind }
  | { type: "EXIT_BUILD_MODE" }
  | { type: "PLACE_BUILDING"; coords: [number, number] }
  | { type: "UPGRADE"; id: string }
  | { type: "REPAIR"; id: string }
  | { type: "HIRE"; id: string; count: number }
  | { type: "BUY_MACHINE"; id: string }
  | { type: "PUSH_EVENT"; event: Omit<GameEvent, "id" | "tick"> }
  | { type: "SET_OBJECTIVE"; objective: ScenarioObjective }
  | { type: "SET_ACTIVE_SCENARIO"; mode: StrategyMode }
  | { type: "UPDATE_ASSUMPTION"; key: keyof ScenarioAssumptions; value: ScenarioAssumptions[keyof ScenarioAssumptions] }
  | { type: "TOGGLE_INTERVENTION"; intervention: InterventionType };

function initial(): GameState {
  return {
    cash: 24_800_000,
    rawInventory: 340,
    rawCapacity: 500,
    wipInventory: 128,
    wipCapacity: 260,
    finishedInventory: 892,
    finishedCapacity: 1400,
    revenuePerHr: SEED_PLANTS.reduce((s, b) => s + b.revenuePerHr, 0),
    upkeepPerHr: SEED_PLANTS.reduce((s, b) => s + b.upkeepPerHr, 0),
    reputation: 4.2,
    energyKwh: 892_000,
    buildings: SEED_PLANTS,
    selectedBuildingId: null,
    buildMode: false,
    pendingCatalog: null,
    events: [
      { id: "ev-seed-1", tick: 0, tone: "bad", text: "Dallas plant equipment failure · cascading to 3 downstream lanes" },
      { id: "ev-seed-2", tick: 0, tone: "info", text: "AI co-pilot online · evaluating reroute scenarios" },
    ],
    lastTick: 0,
    objective: "margin",
    activeScenarioMode: "manual",
    assumptions: BASELINE_ASSUMPTIONS,
    selectedInterventions: ["reroute_volume", "add_overtime"],
  };
}

let evId = 100;
function nextEventId() {
  evId += 1;
  return `ev-${evId}`;
}

function recomputeTotals(state: GameState): GameState {
  const revenuePerHr = state.buildings.reduce((s, b) => s + b.revenuePerHr, 0);
  const upkeepPerHr = state.buildings.reduce((s, b) => s + b.upkeepPerHr, 0);
  return { ...state, revenuePerHr, upkeepPerHr };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "TICK": {
      const net = state.revenuePerHr - state.upkeepPerHr;
      const cash = state.cash + net;
      // Inventory flows: raw consumed, wip produced, finished produced, finished sold (by stores + revenue)
      const rawBurn = Math.round(state.buildings.reduce((s, b) => s + b.capacity * 0.4, 0));
      const wipMake = Math.round(state.buildings.reduce((s, b) => s + b.capacity * 0.35, 0));
      const finMake = Math.round(state.buildings.reduce((s, b) => s + b.capacity * 0.3, 0));
      const storeSell = state.buildings.filter(b => b.kind === "store").reduce((s, b) => s + Math.round(b.capacity * 0.8), 0);
      const soldToCustomers = Math.min(state.finishedInventory, 120 + storeSell);
      const rawInventory = Math.max(40, Math.min(state.rawCapacity, state.rawInventory - rawBurn / 14 + 18));
      const wipInventory = Math.max(20, Math.min(state.wipCapacity, state.wipInventory - wipMake / 30 + wipMake / 26));
      const finishedInventory = Math.max(100, Math.min(state.finishedCapacity, state.finishedInventory + finMake / 18 - soldToCustomers / 20));
      const reputation = Math.max(2, Math.min(5, state.reputation + (net > 0 ? 0.005 : -0.008) + (Math.random() - 0.5) * 0.01));
      const energyKwh = Math.max(400_000, Math.min(1_500_000, state.energyKwh + (Math.random() - 0.45) * 2400));
      const lastTick = state.lastTick + 1;

      // Random ambient event every ~6 ticks
      const events = [...state.events];
      if (lastTick % 6 === 0) {
        const pool: Array<Omit<GameEvent, "id" | "tick">> = [
          { tone: "good", text: "Pricing AI closed a $340K premium order · Detroit apparel" },
          { tone: "info", text: "Phoenix SMT line hit 96% yield on the new batch" },
          { tone: "warn", text: "Atlanta DC conveyor slipping · scheduling preventive maintenance" },
          { tone: "bad", text: "Spot energy price +18% · upkeep trending higher this shift" },
          { tone: "good", text: "Retention program bumped morale +3% across West cluster" },
          { tone: "info", text: "AI sourcing flagged a Vietnam alt-supplier · lead time −4.2 days" },
        ];
        const pick = pool[lastTick % pool.length];
        events.unshift({ ...pick, id: nextEventId(), tick: lastTick });
      }
      if (events.length > 12) events.length = 12;

      return {
        ...state,
        cash,
        rawInventory,
        wipInventory,
        finishedInventory,
        reputation,
        energyKwh,
        events,
        lastTick,
      };
    }

    case "SELECT_BUILDING":
      return { ...state, selectedBuildingId: action.id };

    case "ENTER_BUILD_MODE":
      return { ...state, buildMode: true, pendingCatalog: action.kind };

    case "EXIT_BUILD_MODE":
      return { ...state, buildMode: false, pendingCatalog: null };

    case "PLACE_BUILDING": {
      if (!state.pendingCatalog) return state;
      const catalog = CATALOG_BY_KIND[state.pendingCatalog];
      if (state.cash < catalog.cost) {
        return {
          ...state,
          events: [
            { id: nextEventId(), tick: state.lastTick, tone: "bad", text: `Not enough cash to place ${catalog.label}` },
            ...state.events,
          ].slice(0, 12),
          buildMode: false,
          pendingCatalog: null,
        };
      }
      const newBuilding: Building = {
        id: `b-${Date.now()}`,
        kind: catalog.kind,
        label: `${catalog.label} · New`,
        coords: action.coords,
        status: "active",
        capacity: catalog.capacityStart,
        level: 1,
        workers: catalog.workers,
        workersCapacity: Math.round(catalog.workers * 1.25),
        morale: 0.78,
        machines: catalog.machines,
        machinesCapacity: Math.round(catalog.machines * 1.3),
        machineCondition: 0.95,
        machineUtil: 0.6,
        lines: [
          { id: "new-L1", name: "Line 1 · Startup", status: "active", output: Math.round(catalog.capacityStart * 1.6), target: Math.round(catalog.capacityStart * 2) },
          { id: "new-L2", name: "Line 2 · Ramping", status: "active", output: Math.round(catalog.capacityStart * 1.1), target: Math.round(catalog.capacityStart * 1.8) },
        ],
        revenuePerHr: catalog.revenuePerHr,
        upkeepPerHr: catalog.upkeepPerHr,
      };
      const next: GameState = {
        ...state,
        cash: state.cash - catalog.cost,
        buildings: [...state.buildings, newBuilding],
        selectedBuildingId: newBuilding.id,
        buildMode: false,
        pendingCatalog: null,
        events: [
          { id: nextEventId(), tick: state.lastTick, tone: "good", text: `${catalog.label} placed · −$${(catalog.cost / 1_000_000).toFixed(2)}M` },
          ...state.events,
        ].slice(0, 12),
      };
      return recomputeTotals(next);
    }

    case "UPGRADE": {
      const b = state.buildings.find(x => x.id === action.id);
      if (!b || b.level >= 5) return state;
      const cost = upgradeCost(b.level);
      if (state.cash < cost) return state;
      const gain = upgradeCapacityGain(b.level);
      const updated: Building = {
        ...b,
        level: b.level + 1,
        capacity: Math.min(100, b.capacity + gain),
        revenuePerHr: Math.round(b.revenuePerHr * 1.18),
        upkeepPerHr: Math.round(b.upkeepPerHr * 1.08),
        machinesCapacity: b.machinesCapacity + 4,
        workersCapacity: b.workersCapacity + 80,
      };
      const buildings = state.buildings.map(x => x.id === action.id ? updated : x);
      const next: GameState = {
        ...state,
        cash: state.cash - cost,
        buildings,
        events: [
          { id: nextEventId(), tick: state.lastTick, tone: "good", text: `${b.label} → Lv ${updated.level} · capacity +${gain}%` },
          ...state.events,
        ].slice(0, 12),
      };
      return recomputeTotals(next);
    }

    case "REPAIR": {
      const b = state.buildings.find(x => x.id === action.id);
      if (!b) return state;
      const cost = 420_000;
      if (state.cash < cost) return state;
      const updated: Building = {
        ...b,
        status: "active",
        capacity: Math.max(b.capacity, 70),
        machineCondition: 0.95,
        workers: Math.max(b.workers, Math.round(b.workersCapacity * 0.85)),
        morale: Math.max(b.morale, 0.72),
        revenuePerHr: CATALOG_BY_KIND[b.kind].revenuePerHr * (0.9 + b.level * 0.08),
        lines: b.lines.map(l => ({ ...l, status: "active" as const, output: Math.round(l.target * 0.85) })),
      };
      const buildings = state.buildings.map(x => x.id === action.id ? updated : x);
      const next: GameState = {
        ...state,
        cash: state.cash - cost,
        buildings,
        events: [
          { id: nextEventId(), tick: state.lastTick, tone: "good", text: `${b.label} repaired · back online` },
          ...state.events,
        ].slice(0, 12),
      };
      return recomputeTotals(next);
    }

    case "HIRE": {
      const b = state.buildings.find(x => x.id === action.id);
      if (!b) return state;
      const count = action.count;
      const cost = count * 4200;
      if (state.cash < cost) return state;
      const updated: Building = {
        ...b,
        workers: Math.min(b.workersCapacity, b.workers + count),
        morale: Math.min(1, b.morale + 0.03),
      };
      const buildings = state.buildings.map(x => x.id === action.id ? updated : x);
      return {
        ...state,
        cash: state.cash - cost,
        buildings,
        events: [
          { id: nextEventId(), tick: state.lastTick, tone: "info", text: `Hired ${count} at ${b.label}` },
          ...state.events,
        ].slice(0, 12),
      };
    }

    case "BUY_MACHINE": {
      const b = state.buildings.find(x => x.id === action.id);
      if (!b) return state;
      const cost = 180_000;
      if (state.cash < cost || b.machines >= b.machinesCapacity) return state;
      const updated: Building = {
        ...b,
        machines: b.machines + 1,
        capacity: Math.min(100, b.capacity + 2),
        machineCondition: Math.min(1, b.machineCondition + 0.02),
        revenuePerHr: Math.round(b.revenuePerHr * 1.03),
      };
      const buildings = state.buildings.map(x => x.id === action.id ? updated : x);
      const next: GameState = {
        ...state,
        cash: state.cash - cost,
        buildings,
        events: [
          { id: nextEventId(), tick: state.lastTick, tone: "good", text: `New machine commissioned at ${b.label}` },
          ...state.events,
        ].slice(0, 12),
      };
      return recomputeTotals(next);
    }

    case "PUSH_EVENT":
      return {
        ...state,
        events: [
          { id: nextEventId(), tick: state.lastTick, ...action.event },
          ...state.events,
        ].slice(0, 12),
      };

    case "SET_OBJECTIVE":
      return { ...state, objective: action.objective };

    case "SET_ACTIVE_SCENARIO":
      return { ...state, activeScenarioMode: action.mode };

    case "UPDATE_ASSUMPTION":
      return {
        ...state,
        assumptions: {
          ...state.assumptions,
          [action.key]: action.value,
        },
      };

    case "TOGGLE_INTERVENTION": {
      const selectedInterventions = state.selectedInterventions.includes(action.intervention)
        ? state.selectedInterventions.filter((item) => item !== action.intervention)
        : [...state.selectedInterventions, action.intervention];

      return {
        ...state,
        selectedInterventions,
      };
    }
  }
}

interface GameStateContextValue {
  state: GameState;
  tick: () => void;
  selectBuilding: (id: string | null) => void;
  enterBuildMode: (kind: BuildingKind) => void;
  exitBuildMode: () => void;
  placeBuilding: (coords: [number, number]) => void;
  upgrade: (id: string) => void;
  repair: (id: string) => void;
  hire: (id: string, count: number) => void;
  buyMachine: (id: string) => void;
  selectedBuilding: Building | null;
  catalog: CatalogItem[];
  scenarios: Record<StrategyMode, ScenarioVersion>;
  currentScenario: ScenarioVersion;
  bestScenario: ScenarioVersion;
  setObjective: (objective: ScenarioObjective) => void;
  setActiveScenario: (mode: StrategyMode) => void;
  updateAssumption: <K extends keyof ScenarioAssumptions>(key: K, value: ScenarioAssumptions[K]) => void;
  toggleIntervention: (intervention: InterventionType) => void;
}

const GameStateContext = createContext<GameStateContextValue | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);

  const tick = useCallback(() => dispatch({ type: "TICK" }), []);
  const selectBuilding = useCallback((id: string | null) => dispatch({ type: "SELECT_BUILDING", id }), []);
  const enterBuildMode = useCallback((kind: BuildingKind) => dispatch({ type: "ENTER_BUILD_MODE", kind }), []);
  const exitBuildMode = useCallback(() => dispatch({ type: "EXIT_BUILD_MODE" }), []);
  const placeBuilding = useCallback((coords: [number, number]) => dispatch({ type: "PLACE_BUILDING", coords }), []);
  const upgrade = useCallback((id: string) => dispatch({ type: "UPGRADE", id }), []);
  const repair = useCallback((id: string) => dispatch({ type: "REPAIR", id }), []);
  const hire = useCallback((id: string, count: number) => dispatch({ type: "HIRE", id, count }), []);
  const buyMachine = useCallback((id: string) => dispatch({ type: "BUY_MACHINE", id }), []);
  const setObjective = useCallback((objective: ScenarioObjective) => dispatch({ type: "SET_OBJECTIVE", objective }), []);
  const setActiveScenario = useCallback((mode: StrategyMode) => dispatch({ type: "SET_ACTIVE_SCENARIO", mode }), []);
  const updateAssumption = useCallback(<K extends keyof ScenarioAssumptions,>(key: K, value: ScenarioAssumptions[K]) => {
    dispatch({ type: "UPDATE_ASSUMPTION", key, value });
  }, []);
  const toggleIntervention = useCallback((intervention: InterventionType) => {
    dispatch({ type: "TOGGLE_INTERVENTION", intervention });
  }, []);

  const selectedBuilding = useMemo(
    () => state.buildings.find(b => b.id === state.selectedBuildingId) ?? null,
    [state.buildings, state.selectedBuildingId],
  );

  const scenarios = useMemo(
    () => buildScenarioVersions(state.assumptions, state.selectedInterventions),
    [state.assumptions, state.selectedInterventions],
  );

  const currentScenario = scenarios[state.activeScenarioMode];
  const bestScenario = getBestStrategy(scenarios, state.objective);

  const value = useMemo<GameStateContextValue>(
    () => ({
      state,
      tick,
      selectBuilding,
      enterBuildMode,
      exitBuildMode,
      placeBuilding,
      upgrade,
      repair,
      hire,
      buyMachine,
      selectedBuilding,
      catalog: BUILDING_CATALOG,
      scenarios,
      currentScenario,
      bestScenario,
      setObjective,
      setActiveScenario,
      updateAssumption,
      toggleIntervention,
    }),
    [
      state,
      tick,
      selectBuilding,
      enterBuildMode,
      exitBuildMode,
      placeBuilding,
      upgrade,
      repair,
      hire,
      buyMachine,
      selectedBuilding,
      scenarios,
      currentScenario,
      bestScenario,
      setObjective,
      setActiveScenario,
      updateAssumption,
      toggleIntervention,
    ],
  );

  return <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>;
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error("useGameState must be used inside GameStateProvider");
  return ctx;
}
