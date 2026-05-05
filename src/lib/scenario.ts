export type StrategyMode = "baseline" | "manual" | "ai";
export type ScenarioObjective = "margin" | "service_level" | "recovery_time";
export type FreightMode = "standard" | "expedited";
export type ServiceLevelPriority = "margin" | "balanced" | "service";
export type SkuPriority = "all" | "high_margin" | "strategic";

export interface ScenarioAssumptions {
  outageDurationDays: number;
  spareCapacityPct: number;
  laborAvailabilityPct: number;
  freightMode: FreightMode;
  supplierLeadTimeDays: number;
  serviceLevelPriority: ServiceLevelPriority;
  skuPriority: SkuPriority;
}

export type InterventionType =
  | "reroute_volume"
  | "add_overtime"
  | "expedite_freight"
  | "prioritize_skus"
  | "open_overflow_capacity"
  | "shift_labor";

export interface InterventionDefinition {
  type: InterventionType;
  label: string;
  description: string;
  estimatedCost: number;
  marginLiftPct: number;
  serviceLiftPct: number;
  recoveryLiftDays: number;
}

export interface ScenarioOutcome {
  revenueDelta: number;
  marginDeltaPct: number;
  recoveryDays: number;
  serviceLevelPct: number;
  expediteCost: number;
  laborCost: number;
  confidencePct: number;
  summary: string;
}

export type ActionThreshold = "H" | "M" | "L";
export type ActionAutomation = "auto" | "approve" | "modify";

export interface ResponseAction {
  id: string;
  interventionType: InterventionType;
  title: string;
  details: string;
  threshold: ActionThreshold;
  automation: ActionAutomation;
  owner: "command_center" | "supply_chain" | "plant_ops" | "logistics";
  status: "queued" | "auto-running" | "awaiting-approval";
}

export interface ScenarioVersion {
  id: StrategyMode;
  label: string;
  mode: StrategyMode;
  assumptions: ScenarioAssumptions;
  enabledInterventions: InterventionType[];
  responsePlan: ResponseAction[];
  outcome: ScenarioOutcome;
}

export interface ExecutiveAnswer {
  summary: string;
  recommendedActions: string[];
  responseChecklist: string[];
  estimatedImpact: string[];
  assumptions: string[];
  confidence: string;
  followUps: string[];
}

export const BASELINE_ASSUMPTIONS: ScenarioAssumptions = {
  outageDurationDays: 14,
  spareCapacityPct: 18,
  laborAvailabilityPct: 82,
  freightMode: "standard",
  supplierLeadTimeDays: 11,
  serviceLevelPriority: "balanced",
  skuPriority: "all",
};

export const INTERVENTION_LIBRARY: InterventionDefinition[] = [
  {
    type: "reroute_volume",
    label: "Reroute volume",
    description: "Shift Dallas volume into Phoenix, Atlanta, and Los Angeles.",
    estimatedCost: 460_000,
    marginLiftPct: 1.4,
    serviceLiftPct: 2.6,
    recoveryLiftDays: 2.2,
  },
  {
    type: "add_overtime",
    label: "Add overtime",
    description: "Increase available labor across receiving plants for 3 weeks.",
    estimatedCost: 280_000,
    marginLiftPct: 0.8,
    serviceLiftPct: 1.8,
    recoveryLiftDays: 1.0,
  },
  {
    type: "expedite_freight",
    label: "Expedite freight",
    description: "Upgrade selected lanes to faster freight to reduce transit delays.",
    estimatedCost: 390_000,
    marginLiftPct: 1.1,
    serviceLiftPct: 2.2,
    recoveryLiftDays: 1.4,
  },
  {
    type: "prioritize_skus",
    label: "Prioritize SKUs",
    description: "Protect high-margin and strategic SKUs while constraining low-priority volume.",
    estimatedCost: 120_000,
    marginLiftPct: 1.8,
    serviceLiftPct: 0.7,
    recoveryLiftDays: 0.5,
  },
  {
    type: "open_overflow_capacity",
    label: "Open overflow capacity",
    description: "Bring overflow capacity online at partner or overflow sites.",
    estimatedCost: 520_000,
    marginLiftPct: 0.9,
    serviceLiftPct: 2.9,
    recoveryLiftDays: 2.4,
  },
  {
    type: "shift_labor",
    label: "Shift labor",
    description: "Redeploy labor from lower-priority sites into constrained plants.",
    estimatedCost: 210_000,
    marginLiftPct: 0.6,
    serviceLiftPct: 1.5,
    recoveryLiftDays: 0.9,
  },
];

