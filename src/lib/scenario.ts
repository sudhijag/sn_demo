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
export type TaskPriority = "low" | "medium" | "high";
export type TaskResolution =
  | "open"
  | "auto-approved"
  | "awaiting-approval"
  | "user-approved"
  | "modified"
  | "rejected"
  | "completed";
export type TaskConfidenceBand = "high" | "medium" | "low";
export type TaskAssignee = "ai" | "human";
export type ResponsePlanStatus = "control" | "generated" | "in_progress" | "completed";

export interface PlanTask {
  id: string;
  title: string;
  details: string;
  rationale: string;
  suggestedFix: string;
  owner: "command_center" | "supply_chain" | "plant_ops" | "logistics";
  assignee: TaskAssignee;
  priority: TaskPriority;
  confidenceBand: TaskConfidenceBand;
  threshold: ActionThreshold;
  automation: ActionAutomation;
  resolution: TaskResolution;
  interventionType: InterventionType | null;
  estimatedCost: number;
  impactSummary: string;
  openedAtTick: number;
  closedAtTick: number | null;
}

export interface ResponsePlan {
  id: string;
  title: string;
  summary: string;
  status: ResponsePlanStatus;
  createdFrom: {
    mode: StrategyMode;
    outageDurationDays: number;
    spareCapacityPct: number;
  };
  tasks: PlanTask[];
}

