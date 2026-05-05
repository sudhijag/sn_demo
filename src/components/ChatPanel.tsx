import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import {
  BASELINE_ASSUMPTIONS,
  INTERVENTION_LIBRARY,
  formatMillions,
  generateExecutiveAnswer,
  getStrategyLabel,
  getChangedAssumptions,
  type InterventionType,
  type ResponseAction,
  type ScenarioAssumptions,
  type ScenarioObjective,
  type StrategyMode,
} from "@/lib/scenario";

type Message = { role: "user" | "assistant"; content: string };
type PanelTab = "assumptions" | "plan" | "compare";

const suggestions = [
  "What happens to Q3 margin if Dallas stays down 30 more days?",
  "Approve expedite freight but keep overflow capacity pending.",
  "Combine reroute volume, overtime, and protected SKUs into one response plan.",
];

const strategyLabels: Record<StrategyMode, string> = {
  baseline: "Control",
  manual: "Manual",
  ai: "AI",
};

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" }) {
  const cls = tone === "green" ? "text-primary bg-primary/10" : tone === "amber" ? "text-sn-warning bg-sn-warning/10" : "text-muted-foreground bg-secondary";
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-[0.12em] ${cls}`}>{children}</span>;
}

function NumberField({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="card-surface p-2.5 block">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-mono text-foreground">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--sn-green)]"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="card-surface p-2.5 block">
      <div className="text-[10px] text-muted-foreground mb-1.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-secondary rounded-md px-2.5 py-1.5 text-[11px] text-foreground outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssumptionsTab({
  assumptions,
  updateAssumption,
}: {
  assumptions: ScenarioAssumptions;
  updateAssumption: <K extends keyof ScenarioAssumptions>(key: K, value: ScenarioAssumptions[K]) => void;
}) {
  return (
    <div className="space-y-2">
      <NumberField label="Outage duration" value={assumptions.outageDurationDays} suffix="d" min={5} max={45} onChange={(value) => updateAssumption("outageDurationDays", value)} />
      <NumberField label="Spare capacity" value={assumptions.spareCapacityPct} suffix="%" min={5} max={40} onChange={(value) => updateAssumption("spareCapacityPct", value)} />
      <NumberField label="Labor availability" value={assumptions.laborAvailabilityPct} suffix="%" min={60} max={100} onChange={(value) => updateAssumption("laborAvailabilityPct", value)} />
      <NumberField label="Supplier lead time" value={assumptions.supplierLeadTimeDays} suffix="d" min={4} max={21} onChange={(value) => updateAssumption("supplierLeadTimeDays", value)} />
      <SelectField label="Freight mode" value={assumptions.freightMode} options={[{ label: "Standard", value: "standard" }, { label: "Expedited", value: "expedited" }]} onChange={(value) => updateAssumption("freightMode", value)} />
      <SelectField label="Service-level priority" value={assumptions.serviceLevelPriority} options={[{ label: "Balanced", value: "balanced" }, { label: "Protect margin", value: "margin" }, { label: "Protect service", value: "service" }]} onChange={(value) => updateAssumption("serviceLevelPriority", value)} />
      <SelectField label="SKU prioritization" value={assumptions.skuPriority} options={[{ label: "All SKUs", value: "all" }, { label: "High margin", value: "high_margin" }, { label: "Strategic", value: "strategic" }]} onChange={(value) => updateAssumption("skuPriority", value)} />
    </div>
  );
}

function AssumptionsSummary({
  assumptions,
  onOpen,
}: {
  assumptions: ScenarioAssumptions;
  onOpen: () => void;
}) {
  const changes = getChangedAssumptions(assumptions);
  const rows = [
    `Outage ${assumptions.outageDurationDays}d`,
    `Spare ${assumptions.spareCapacityPct}%`,
    `Labor ${assumptions.laborAvailabilityPct}%`,
    `${assumptions.freightMode} freight`,
  ];

  return (
    <div className="card-surface px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold text-foreground">Active assumptions</div>
        <button
          onClick={onOpen}
          className="w-7 h-7 rounded-md border border-border bg-secondary hover:bg-sn-surface-hover flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit assumptions"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 10.91 3H11a2 2 0 0 1 4 0h.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 21 10.91V11a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <Pill key={row}>{row}</Pill>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground leading-tight">
        {changes.length > 0
          ? `Changed from control: ${changes.join(" · ")}`
          : `Matching control assumptions: ${BASELINE_ASSUMPTIONS.outageDurationDays}d outage, ${BASELINE_ASSUMPTIONS.spareCapacityPct}% spare capacity, ${BASELINE_ASSUMPTIONS.laborAvailabilityPct}% labor.`}
      </div>
    </div>
  );
}

function ResponseActionCard({
  action,
  active,
  onToggle,
}: {
  action: ResponseAction;
  active: boolean;
  onToggle?: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={!onToggle}
      className={`w-full text-left card-surface px-3 py-2 border transition-colors ${active ? "border-primary bg-primary/5" : "border-border"} ${onToggle ? "" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-foreground">{action.title}</div>
          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{action.details}</div>
        </div>
        {onToggle && <div className={`w-2 h-2 rounded-full mt-1 ${active ? "bg-primary" : "bg-muted"}`} />}
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <Pill tone={action.automation === "auto" ? "green" : action.automation === "approve" ? "amber" : "neutral"}>{action.automation}</Pill>
        <Pill>{action.threshold}</Pill>
        <Pill>{action.owner.replace("_", " ")}</Pill>
        <Pill tone={action.status === "auto-running" ? "green" : action.status === "awaiting-approval" ? "amber" : "neutral"}>{action.status}</Pill>
      </div>
    </button>
  );
}