const interventionByType = Object.fromEntries(
  INTERVENTION_LIBRARY.map((item) => [item.type, item]),
) as Record<InterventionType, InterventionDefinition>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function formatMillions(value: number) {
  const abs = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
}

export function formatDeltaPct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function getChangedAssumptions(assumptions: ScenarioAssumptions) {
  const changes: string[] = [];
  if (assumptions.outageDurationDays !== BASELINE_ASSUMPTIONS.outageDurationDays) {
    changes.push(`Outage ${assumptions.outageDurationDays}d vs ${BASELINE_ASSUMPTIONS.outageDurationDays}d baseline`);
  }
  if (assumptions.spareCapacityPct !== BASELINE_ASSUMPTIONS.spareCapacityPct) {
    changes.push(`Spare capacity ${assumptions.spareCapacityPct}% vs ${BASELINE_ASSUMPTIONS.spareCapacityPct}%`);
  }
  if (assumptions.laborAvailabilityPct !== BASELINE_ASSUMPTIONS.laborAvailabilityPct) {
    changes.push(`Labor availability ${assumptions.laborAvailabilityPct}% vs ${BASELINE_ASSUMPTIONS.laborAvailabilityPct}%`);
  }
  if (assumptions.freightMode !== BASELINE_ASSUMPTIONS.freightMode) {
    changes.push(`Freight mode ${assumptions.freightMode}`);
  }
  if (assumptions.supplierLeadTimeDays !== BASELINE_ASSUMPTIONS.supplierLeadTimeDays) {
    changes.push(`Supplier lead time ${assumptions.supplierLeadTimeDays}d vs ${BASELINE_ASSUMPTIONS.supplierLeadTimeDays}d`);
  }
  if (assumptions.serviceLevelPriority !== BASELINE_ASSUMPTIONS.serviceLevelPriority) {
    changes.push(`Priority ${assumptions.serviceLevelPriority}`);
  }
  if (assumptions.skuPriority !== BASELINE_ASSUMPTIONS.skuPriority) {
    changes.push(`SKU focus ${assumptions.skuPriority.replace("_", " ")}`);
  }
  return changes;
}

export function getAiRecommendedInterventions(
  assumptions: ScenarioAssumptions,
  selected: InterventionType[],
) {
  const recommended = new Set<InterventionType>(selected);
  if (assumptions.outageDurationDays >= 20) {
    recommended.add("reroute_volume");
    recommended.add("expedite_freight");
  }
  if (assumptions.spareCapacityPct <= 20) {
    recommended.add("open_overflow_capacity");
  }
  if (assumptions.laborAvailabilityPct <= 84) {
    recommended.add("add_overtime");
    recommended.add("shift_labor");
  }
  if (assumptions.serviceLevelPriority !== "margin" || assumptions.skuPriority !== "all") {
    recommended.add("prioritize_skus");
  }
  return Array.from(recommended);
}

export function computeScenarioOutcome(
  assumptions: ScenarioAssumptions,
  enabledInterventions: InterventionType[],
  mode: StrategyMode,
): ScenarioOutcome {
  const durationPenalty = assumptions.outageDurationDays * 0.22;
  const sparePenalty = (30 - assumptions.spareCapacityPct) * 0.55;
  const laborPenalty = (100 - assumptions.laborAvailabilityPct) * 0.24;
  const leadPenalty = assumptions.supplierLeadTimeDays * 0.58;
  const freightPenalty = assumptions.freightMode === "standard" ? 3.6 : 1.3;

  let severity = durationPenalty + sparePenalty + laborPenalty + leadPenalty + freightPenalty;

  if (assumptions.serviceLevelPriority === "service") severity -= 1.8;
  if (assumptions.serviceLevelPriority === "margin") severity += 1.2;
  if (assumptions.skuPriority === "high_margin") severity -= 0.6;
  if (assumptions.skuPriority === "strategic") severity -= 1.0;

  let marginLift = 0;
  let serviceLift = 0;
  let recoveryLift = 0;
  let expediteCost = 0;
  let laborCost = 0;

  for (const type of enabledInterventions) {
    const intervention = interventionByType[type];
    marginLift += intervention.marginLiftPct;
    serviceLift += intervention.serviceLiftPct;
    recoveryLift += intervention.recoveryLiftDays;

    if (type === "expedite_freight") expediteCost += intervention.estimatedCost;
    if (type === "add_overtime" || type === "shift_labor") laborCost += intervention.estimatedCost;
  }

  const modeBonus = mode === "ai" ? 1.2 : mode === "manual" ? 0.35 : 0;
  const netSeverity = Math.max(4, severity - marginLift - serviceLift * 0.35 - recoveryLift * 0.3 - modeBonus);

  const marginDeltaPct = clamp(-(netSeverity * 0.32), -18, -1.2);
  const revenueDelta = Math.round(marginDeltaPct * 1_320_000);
  const recoveryDays = clamp(4 + netSeverity * 0.64 - recoveryLift * 0.75 - modeBonus * 0.45, 4, 32);
  const serviceLevelPct = clamp(97 - netSeverity * 0.78 + serviceLift * 0.45 + modeBonus * 0.5, 72, 98.5);
  const confidencePct = clamp(
    88 - assumptions.outageDurationDays * 0.35 - enabledInterventions.length * 1.8 + (mode === "ai" ? 5 : 0),
    62,
    93,
  );

  const totalCost = enabledInterventions.reduce((sum, type) => sum + interventionByType[type].estimatedCost, 0);
  const summary = `${mode === "ai" ? "AI plan" : mode === "manual" ? "Manual plan" : "Control case"} projects ${formatMillions(revenueDelta)} revenue impact, ${serviceLevelPct.toFixed(1)}% service, and ${recoveryDays.toFixed(1)} days to steady state on ${totalCost > 0 ? `${formatMillions(totalCost)} execution cost` : "no intervention spend"}.`;

  return {
    revenueDelta,
    marginDeltaPct,
    recoveryDays,
    serviceLevelPct,
    expediteCost,
    laborCost,
    confidencePct,
    summary,
  };
}