export interface ScenarioVersion {
  id: StrategyMode;
  label: string;
  mode: StrategyMode;
  assumptions: ScenarioAssumptions;
  enabledInterventions: InterventionType[];
  responsePlan: ResponsePlan;
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

export type InvestmentTrack = "logistics" | "labor" | "resilience" | "sourcing";
export type InvestmentId =
  | "logistics_control_tower"
  | "logistics_priority_freight"
  | "labor_flex_pool"
  | "labor_cross_training"
  | "resilience_buffer_capacity"
  | "resilience_recovery_drills"
  | "sourcing_alt_suppliers"
  | "sourcing_priority_contracts";

export interface InvestmentDefinition {
  id: InvestmentId;
  track: InvestmentTrack;
  tier: 1 | 2;
  cost: number;
  label: string;
  description: string;
  requires?: InvestmentId;
  assumptionDelta?: Partial<Record<keyof Pick<ScenarioAssumptions, "outageDurationDays" | "spareCapacityPct" | "laborAvailabilityPct" | "supplierLeadTimeDays">, number>>;
  assumptionSet?: Partial<Pick<ScenarioAssumptions, "freightMode" | "serviceLevelPriority" | "skuPriority">>;
  runtime?: {
    mitigationBonus?: number;
    flowMitigationBonus?: number;
    throughputBonus?: number;
  };
}

export interface InvestmentRuntimeEffects {
  mitigationBonus: number;
  flowMitigationBonus: number;
  throughputBonus: number;
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

export const STARTING_INVESTMENT_CAPITAL = 1_100_000;

export const INVESTMENT_LIBRARY: InvestmentDefinition[] = [
  {
    id: "logistics_control_tower",
    track: "logistics",
    tier: 1,
    cost: 450_000,
    label: "Lane Control Tower",
    description: "Prebuild reroute playbooks so the network can redirect volume faster when Dallas goes down.",
    assumptionDelta: { spareCapacityPct: 2 },
    runtime: { flowMitigationBonus: 1, mitigationBonus: 0.04 },
  },
  {
    id: "logistics_priority_freight",
    track: "logistics",
    tier: 2,
    cost: 680_000,
    requires: "logistics_control_tower",
    label: "Priority Freight Contracts",
    description: "Lock in premium carrier access for the lanes that matter most during the response window.",
    assumptionDelta: { supplierLeadTimeDays: -1 },
    assumptionSet: { freightMode: "expedited" },
    runtime: { flowMitigationBonus: 1, mitigationBonus: 0.05 },
  },
  {
    id: "labor_flex_pool",
    track: "labor",
    tier: 1,
    cost: 420_000,
    label: "Flex Labor Bench",
    description: "Maintain a reserve bench of labor that can be pulled into backup plants quickly.",
    assumptionDelta: { laborAvailabilityPct: 6 },
    runtime: { throughputBonus: 0.03 },
  },
  {
    id: "labor_cross_training",
    track: "labor",
    tier: 2,
    cost: 610_000,
    requires: "labor_flex_pool",
    label: "Cross-Training Program",
    description: "Cross-train crews so Phoenix and Atlanta can absorb more work without stalling.",
    assumptionDelta: { laborAvailabilityPct: 4, spareCapacityPct: 3 },
    runtime: { mitigationBonus: 0.04, throughputBonus: 0.05 },
  },
  {
    id: "resilience_buffer_capacity",
    track: "resilience",
    tier: 1,
    cost: 480_000,
    label: "Buffer Capacity",
    description: "Invest in extra spare capacity so the network can take a hit without collapsing.",
    assumptionDelta: { spareCapacityPct: 5 },
    runtime: { mitigationBonus: 0.03, throughputBonus: 0.02 },
  },
  {
    id: "resilience_recovery_drills",
    track: "resilience",
    tier: 2,
    cost: 720_000,
    requires: "resilience_buffer_capacity",
    label: "Recovery Drills",
    description: "Practice outage recovery so Dallas and the downstream plants recover faster under pressure.",
    assumptionDelta: { outageDurationDays: -3 },
    runtime: { mitigationBonus: 0.09, throughputBonus: 0.04 },
  },
  {
    id: "sourcing_alt_suppliers",
    track: "sourcing",
    tier: 1,
    cost: 390_000,
    label: "Alternate Suppliers",
    description: "Qualify secondary suppliers in advance so inbound parts arrive faster during disruption.",
    assumptionDelta: { supplierLeadTimeDays: -2 },
    runtime: { mitigationBonus: 0.03 },
  },
  {
    id: "sourcing_priority_contracts",
    track: "sourcing",
    tier: 2,
    cost: 640_000,
    requires: "sourcing_alt_suppliers",
    label: "Priority Allocation Contracts",
    description: "Negotiate priority allocation on critical components so strategic product lines stay moving.",
    assumptionDelta: { supplierLeadTimeDays: -2 },
    assumptionSet: { skuPriority: "strategic" },
    runtime: { mitigationBonus: 0.05, throughputBonus: 0.03 },
  },
];

export const INVESTMENT_BY_ID = Object.fromEntries(
  INVESTMENT_LIBRARY.map((investment) => [investment.id, investment]),
) as Record<InvestmentId, InvestmentDefinition>;

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

export function formatInvestmentCost(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

export function applyInvestmentsToAssumptions(
  assumptions: ScenarioAssumptions,
  purchasedInvestments: InvestmentId[],
) {
  const next: ScenarioAssumptions = { ...assumptions };

  for (const id of purchasedInvestments) {
    const investment = INVESTMENT_BY_ID[id];
    if (!investment) continue;

    if (investment.assumptionDelta?.outageDurationDays) {
      next.outageDurationDays = Math.max(4, next.outageDurationDays + investment.assumptionDelta.outageDurationDays);
    }
    if (investment.assumptionDelta?.spareCapacityPct) {
      next.spareCapacityPct = Math.min(40, Math.max(10, next.spareCapacityPct + investment.assumptionDelta.spareCapacityPct));
    }
    if (investment.assumptionDelta?.laborAvailabilityPct) {
      next.laborAvailabilityPct = Math.min(100, Math.max(70, next.laborAvailabilityPct + investment.assumptionDelta.laborAvailabilityPct));
    }
    if (investment.assumptionDelta?.supplierLeadTimeDays) {
      next.supplierLeadTimeDays = Math.max(5, next.supplierLeadTimeDays + investment.assumptionDelta.supplierLeadTimeDays);
    }
    if (investment.assumptionSet?.freightMode) next.freightMode = investment.assumptionSet.freightMode;
    if (investment.assumptionSet?.serviceLevelPriority) next.serviceLevelPriority = investment.assumptionSet.serviceLevelPriority;
    if (investment.assumptionSet?.skuPriority) next.skuPriority = investment.assumptionSet.skuPriority;
  }

  return next;
}

export function getInvestmentRuntimeEffects(purchasedInvestments: InvestmentId[]): InvestmentRuntimeEffects {
  return purchasedInvestments.reduce<InvestmentRuntimeEffects>(
    (acc, id) => {
      const runtime = INVESTMENT_BY_ID[id]?.runtime;
      if (!runtime) return acc;
      return {
        mitigationBonus: acc.mitigationBonus + (runtime.mitigationBonus ?? 0),
        flowMitigationBonus: acc.flowMitigationBonus + (runtime.flowMitigationBonus ?? 0),
        throughputBonus: acc.throughputBonus + (runtime.throughputBonus ?? 0),
      };
    },
    { mitigationBonus: 0, flowMitigationBonus: 0, throughputBonus: 0 },
  );
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
        title: "Move Dallas work to other plants",
        details: `Temporarily move part of Dallas production to Phoenix, Atlanta, and Los Angeles for the next ${Math.min(assumptions.outageDurationDays, 14)} days.`,
        rationale: "If we leave the work in Dallas, downstream plants run short. Moving the work buys time while Dallas recovers.",
        owner: "logistics" as const,
        suggestedFix: "Shift about 20% of Dallas volume to Phoenix, Atlanta, and Los Angeles until the outage settles down.",
        priority: "medium" as const,
        confidenceBand: "medium" as const,
      };
    case "add_overtime":
      return {
        title: "Add overtime at backup plants",
        details: `Add extra shifts at the receiving plants while labor availability is only ${assumptions.laborAvailabilityPct}%.`,
        rationale: "The backup plants can take more volume, but only if we put more people on the floor.",
        owner: "plant_ops" as const,
        suggestedFix: "Approve three weeks of overtime in Phoenix and Atlanta so they can handle the extra work.",
        priority: "medium" as const,
        confidenceBand: "medium" as const,
      };
    case "expedite_freight":
      return {
        title: "Pay for faster freight",
        details: `Use faster shipping on the most important lanes while supplier lead time is ${assumptions.supplierLeadTimeDays} days.`,
        rationale: "Faster freight can reduce delays quickly, but it costs more and may not pay off if the outage clears sooner than expected.",
        owner: "logistics" as const,
        suggestedFix: "Approve expedited freight only on the most time-sensitive lanes for the next 10 days.",
        priority: "high" as const,
        confidenceBand: "low" as const,
      };
    case "prioritize_skus":
      return {
        title: "Focus on the most important SKUs",
        details: `Keep ${assumptions.skuPriority.replace("_", " ")} products moving first and delay lower-priority items.`,
        rationale: "When capacity is tight, serving the most important products first protects customers and keeps the business impact smaller.",
        owner: "command_center" as const,
        suggestedFix: "Temporarily prioritize strategic and high-margin SKUs until Dallas is stable again.",
        priority: "low" as const,
        confidenceBand: "high" as const,
      };
    case "open_overflow_capacity":
      return {
        title: "Open partner overflow capacity",
        details: "Bring in outside or overflow capacity to keep customer commitments on track.",
        rationale: "This can protect service during a long outage, but it is expensive and takes coordination across partners.",
        owner: "supply_chain" as const,
        suggestedFix: "Open partner overflow capacity for 2 to 3 weeks if protecting service is worth the added cost.",
        priority: "high" as const,
        confidenceBand: "low" as const,
      };
    case "shift_labor":
      return {
        title: "Move labor to the busiest plants",
        details: "Temporarily move labor from lower-priority sites to the plants under the most pressure.",
        rationale: "This is usually a quick, lower-risk way to relieve bottlenecks without making a large spend decision.",
        owner: "plant_ops" as const,
        suggestedFix: "Temporarily redeploy labor into Phoenix and Atlanta receiving lines during the response window.",
        priority: "low" as const,
        confidenceBand: "high" as const,
      };
  }
}

function getActionControls(type: InterventionType, mode: StrategyMode): Pick<PlanTask, "threshold" | "automation" | "resolution" | "assignee"> {
  if (mode === "baseline") {
    return { threshold: "L", automation: "modify", resolution: "open", assignee: "human" };
  }

  if (mode === "manual") {
    const highApproval = type === "open_overflow_capacity" || type === "expedite_freight";
    return {
      threshold: highApproval ? "H" : type === "reroute_volume" ? "M" : "L",
      automation: highApproval ? "approve" : "modify",
      resolution: highApproval ? "awaiting-approval" : "open",
      assignee: "human",
    };
  }

  if (type === "prioritize_skus" || type === "shift_labor") {
    return { threshold: "L", automation: "modify", resolution: "open", assignee: "ai" };
  }

  if (type === "expedite_freight" || type === "open_overflow_capacity") {
    return { threshold: "H", automation: "approve", resolution: "awaiting-approval", assignee: "human" };
  }

  if (type === "reroute_volume") {
    return { threshold: "M", automation: "modify", resolution: "open", assignee: "ai" };
  }

  return { threshold: "M", automation: "modify", resolution: "open", assignee: "human" };
}

function getImpactSummary(type: InterventionType) {
  const intervention = interventionByType[type];
  return `Estimated effect: ${formatDeltaPct(intervention.marginLiftPct)} margin, +${intervention.serviceLiftPct.toFixed(1)} service points, and ${intervention.recoveryLiftDays.toFixed(1)} days faster recovery.`;
}

export function isSafeTask(task: PlanTask) {
  return (
    task.priority === "low" &&
    (task.automation === "auto" || task.automation === "modify") &&
    task.interventionType !== "expedite_freight" &&
    task.interventionType !== "open_overflow_capacity" &&
    task.interventionType !== "reroute_volume"
  );
}

function buildPlanTask(
  type: InterventionType,
  mode: StrategyMode,
  assumptions: ScenarioAssumptions,
  openedAtTick: number,
): PlanTask {
  const template = getActionTemplate(type, assumptions);
  const controls = getActionControls(type, mode);
  return {
    id: `${mode}-${type}`,
    interventionType: type,
    title: template.title,
    details: template.details,
    rationale: template.rationale,
    suggestedFix: template.suggestedFix,
    owner: template.owner,
    priority: template.priority,
    confidenceBand: template.confidenceBand,
    estimatedCost: interventionByType[type].estimatedCost,
    impactSummary: getImpactSummary(type),
    openedAtTick,
    closedAtTick: controls.resolution === "auto-approved" ? openedAtTick : null,
    ...controls,
  };
}

export function buildResponsePlan(
  interventions: InterventionType[],
  mode: StrategyMode,
  assumptions: ScenarioAssumptions,
  openedAtTick = 0,
): ResponsePlan {
  if (mode === "baseline") {
    return {
      id: "control-plan",
      title: "Control case",
      summary: "No intervention package is active yet. The command center is monitoring the control case before the disruption response begins.",
      status: "control",
      createdFrom: {
        mode,
        outageDurationDays: assumptions.outageDurationDays,
        spareCapacityPct: assumptions.spareCapacityPct,
      },
      tasks: [
        {
          id: "baseline-observe",
          interventionType: null,
          title: "Watch the baseline first",
          details: "Do not change anything yet. Watch the normal network before the disruption begins.",
          rationale: "We need a clean baseline so we can measure how much the outage changes performance.",
          suggestedFix: "No action yet. Let the simulation show the baseline before the outage starts.",
          owner: "command_center",
          assignee: "human",
          priority: "low",
          confidenceBand: "high",
          threshold: "L",
          automation: "modify",
          resolution: "open",
          estimatedCost: 0,
          impactSummary: "Reference case only",
          openedAtTick,
          closedAtTick: null,
        },
      ],
    };
  }

  const tasks = interventions.map((type) => buildPlanTask(type, mode, assumptions, openedAtTick));
  const openCount = tasks.filter((task) => !["auto-approved", "completed"].includes(task.resolution)).length;
  const summary = openCount === 0
    ? "The AI plan has no unresolved exceptions right now."
    : `${openCount} task${openCount === 1 ? "" : "s"} need review or tracking in the current response window.`;

  return {
    id: `${mode}-response-plan`,
    title: mode === "ai" ? "AI response plan" : "Manual response plan",
    summary,
    status: openCount === 0 ? "completed" : "generated",
    createdFrom: {
      mode,
      outageDurationDays: assumptions.outageDurationDays,
      spareCapacityPct: assumptions.spareCapacityPct,
    },
    tasks,
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

export function sortPlanTasks(tasks: PlanTask[]) {
  const groupScore: Record<TaskResolution, number> = {
    open: 0,
    "awaiting-approval": 1,
    modified: 2,
    rejected: 3,
    "user-approved": 4,
    "auto-approved": 5,
    completed: 6,
  };
  const confidenceScore: Record<TaskConfidenceBand, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };
  const priorityScore: Record<TaskPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...tasks].sort((a, b) => {
    const aCompleted = a.resolution === "auto-approved" || a.resolution === "completed";
    const bCompleted = b.resolution === "auto-approved" || b.resolution === "completed";
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

    if (a.confidenceBand !== b.confidenceBand) {
      return confidenceScore[a.confidenceBand] - confidenceScore[b.confidenceBand];
    }

    if (groupScore[a.resolution] !== groupScore[b.resolution]) {
      return groupScore[a.resolution] - groupScore[b.resolution];
    }

    if (priorityScore[a.priority] !== priorityScore[b.priority]) {
      return priorityScore[a.priority] - priorityScore[b.priority];
    }

    return a.title.localeCompare(b.title);
  });
}

export function generateTaskExplanation(task: PlanTask, scenario: ScenarioVersion) {
  return [
    `Task: ${task.title}`,
    `Why it matters: ${task.rationale}`,
    `What to do: ${task.suggestedFix}`,
    `Expected effect: ${task.impactSummary}`,
    `Current status: ${task.resolution.replace("-", " ")} with ${Math.round(scenario.outcome.confidencePct)}% overall scenario confidence.`,
  ].join("\n\n");
}

export function generateExecutiveAnswer(
  question: string,
  scenario: ScenarioVersion,
  best: ScenarioVersion,
): ExecutiveAnswer {
  const { assumptions, enabledInterventions, outcome } = scenario;
  const bestIsCurrent = best.mode === scenario.mode;
  const actionLabels = enabledInterventions.map((type) => interventionByType[type].label);
  const trimmedQuestion = question.trim().toLowerCase();
  const riskQuestion = trimmedQuestion.includes("risk");
  const actionableTasks = scenario.responsePlan.tasks.filter((task) => task.interventionType !== null);
  const riskyTasks = actionableTasks.filter((task) => task.confidenceBand === "low" || task.priority === "high");
  const fourthRiskTask = riskyTasks[1] ?? riskyTasks[0] ?? actionableTasks[3] ?? actionableTasks[actionableTasks.length - 1] ?? null;

  if (riskQuestion && fourthRiskTask) {
    return {
      summary: `The risk with the fourth task, "${fourthRiskTask.title}," is execution drift. ${fourthRiskTask.rationale}`,
      recommendedActions: [fourthRiskTask.suggestedFix],
      responseChecklist: [
        `Why it can go wrong: ${fourthRiskTask.rationale}`,
        `Cost exposure: ${fourthRiskTask.estimatedCost > 0 ? formatMillions(fourthRiskTask.estimatedCost) : "No direct spend"}`,
        `Confidence on this move: ${fourthRiskTask.confidenceBand}`,
      ],
      estimatedImpact: [fourthRiskTask.impactSummary],
      assumptions: [
        `${assumptions.outageDurationDays}-day outage`,
        `${assumptions.supplierLeadTimeDays}-day supplier lead time`,
      ],
      confidence: `${Math.round(outcome.confidencePct)}% scenario confidence overall. This particular move is marked ${fourthRiskTask.confidenceBand} confidence.`,
      followUps: [
        `What happens if we delay "${fourthRiskTask.title}"?`,
        `Show me a safer version of "${fourthRiskTask.title}".`,
        `What is the upside if "${fourthRiskTask.title}" works?`,
      ],
    };
  }

  return {
    summary: `${question.includes("Q3 margin") ? "Q3 margin" : "This scenario"} is projected at ${outcome.marginDeltaPct.toFixed(1)}% versus plan with recovery in ${outcome.recoveryDays.toFixed(1)} days. ${bestIsCurrent ? "Current strategy is already the strongest option." : `${best.label} is outperforming the current strategy on the current decision objective.`}`,
    recommendedActions: actionLabels.length > 0 ? actionLabels : ["No mitigation actions selected yet"],
    responseChecklist: scenario.responsePlan.tasks.map((task) => `${task.threshold} · ${task.automation} · ${task.title}`),
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
