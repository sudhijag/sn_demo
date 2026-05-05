# Tycoon Implementation Notes

## Purpose

This document is a working brief for extending the prototype without fighting the current architecture more than necessary.

The app already has a strong visual shell, but a lot of the behavior is hardcoded. That is acceptable for a demo, but the next features should reduce fake behavior rather than add more of it.

## UI vs Natural Language

- Keep assumptions, plan state, and strategy comparison visible in UI so the simulation can "travel" when the laptop is turned around.
- Use natural language for executive exploration, follow-up questions, and narrative explanation.
- Do not hide core scenario mechanics behind chat if they can be shown more clearly on-screen.
- Light gamification is good when it clarifies the system and keeps attention, but not when it competes with decision credibility.

## Current Hardcoding Inventory

### 1. Top-level scenario framing is hardcoded

File:

- [src/routes/index.tsx](/Users/hemachakravarthi/Github/sn_demo/src/routes/index.tsx)

Notes:

- The page title, major outage badge, center tabs, and capacity chart are mostly static.
- The "Future Capacity Forecast" bars are fixed values.
- The app always presents the same narrative: Dallas outage, AI reroute, recovery arc.

Implication:
The app looks dynamic, but the scenario framing is not yet data-driven.

### 2. The simulation engine is a single reducer with synthetic math

File:

- [src/lib/game-state.tsx](/Users/hemachakravarthi/Github/sn_demo/src/lib/game-state.tsx)

Notes:

- Cash, inventory, reputation, and energy are updated by fixed formulas.
- Ambient events are selected from a static text pool.
- There is no concept of scenario versions, assumptions, intervention bundles, or comparison modes.
- There is no separation between source inputs and computed outputs.

Implication:
Adding assumptions and interventions directly into the current reducer will get messy fast unless we add a scenario layer first.

### 3. The network state is heavily scripted

File:

- [src/components/NetworkMap.tsx](/Users/hemachakravarthi/Github/sn_demo/src/components/NetworkMap.tsx)

Notes:

- Flow paths are static.
- Disrupted vs normal lanes are predefined.
- The Dallas outage banner is hardcoded.
- Units per hour is a derived display number using a simple formula rather than actual flow state.
- Secondary locations are decorative.

Implication:
The map is visually strong, but not yet a reliable system of record for scenario outcomes.

### 4. Plant comparison is a scripted vignette

File:

- [src/components/InterPlantSimulation.tsx](/Users/hemachakravarthi/Github/sn_demo/src/components/InterPlantSimulation.tsx)

Notes:

- Plant line states are static arrays.
- Link health drifts randomly and is not connected to the main game state.
- The view is illustrative, not computational.

Implication:
This component should not become the source of truth for strategy outcomes.

### 5. KPIs and alerts are mostly fixed content

File:

- [src/components/KPIPanel.tsx](/Users/hemachakravarthi/Github/sn_demo/src/components/KPIPanel.tsx)

Notes:

- KPI cards are static text.
- Alerts are static text.
- The active scenario panel is fixed.

Implication:
If we add scenario editing, this panel should become one of the first places to bind to real scenario state.

### 6. The chat panel is fully mocked

File:

- [src/components/ChatPanel.tsx](/Users/hemachakravarthi/Github/sn_demo/src/components/ChatPanel.tsx)

Notes:

- Suggestions are hardcoded.
- The default response is hardcoded.
- The panel does not read scenario state.
- The panel does not maintain structured scenario context beyond local message history.

Implication:
Do not treat the current chat panel as an AI feature. Treat it as a shell that needs a scenario-aware answer generator.

### 7. Plant actions are real UI actions, but narrow and local

File:

- [src/components/PlantDetail.tsx](/Users/hemachakravarthi/Github/sn_demo/src/components/PlantDetail.tsx)

Notes:

- Repair, hire, and buy machine are connected to reducer actions.
- More strategic actions like production mix and sub-assembly expansion are disabled.
- Current actions affect individual buildings, not scenario strategies.

Implication:
These are useful patterns for interaction, but they are not yet the intervention model that Tycoon needs.

### 8. Building placement is real but not central to the value prop

Files:

- [src/components/BuildPalette.tsx](/Users/hemachakravarthi/Github/sn_demo/src/components/BuildPalette.tsx)
- [src/lib/buildings.ts](/Users/hemachakravarthi/Github/sn_demo/src/lib/buildings.ts)

Notes:

- Build mode works.
- Catalog values are static.
- Building placement is more "tycoon game" than "executive decision lab."

Implication:
Do not let city-building mechanics dominate the next milestone unless they directly support the demo story.