function PlanTab({
  activeTypes,
  toggleIntervention,
  projectedMargin,
  currentPlan,
  aiPlan,
}: {
  activeTypes: InterventionType[];
  toggleIntervention: (type: InterventionType) => void;
  projectedMargin: number;
  currentPlan: ResponseAction[];
  aiPlan: ResponseAction[];
}) {
  return (
    <div className="space-y-3">
      <div className="card-surface px-3 py-2 text-[10px] text-muted-foreground">
        Manual plan margin impact: <span className="font-mono text-primary">{projectedMargin.toFixed(1)}%</span>. Use chat to approve, modify, or ask the command center for a better action mix.
      </div>
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Manual response builder</div>
        {INTERVENTION_LIBRARY.map((intervention) => {
          const active = activeTypes.includes(intervention.type);
          const mapped = currentPlan.find((item) => item.interventionType === intervention.type);
          return (
            <div key={intervention.type} className="space-y-1.5">
              {mapped ? (
                <ResponseActionCard action={mapped} active={active} onToggle={() => toggleIntervention(intervention.type)} />
              ) : (
                <button
                  onClick={() => toggleIntervention(intervention.type)}
                  className="w-full text-left card-surface px-3 py-2 border border-border transition-colors"
                >
                  <div className="text-[11px] font-semibold text-foreground">{intervention.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{intervention.description}</div>
                  <div className="mt-2 text-[9.5px] font-mono text-primary">{formatMillions(intervention.estimatedCost)}</div>
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">AI-optimized runbook</div>
        {aiPlan.map((action) => (
          <ResponseActionCard key={action.id} action={action} active />
        ))}
      </div>
    </div>
  );
}

function CompareTab() {
  const { scenarios, currentScenario, setActiveScenario } = useGameState();
  const ordered = [scenarios.baseline, scenarios.manual, scenarios.ai];

  return (
    <div className="space-y-2">
      <div className="card-surface px-3 py-2 text-[10px] text-muted-foreground">
        Historical control stays fixed. Mix manual and AI actions, then use these snapshots to see what the response is buying you against the replayed event.
      </div>
      {ordered.map((scenario) => {
        const isActive = currentScenario.mode === scenario.mode;
        const revenueDelta = scenario.outcome.revenueDelta - scenarios.baseline.outcome.revenueDelta;
        const serviceDelta = scenario.outcome.serviceLevelPct - scenarios.baseline.outcome.serviceLevelPct;
        const recoveryDelta = scenarios.baseline.outcome.recoveryDays - scenario.outcome.recoveryDays;
        return (
          <button
            key={scenario.mode}
            onClick={() => setActiveScenario(scenario.mode)}
            className={`w-full text-left card-surface px-3 py-2 border transition-colors ${isActive ? "border-primary" : "border-border"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-foreground">{scenario.label}</div>
              <Pill tone={scenario.mode === "baseline" ? "neutral" : scenario.mode === "manual" ? "amber" : "green"}>
                {scenario.mode === "baseline" ? "Historical control" : `${scenario.responsePlan.length} actions`}
              </Pill>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
              <div><div className="text-muted-foreground">Revenue</div><div className="font-mono text-foreground">{formatMillions(scenario.outcome.revenueDelta)}</div></div>
              <div><div className="text-muted-foreground">Vs control</div><div className={`font-mono ${revenueDelta >= 0 ? "text-primary" : "text-sn-danger"}`}>{formatMillions(revenueDelta)}</div></div>
              <div><div className="text-muted-foreground">Service vs control</div><div className={`font-mono ${serviceDelta >= 0 ? "text-primary" : "text-sn-danger"}`}>{formatDeltaPct(serviceDelta)}</div></div>
              <div><div className="text-muted-foreground">Recovery vs control</div><div className={`font-mono ${recoveryDelta >= 0 ? "text-primary" : "text-sn-danger"}`}>{recoveryDelta.toFixed(1)}d</div></div>
              <div><div className="text-muted-foreground">Confidence</div><div className="font-mono text-foreground">{Math.round(scenario.outcome.confidencePct)}%</div></div>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground leading-tight">
              {scenario.mode === "baseline"
                ? "Replay the disruption with no intervention package applied."
                : scenario.responsePlan.slice(0, 3).map((action) => action.title).join(" · ")}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function tryHandleCommand(
  text: string,
  toggleIntervention: (type: InterventionType) => void,
  setObjective: (objective: ScenarioObjective) => void,
) {
  const lower = text.toLowerCase();
  let changed = false;

  const toggles: Array<{ needle: string; type: InterventionType }> = [
    { needle: "reroute", type: "reroute_volume" },
    { needle: "overtime", type: "add_overtime" },
    { needle: "expedite", type: "expedite_freight" },
    { needle: "sku", type: "prioritize_skus" },
    { needle: "overflow", type: "open_overflow_capacity" },
    { needle: "shift labor", type: "shift_labor" },
  ];

  if (lower.includes("objective") || lower.includes("switch to")) {
    if (lower.includes("service")) {
      setObjective("service_level");
      changed = true;
    } else if (lower.includes("recovery")) {
      setObjective("recovery_time");
      changed = true;
    } else if (lower.includes("margin")) {
      setObjective("margin");
      changed = true;
    }
  }

  for (const toggle of toggles) {
    if (lower.includes(toggle.needle)) {
      toggleIntervention(toggle.type);
      changed = true;
    }
  }

  return changed;
}

export default function ChatPanel() {
  const {
    state,
    currentScenario,
    scenarios,
    bestScenario,
    updateAssumption,
    toggleIntervention,
  } = useGameState();
  const [tab, setTab] = useState<PanelTab>("plan");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const seededAnswer = useMemo(
    () => generateExecutiveAnswer("What happens to Q3 margin if Dallas is down 30 more days?", currentScenario, bestScenario),
    [currentScenario, bestScenario],
  );

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: [
          seededAnswer.summary,
          `Recommended: ${seededAnswer.recommendedActions.join(", ")}.`,
          `Checklist: ${seededAnswer.responseChecklist.join(" · ")}.`,
          `Impact: ${seededAnswer.estimatedImpact.join(" · ")}.`,
          `Assumptions: ${seededAnswer.assumptions.join("; ")}.`,
          seededAnswer.confidence,
        ].join("\n\n"),
      },
    ]);
  }, [seededAnswer]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const changed = tryHandleCommand(text.trim(), toggleIntervention, () => undefined);

    setTimeout(() => {
      const answer = generateExecutiveAnswer(text.trim(), currentScenario, bestScenario);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: [
            changed ? "Command Center updated the working plan from your instruction." : answer.summary,
            `Recommended actions: ${answer.recommendedActions.join(", ")}.`,
            `Checklist: ${answer.responseChecklist.join(" · ")}.`,
            `Estimated impact: ${answer.estimatedImpact.join(" · ")}.`,
            `Assumptions: ${answer.assumptions.join("; ")}.`,
            `${answer.confidence}.`,
            `Next questions: ${answer.followUps.join(" ")}`,
          ].join("\n\n"),
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="w-[29rem] flex flex-col border-l border-border bg-card/40">
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <span className="text-xs font-semibold text-foreground">COMMAND CENTER</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            <TabButton active={tab === "plan"} label="Response Plan" onClick={() => setTab("plan")} />
            <TabButton active={tab === "compare"} label="Control vs Response" onClick={() => setTab("compare")} />
            <TabButton active={tab === "assumptions"} label="Assumptions" onClick={() => setTab("assumptions")} />
          </div>
          <Pill tone="green">{strategyLabels[currentScenario.mode]}</Pill>
        </div>
      </div>

      <div className="p-3 border-b border-border space-y-2">
        <div className="card-surface px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold text-foreground">Live strategy brief</div>
            <Pill tone={bestScenario.mode === currentScenario.mode ? "green" : "amber"}>
              {Math.round(currentScenario.outcome.confidencePct)}% confidence
            </Pill>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground leading-tight">
            {currentScenario.mode === "baseline"
              ? "Control case is active. Use the response plan to start layering in actions from manual response and AI guidance."
              : `${currentScenario.responsePlan.length} actions are active in ${getStrategyLabel(currentScenario.mode)}. Low-threshold steps can run automatically; high-threshold steps can be approved or modified in chat.`}
          </div>
        </div>
        <AssumptionsSummary assumptions={state.assumptions} onOpen={() => setTab("assumptions")} />
      </div>

      <div className="p-3 border-b border-border max-h-[22rem] overflow-y-auto">
        {tab === "assumptions" && <AssumptionsTab assumptions={state.assumptions} updateAssumption={updateAssumption} />}
        {tab === "plan" && (
          <PlanTab
            activeTypes={state.selectedInterventions}
            toggleIntervention={toggleIntervention}
            projectedMargin={scenarios.manual.outcome.marginDeltaPct}
            currentPlan={scenarios.manual.responsePlan}
            aiPlan={scenarios.ai.responsePlan}
          />
        )}
        {tab === "compare" && <CompareTab />}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={`${msg.role}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[94%] px-3 py-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-line ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "card-surface text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="flex gap-1 px-3 py-2 card-surface rounded-lg w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" style={{ animationDelay: "0.2s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" style={{ animationDelay: "0.4s" }} />
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border space-y-2">
          <div className="flex flex-col gap-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => send(suggestion)}
                className="text-left text-[10px] text-primary hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
              >
                → {suggestion}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder={`Ask, approve, or modify the ${strategyLabels[currentScenario.mode].toLowerCase()} strategy...`}
              className="flex-1 bg-secondary rounded-md px-3 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