export function buildScenarioVersions(
  assumptions: ScenarioAssumptions,
  selectedInterventions: InterventionType[],
): Record<StrategyMode, ScenarioVersion> {
  const aiInterventions = getAiRecommendedInterventions(assumptions, selectedInterventions);

  return {
    baseline: {
      id: "baseline",
      label: "Control",
      mode: "baseline",
      assumptions,
      enabledInterventions: [],
      responsePlan: buildResponsePlan([], "baseline", assumptions),
      outcome: computeScenarioOutcome(assumptions, [], "baseline"),
    },
    manual: {
      id: "manual",
      label: "Manual response",
      mode: "manual",
      assumptions,
      enabledInterventions: selectedInterventions,
      responsePlan: buildResponsePlan(selectedInterventions, "manual", assumptions),
      outcome: computeScenarioOutcome(assumptions, selectedInterventions, "manual"),
    },
    ai: {
      id: "ai",
      label: "AI-optimized",
      mode: "ai",
      assumptions,
      enabledInterventions: aiInterventions,
      responsePlan: buildResponsePlan(aiInterventions, "ai", assumptions),
      outcome: computeScenarioOutcome(assumptions, aiInterventions, "ai"),
    },
  };
}

export function getBestStrategy(
  scenarios: Record<StrategyMode, ScenarioVersion>,
  objective: ScenarioObjective,
) {
  const versions = Object.values(scenarios);

  if (objective === "service_level") {
    return versions.reduce((best, next) =>
      next.outcome.serviceLevelPct > best.outcome.serviceLevelPct ? next : best,
    );
  }

  if (objective === "recovery_time") {
    return versions.reduce((best, next) =>
      next.outcome.recoveryDays < best.outcome.recoveryDays ? next : best,
    );
  }

  return versions.reduce((best, next) =>
    next.outcome.marginDeltaPct > best.outcome.marginDeltaPct ? next : best,
  );
}

export function getObjectiveLabel(objective: ScenarioObjective) {
  switch (objective) {
    case "service_level":
      return "Service level";
    case "recovery_time":
      return "Recovery time";
    case "margin":
    default:
      return "Margin";
  }
}

export function getStrategyLabel(mode: StrategyMode) {
  switch (mode) {
    case "baseline":
      return "Control";
    case "manual":
      return "Manual response";
    case "ai":
    default:
      return "AI-optimized";
  }
}

