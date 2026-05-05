import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import {
  BASELINE_ASSUMPTIONS,
  formatMillions,
  generateExecutiveAnswer,
  generateTaskExplanation,
  getChangedAssumptions,
  isSafeTask,
  sortPlanTasks,
  type PlanTask,
  type ScenarioAssumptions,
  type TaskResolution,
} from "@/lib/scenario";

type Message = { role: "user" | "assistant"; content: string };

const planSuggestions = [
  "Add task: Call supplier X and ask for a 7-day lead-time reduction.",
  "Reassign this task to AI.",
  "Update fix: keep overflow capacity pending until service drops below 90%.",
];

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  const cls =
    tone === "green"
      ? "text-primary bg-primary/10"
      : tone === "amber"
        ? "text-sn-warning bg-sn-warning/10"
        : tone === "red"
          ? "text-sn-danger bg-sn-danger/10"
          : "text-muted-foreground bg-secondary";
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

function AssumptionsEditor({
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

function resolutionTone(resolution: TaskResolution) {
  if (resolution === "awaiting-approval" || resolution === "modified") return "amber";
  if (resolution === "rejected") return "red";
  if (resolution === "completed" || resolution === "auto-approved" || resolution === "user-approved") return "green";
  return "neutral";
}

function formatResolution(resolution: TaskResolution) {
  return resolution.replace("-", " ");
}

function parsePlanEditCommand(
  text: string,
  selectedTask: PlanTask | null,
  addPlanTask: (title: string, details?: string) => void,
  removePlanTask: (id: string) => void,
  modifyTask: (task: PlanTask, patch?: Partial<PlanTask>) => void,
  reassignTask: (task: PlanTask, assignee: "ai" | "human") => void,
) {
  const lower = text.toLowerCase();

  if (lower.startsWith("add task")) {
    const next = text.split(":")[1]?.trim() || text.replace(/add task/i, "").trim();
    if (next) {
      addPlanTask(next, next);
      return `Added a new plan task: ${next}.`;
    }
  }

  if (lower.includes("remove task") && selectedTask) {
    removePlanTask(selectedTask.id);
    return `Removed ${selectedTask.title} from the active response plan.`;
  }

  if ((lower.includes("reassign") || lower.includes("assign")) && selectedTask) {
    if (lower.includes("ai")) {
      reassignTask(selectedTask, "ai");
      return `${selectedTask.title} is now assigned back to AI handling.`;
    }
    if (lower.includes("human") || lower.includes("me")) {
      reassignTask(selectedTask, "human");
      return `${selectedTask.title} is now assigned to human review.`;
    }
  }

  if ((lower.includes("update fix") || lower.includes("change fix") || lower.includes("suggested fix")) && selectedTask) {
    const nextFix = text.split(":")[1]?.trim();
    if (nextFix) {
      modifyTask(selectedTask, { suggestedFix: nextFix, details: nextFix });
      return `Updated the suggested fix for ${selectedTask.title}.`;
    }
  }

  return null;
}

function parseTaskCommand(
  text: string,
  selectedTask: PlanTask | null,
  approveTask: (task: PlanTask) => void,
  rejectTask: (task: PlanTask) => void,
  modifyTask: (task: PlanTask, patch?: Partial<PlanTask>) => void,
) {
  if (!selectedTask) return null;
  const lower = text.toLowerCase();

  if (lower.includes("approve")) {
    approveTask(selectedTask);
    return `Approved ${selectedTask.title}.`;
  }
  if (lower.includes("reject")) {
    rejectTask(selectedTask);
    return `Rejected ${selectedTask.title}.`;
  }
  if (lower.includes("modify")) {
    const nextFix = text.split(":")[1]?.trim();
    modifyTask(selectedTask, nextFix ? { suggestedFix: nextFix, details: nextFix } : undefined);
    return nextFix
      ? `Modified ${selectedTask.title} with an updated suggested fix.`
      : `Marked ${selectedTask.title} for modification.`;
  }

  return null;
}

export default function ChatPanel() {
  const {
    state,
    currentScenario,
    bestScenario,
    activeResponsePlan,
    selectedTask,
    updateAssumption,
    setSelectedTask,
    setPlanEditMode,
    approveTask,
    autoApproveSafeTasks,
    rejectTask,
    modifyTask,
    addPlanTask,
    removePlanTask,
    reassignTask,
  } = useGameState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAssumptionsEditor, setShowAssumptionsEditor] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedTasks = useMemo(
    () => sortPlanTasks(activeResponsePlan.tasks),
    [activeResponsePlan.tasks],
  );
  const openTasks = sortedTasks.filter((task) => task.resolution !== "auto-approved" && task.resolution !== "completed");
  const completedTasks = sortedTasks.filter((task) => task.resolution === "auto-approved" || task.resolution === "completed");
  const safeTasks = openTasks.filter((task) => isSafeTask(task));
  const fallbackAnswer = useMemo(
    () => generateExecutiveAnswer("What happens to Q3 margin if Dallas is down 30 more days?", currentScenario, bestScenario),
    [currentScenario, bestScenario],
  );

  useEffect(() => {
    const assistantMessage = state.planEditMode
      ? [
          `${activeResponsePlan.title} is in plan-edit mode.`,
          "You can add a task, remove the selected task, reassign it between AI and human review, or change the suggested fix.",
          `Open tasks: ${openTasks.length}. Completed tasks: ${completedTasks.length}.`,
        ].join("\n\n")
      : selectedTask
        ? generateTaskExplanation(selectedTask, currentScenario)
        : [
            activeResponsePlan.summary,
            `Select a task from the queue to review it in detail.`,
            `Current scenario: ${fallbackAnswer.summary}`,
          ].join("\n\n");

    setMessages([{ role: "assistant", content: assistantMessage }]);
  }, [activeResponsePlan.summary, completedTasks.length, currentScenario, fallbackAnswer.summary, openTasks.length, selectedTask, state.planEditMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const pushAssistant = (content: string) => {
    setMessages((prev) => [...prev, { role: "assistant", content }]);
  };

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const planEditMessage = state.planEditMode
        ? parsePlanEditCommand(text.trim(), selectedTask, addPlanTask, removePlanTask, modifyTask, reassignTask)
        : null;
      const taskMessage = state.planEditMode
        ? null
        : parseTaskCommand(text.trim(), selectedTask, approveTask, rejectTask, modifyTask);

      if (planEditMessage) {
        pushAssistant(planEditMessage);
      } else if (taskMessage) {
        pushAssistant(taskMessage);
      } else if (!state.planEditMode && selectedTask && text.toLowerCase().includes("why")) {
        pushAssistant(generateTaskExplanation(selectedTask, currentScenario));
      } else {
        const answer = generateExecutiveAnswer(text.trim(), currentScenario, bestScenario);
        pushAssistant(
          [
            answer.summary,
            `Recommended actions: ${answer.recommendedActions.join(", ")}.`,
            `Estimated impact: ${answer.estimatedImpact.join(" · ")}.`,
            `${answer.confidence}.`,
          ].join("\n\n"),
        );
      }

      setIsTyping(false);
    }, 500);
  };

  const placeholder = state.planEditMode
    ? "Add a task, remove the selected task, reassign it, or update the fix..."
    : selectedTask
      ? `Ask, approve, or modify ${selectedTask.title.toLowerCase()}...`
      : "Select a task from the queue or ask about the current response plan...";

  return (
    <div className="w-[31rem] flex flex-col border-l border-border bg-card/40">
      <div className="px-4 py-3 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <span className="text-xs font-semibold text-foreground">COMMAND CENTER</span>
        </div>

        <div className="card-surface px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold text-foreground">{activeResponsePlan.title}</div>
              <div className="mt-1 text-[10px] text-muted-foreground leading-tight">{activeResponsePlan.summary}</div>
            </div>
            <button
              onClick={() => setPlanEditMode(!state.planEditMode)}
              className="px-2.5 py-1.5 rounded-md border border-border bg-secondary hover:bg-sn-surface-hover text-[10px] font-medium text-foreground transition-colors"
            >
              {state.planEditMode ? "Done Editing" : "Edit Plan"}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <Pill tone="amber">{openTasks.length} open</Pill>
            <Pill tone="green">{completedTasks.length} completed</Pill>
            <Pill>{Math.round(currentScenario.outcome.confidencePct)}% confidence</Pill>
          </div>
        </div>

        <AssumptionsSummary assumptions={state.assumptions} onOpen={() => setShowAssumptionsEditor((v) => !v)} />
        {showAssumptionsEditor && <AssumptionsEditor assumptions={state.assumptions} updateAssumption={updateAssumption} />}
      </div>

      <div className="px-3 py-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Task Queue</div>
          <button
            onClick={autoApproveSafeTasks}
            disabled={safeTasks.length === 0}
            className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
          >
            Auto-approve safe tasks
          </button>
        </div>

        <div className="card-surface overflow-hidden">
          <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr_0.7fr] gap-3 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
            <div>Task</div>
            <div>Owner</div>
            <div>Status</div>
            <div>Suggested fix</div>
            <div>Action</div>
          </div>
          <div className="max-h-[19rem] overflow-y-auto">
            {openTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task.id)}
                className={`w-full grid grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr_0.7fr] gap-3 px-3 py-2 text-left border-b border-border/60 transition-colors ${
                  selectedTask?.id === task.id ? "bg-primary/5" : "hover:bg-secondary/70"
                }`}
              >
                <div>
                  <div className="text-[11px] font-semibold text-foreground">{task.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{task.confidenceBand} confidence</div>
                </div>
                <div className="text-[10px] text-muted-foreground self-center">{task.owner.replace("_", " ")}</div>
                <div className="self-center"><Pill tone={resolutionTone(task.resolution)}>{formatResolution(task.resolution)}</Pill></div>
                <div className="text-[10px] text-muted-foreground leading-tight self-center">{task.suggestedFix}</div>
                <div className="self-center">
                  <span className="text-[10px] font-medium text-primary">
                    {task.resolution === "awaiting-approval" || task.resolution === "open" ? "Review" : "Open"}
                  </span>
                </div>
              </button>
            ))}

            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="w-full px-3 py-2 text-left text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              {showCompleted ? "Hide" : "Show"} completed tasks ({completedTasks.length})
            </button>

            {showCompleted && completedTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task.id)}
                className={`w-full grid grid-cols-[1.4fr_0.8fr_0.8fr_1.2fr_0.7fr] gap-3 px-3 py-2 text-left border-t border-border/60 transition-colors ${
                  selectedTask?.id === task.id ? "bg-primary/5" : "hover:bg-secondary/70"
                }`}
              >
                <div className="text-[11px] text-foreground">{task.title}</div>
                <div className="text-[10px] text-muted-foreground self-center">{task.owner.replace("_", " ")}</div>
                <div className="self-center"><Pill tone="green">{formatResolution(task.resolution)}</Pill></div>
                <div className="text-[10px] text-muted-foreground leading-tight self-center">{task.suggestedFix}</div>
                <div className="self-center text-[10px] font-medium text-primary">View</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="card-surface px-3 py-2 space-y-2">
            {selectedTask ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold text-foreground">{selectedTask.title}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground leading-tight">{selectedTask.rationale}</div>
                  </div>
                  <Pill tone={resolutionTone(selectedTask.resolution)}>{formatResolution(selectedTask.resolution)}</Pill>
                </div>
                <div className="text-[10px] text-muted-foreground">Suggested fix: <span className="text-foreground">{selectedTask.suggestedFix}</span></div>
                <div className="text-[10px] text-muted-foreground">Expected impact: <span className="text-foreground">{selectedTask.impactSummary}</span></div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => approveTask(selectedTask)} className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-medium">Approve</button>
                  <button onClick={() => modifyTask(selectedTask)} className="px-2.5 py-1 rounded-md bg-secondary text-foreground text-[10px] font-medium border border-border">Modify</button>
                  <button onClick={() => rejectTask(selectedTask)} className="px-2.5 py-1 rounded-md bg-secondary text-foreground text-[10px] font-medium border border-border">Reject</button>
                  <button onClick={() => pushAssistant(generateTaskExplanation(selectedTask, currentScenario))} className="px-2.5 py-1 rounded-md bg-secondary text-foreground text-[10px] font-medium border border-border">Ask why</button>
                </div>
              </>
            ) : (
              <>
                <div className="text-[11px] font-semibold text-foreground">
                  {state.planEditMode ? "Plan edit mode" : "Plan summary"}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">
                  {state.planEditMode
                    ? "Edit the active plan in chat. You can add a task, remove the selected task, reassign it between AI and human review, or change the suggested fix."
                    : "Select a task from the queue to review it, approve it, or discuss it in chat."}
                </div>
              </>
            )}
          </div>
        </div>

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
            {planSuggestions.map((suggestion) => (
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
              placeholder={placeholder}
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
