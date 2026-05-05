import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import {
  INTERVENTION_LIBRARY,
  formatMillions,
  generateExecutiveAnswer,
  getObjectiveLabel,
  type InterventionType,
  type ScenarioAssumptions,
  type ScenarioObjective,
  type StrategyMode,
} from "@/lib/scenario";

type Message = { role: "user" | "assistant"; content: string };
type PanelTab = "assumptions" | "plan" | "compare" | "ask";

const suggestions = [
  "What happens to Q3 margin if Dallas stays down 30 more days?",
  "Which strategy wins if service level matters most?",
  "What is the cheapest plan that still protects margin?",
];

const strategyLabels: Record<StrategyMode, string> = {
  baseline: "Do nothing",
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
      <NumberField
        label="Outage duration"
        value={assumptions.outageDurationDays}
        suffix="d"
        min={5}
        max={45}
        onChange={(value) => updateAssumption("outageDurationDays", value)}
      />
      <NumberField
        label="Spare capacity"
        value={assumptions.spareCapacityPct}
        suffix="%"
        min={5}
        max={40}
        onChange={(value) => updateAssumption("spareCapacityPct", value)}
      />
      <NumberField
        label="Labor availability"
        value={assumptions.laborAvailabilityPct}
        suffix="%"
        min={60}
        max={100}
        onChange={(value) => updateAssumption("laborAvailabilityPct", value)}
      />
      <NumberField
        label="Supplier lead time"
        value={assumptions.supplierLeadTimeDays}
        suffix="d"
        min={4}
        max={21}
        onChange={(value) => updateAssumption("supplierLeadTimeDays", value)}
      />
      <SelectField
        label="Freight mode"
        value={assumptions.freightMode}
        options={[
          { label: "Standard", value: "standard" },
          { label: "Expedited", value: "expedited" },
        ]}
        onChange={(value) => updateAssumption("freightMode", value)}
      />
      <SelectField
        label="Service-level priority"
        value={assumptions.serviceLevelPriority}
        options={[
          { label: "Balanced", value: "balanced" },
          { label: "Protect margin", value: "margin" },
          { label: "Protect service", value: "service" },
        ]}
        onChange={(value) => updateAssumption("serviceLevelPriority", value)}
      />
      <SelectField
        label="SKU prioritization"
        value={assumptions.skuPriority}
        options={[
          { label: "All SKUs", value: "all" },
          { label: "High margin", value: "high_margin" },
          { label: "Strategic", value: "strategic" },
        ]}
        onChange={(value) => updateAssumption("skuPriority", value)}
      />
    </div>
  );
}

function PlanTab({
  activeTypes,
  toggleIntervention,
  projectedMargin,
}: {
  activeTypes: InterventionType[];
  toggleIntervention: (type: InterventionType) => void;
  projectedMargin: number;
}) {
  return (
    <div className="space-y-2">
      <div className="card-surface px-3 py-2 text-[10px] text-muted-foreground">
        Bundle interventions into one response plan. Current manual-plan margin impact: <span className="font-mono text-primary">{projectedMargin.toFixed(1)}%</span>
      </div>
      {INTERVENTION_LIBRARY.map((intervention) => {
        const active = activeTypes.includes(intervention.type);
        return (
          <button
            key={intervention.type}
            onClick={() => toggleIntervention(intervention.type)}
            className={`w-full text-left card-surface px-3 py-2 border transition-colors ${
              active ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-foreground">{intervention.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{intervention.description}</div>
              </div>
              <div className={`w-2 h-2 rounded-full mt-1 ${active ? "bg-primary" : "bg-muted"}`} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[9.5px] font-mono text-muted-foreground">
              <span>{formatMillions(intervention.estimatedCost)}</span>
              <span>·</span>
              <span className="text-primary">+{intervention.marginLiftPct.toFixed(1)}% margin</span>
              <span>·</span>
              <span className="text-primary">+{intervention.serviceLiftPct.toFixed(1)} pt service</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function CompareTab() {
  const { scenarios, bestScenario, state, setActiveScenario } = useGameState();
  const ordered = [scenarios.baseline, scenarios.manual, scenarios.ai];

  return (
    <div className="space-y-2">
      <div className="card-surface px-3 py-2 text-[10px] text-muted-foreground">
        Objective: <span className="text-primary">{getObjectiveLabel(state.objective)}</span>. Best strategy highlighted below.
      </div>
      {ordered.map((scenario) => {
        const isBest = bestScenario.mode === scenario.mode;
        const isActive = state.activeScenarioMode === scenario.mode;
        return (
          <button
            key={scenario.mode}
            onClick={() => setActiveScenario(scenario.mode)}
            className={`w-full text-left card-surface px-3 py-2 border transition-colors ${
              isActive ? "border-primary" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-foreground">{scenario.label}</div>
              {isBest && <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-primary">Best fit</div>}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
              <div>
                <div className="text-muted-foreground">Margin</div>
                <div className="font-mono text-foreground">{scenario.outcome.marginDeltaPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Service</div>
                <div className="font-mono text-foreground">{scenario.outcome.serviceLevelPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Recovery</div>
                <div className="font-mono text-foreground">{scenario.outcome.recoveryDays.toFixed(1)}d</div>
              </div>
              <div>
                <div className="text-muted-foreground">Confidence</div>
                <div className="font-mono text-foreground">{Math.round(scenario.outcome.confidencePct)}%</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function ChatPanel() {
  const {
    state,
    currentScenario,
    bestScenario,
    setObjective,
    updateAssumption,
    toggleIntervention,
  } = useGameState();
  const [tab, setTab] = useState<PanelTab>("compare");
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

    setTimeout(() => {
      const answer = generateExecutiveAnswer(text.trim(), currentScenario, bestScenario);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: [
            answer.summary,
            `Recommended actions: ${answer.recommendedActions.join(", ")}.`,
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
    <div className="w-[27rem] flex flex-col border-l border-border bg-card/40">
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <span className="text-xs font-semibold text-foreground">EXECUTIVE DECISION LAB</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <TabButton active={tab === "assumptions"} label="Assumptions" onClick={() => setTab("assumptions")} />
          <TabButton active={tab === "plan"} label="Plan" onClick={() => setTab("plan")} />
          <TabButton active={tab === "compare"} label="Compare" onClick={() => setTab("compare")} />
          <TabButton active={tab === "ask"} label="Ask" onClick={() => setTab("ask")} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {([
            { label: "Margin", value: "margin" },
            { label: "Service", value: "service_level" },
            { label: "Recovery", value: "recovery_time" },
          ] as Array<{ label: string; value: ScenarioObjective }>).map((option) => (
            <button
              key={option.value}
              onClick={() => setObjective(option.value)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono ${
                state.objective === option.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {tab === "assumptions" && (
          <AssumptionsTab assumptions={state.assumptions} updateAssumption={updateAssumption} />
        )}
        {tab === "plan" && (
          <PlanTab
            activeTypes={state.selectedInterventions}
            toggleIntervention={toggleIntervention}
            projectedMargin={currentScenario.outcome.marginDeltaPct}
          />
        )}
        {tab === "compare" && <CompareTab />}
        {tab === "ask" && (
          <div className="flex flex-col h-full min-h-[28rem]">
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={`${msg.role}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[92%] px-3 py-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-line ${
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

            <div className="pt-3 space-y-2">
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
                  placeholder={`Ask about the ${strategyLabels[state.activeScenarioMode]} strategy...`}
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
        )}
      </div>
    </div>
  );
}