## Recommended Model Direction

### Add a first-class scenario object

Before adding the requested features, introduce a scenario shape roughly like this:

```ts
type ScenarioObjective = "margin" | "service_level" | "recovery_time";
type StrategyMode = "baseline" | "manual" | "ai";

interface ScenarioAssumptions {
  outageDurationDays: number;
  spareCapacityPct: number;
  laborAvailabilityPct: number;
  freightMode: "standard" | "expedited";
  supplierLeadTimeDays: number;
  serviceLevelPriority: "margin" | "balanced" | "service";
  skuPriority: "all" | "high_margin" | "strategic";
}

interface Intervention {
  id: string;
  type:
    | "reroute_volume"
    | "add_overtime"
    | "expedite_freight"
    | "prioritize_skus"
    | "open_overflow_capacity"
    | "shift_labor";
  enabled: boolean;
  params: Record<string, number | string | boolean>;
  estimatedCost: number;
}

interface ScenarioVersion {
  id: string;
  label: string;
  mode: StrategyMode;
  objective: ScenarioObjective;
  assumptions: ScenarioAssumptions;
  interventions: Intervention[];
  outcome: ScenarioOutcome;
  basedOnScenarioId?: string;
}
```

The exact types can change. The important part is that assumptions, interventions, and outcomes become first-class state instead of being scattered across components.

## Recommended Implementation Order

### Step 1. Introduce a scenario store without breaking the current demo

Keep the current reducer if needed, but wrap the new features around a scenario-oriented state model.

Goal:

- One baseline scenario.
- One manual scenario.
- One AI scenario.

### Step 2. Move KPI calculation into pure functions

Add a small computation layer such as:

- `computeScenarioOutcome`
- `computeInterventionCost`
- `computeComparison`
- `generateExecutiveSummary`

Goal:
The UI should read computed outputs, not invent its own math.

### Step 3. Build the assumption builder

Recommended UX:

- Small right-side panel or drawer.
- Editable controls for the required assumptions.
- Baseline vs current deltas shown inline.

Goal:
Visible, understandable, and fast to demo.

### Step 4. Build the intervention builder

Recommended UX:

- Checklist or toggleable action cards.
- Each intervention shows cost, KPI effect, and rationale.
- Allow grouping into a named action plan.

Goal:
The audience should feel cause-and-effect immediately.

### Step 5. Build the comparison view

Recommended UX:

- Three aligned columns: baseline, manual, AI.
- Rows for the KPIs that matter in the room: margin, service level, recovery time, total cost.
- A clear "best for selected objective" badge.

Goal:
This should become the centerpiece of the demo.

### Step 6. Upgrade the executive console last

The console should answer from scenario state, not from hardcoded canned text.

Even if the natural-language parsing stays simple, the answer should be assembled from real scenario data.

## Notes To The Model Implementing These Features

### Do

- Prefer adding pure calculation helpers before adding UI complexity.
- Keep assumptions, interventions, and comparison derived from the same source state.
- Reuse the existing visual shell where it helps speed.
- Bias toward demo clarity over realism when forced to choose.
- Make "baseline vs changed" obvious in every feature.

### Do not

- Do not add more random number drift for important KPI outcomes.
- Do not hardcode three separate comparison columns by hand.
- Do not keep chat answers disconnected from scenario state.
- Do not store essential scenario state only in component-local `useState`.
- Do not over-invest in build mode unless it directly supports the decision story.

### Preferred shortcuts

These are acceptable for now:

- Use deterministic formulas instead of full operational realism.
- Use a small fixed intervention catalog.
- Use a single seeded incident such as Dallas outage.
- Use simple confidence bands driven by scenario complexity or intervention count.

These are not acceptable shortcuts:

- Fake comparison results that are not tied to assumptions/interventions.
- Fake executive answers that contradict the visible scenario.
- KPI cards that ignore scenario changes.

## Suggested Demo-Ready Data Contract

At minimum, each strategy should be able to produce:

```ts
interface ScenarioOutcome {
  revenueDelta: number;
  marginDeltaPct: number;
  recoveryDays: number;
  serviceLevelPct: number;
  expediteCost: number;
  laborCost: number;
  confidencePct: number;
  summary: string;
}
```

If we can compute this consistently for baseline, manual, and AI, the rest of the requested features become much easier to build.

## Bottom Line

The prototype is visually impressive already.

The next milestone should not be "more screens."
It should be:

1. One coherent scenario model.
2. One believable assumptions-to-actions-to-outcomes loop.
3. One comparison moment that makes the audience trust the product.