function getActionTemplate(type: InterventionType, assumptions: ScenarioAssumptions) {
  switch (type) {
    case "reroute_volume":
      return {
        title: "Reroute Dallas volume",
        details: `Shift constrained Dallas output into Phoenix, Atlanta, and Los Angeles for the next ${Math.min(assumptions.outageDurationDays, 14)} days.`,
        owner: "logistics" as const,
      };
    case "add_overtime":
      return {
        title: "Increase overtime coverage",
        details: `Increase receiving-plant labor coverage while labor availability is ${assumptions.laborAvailabilityPct}%.`,
        owner: "plant_ops" as const,
      };
    case "expedite_freight":
      return {
        title: "Expedite freight lanes",
        details: `Upgrade key inbound and cross-country lanes while supplier lead time is ${assumptions.supplierLeadTimeDays} days.`,
        owner: "logistics" as const,
      };
    case "prioritize_skus":
      return {
        title: "Protect high-priority SKUs",
        details: `Protect ${assumptions.skuPriority.replace("_", " ")} assortments and defer lower-priority volume.`,
        owner: "command_center" as const,
      };
    case "open_overflow_capacity":
      return {
        title: "Open overflow capacity",
        details: "Bring overflow or partner capacity online to preserve service-level commitments.",
        owner: "supply_chain" as const,
      };
    case "shift_labor":
      return {
        title: "Shift labor to constrained sites",
        details: "Redeploy labor from lower-priority plants into the constrained corridor.",
        owner: "plant_ops" as const,
      };
  }
}

function getActionControls(type: InterventionType, mode: StrategyMode): Pick<ResponseAction, "threshold" | "automation" | "status"> {
  if (mode === "baseline") {
    return { threshold: "L", automation: "modify", status: "queued" };
  }

  if (mode === "manual") {
    const highApproval = type === "open_overflow_capacity" || type === "expedite_freight";
    return {
      threshold: highApproval ? "H" : type === "reroute_volume" ? "M" : "L",
      automation: highApproval ? "approve" : "modify",
      status: highApproval ? "awaiting-approval" : "queued",
    };
  }

  if (type === "reroute_volume" || type === "prioritize_skus" || type === "shift_labor") {
    return { threshold: "M", automation: "auto", status: "auto-running" };
  }

  if (type === "expedite_freight" || type === "open_overflow_capacity") {
    return { threshold: "H", automation: "approve", status: "awaiting-approval" };
  }

  return { threshold: "L", automation: "modify", status: "queued" };
}

export function buildResponsePlan(
  interventions: InterventionType[],
  mode: StrategyMode,
  assumptions: ScenarioAssumptions,
): ResponseAction[] {
  if (mode === "baseline") {
    return [
      {
        id: "baseline-observe",
        interventionType: "reroute_volume",
        title: "Observe baseline network",
        details: "Hold the current operating plan and wait for the incident trigger before taking action.",
        threshold: "L",
        automation: "modify",
        owner: "command_center",
        status: "queued",
      },
    ];
  }

  return interventions.map((type) => {
    const template = getActionTemplate(type, assumptions);
    const controls = getActionControls(type, mode);
    return {
      id: `${mode}-${type}`,
      interventionType: type,
      title: template.title,
      details: template.details,
      owner: template.owner,
      ...controls,
    };
  });
}

export function generateExecutiveAnswer(
  question: string,
  scenario: ScenarioVersion,
  best: ScenarioVersion,
) : ExecutiveAnswer {
  const { assumptions, enabledInterventions, outcome } = scenario;
  const bestIsCurrent = best.mode === scenario.mode;
  const actionLabels = enabledInterventions.map((type) => interventionByType[type].label);

  return {
    summary: `${question.includes("Q3 margin") ? "Q3 margin" : "This scenario"} is projected at ${outcome.marginDeltaPct.toFixed(1)}% versus plan with recovery in ${outcome.recoveryDays.toFixed(1)} days. ${bestIsCurrent ? "Current strategy is already the strongest option." : `${best.label} is outperforming the current strategy on the current decision objective.`}`,
    recommendedActions: actionLabels.length > 0 ? actionLabels : ["No mitigation actions selected yet"],
    responseChecklist: scenario.responsePlan.map((action) => `${action.threshold} · ${action.automation} · ${action.title}`),
    estimatedImpact: [
      `Revenue impact ${formatMillions(outcome.revenueDelta)}`,
      `Service level ${outcome.serviceLevelPct.toFixed(1)}%`,
      `Recovery ${outcome.recoveryDays.toFixed(1)} days`,
    ],
    assumptions: [
      `${assumptions.outageDurationDays}-day outage`,
      `${assumptions.spareCapacityPct}% spare capacity`,
      `${assumptions.laborAvailabilityPct}% labor availability`,
      `${assumptions.freightMode} freight and ${assumptions.supplierLeadTimeDays}-day supplier lead time`,
    ],
    confidence: `${Math.round(outcome.confidencePct)}% confidence`,
    followUps: [
      "What changes if we protect service level over margin?",
      "Show me the gap between manual and AI response.",
      "Which intervention is doing the most work here?",
    ],
  };
}
