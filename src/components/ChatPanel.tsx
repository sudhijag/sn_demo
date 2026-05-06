import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameState } from "@/lib/game-state";
import {
  generateExecutiveAnswer,
  isSafeTask,
  sortPlanTasks,
  type PlanTask,
  type TaskResolution,
} from "@/lib/scenario";

type Message = { role: "user" | "assistant"; content: string };

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

function resolutionTone(resolution: TaskResolution) {
  if (resolution === "awaiting-approval" || resolution === "modified") return "amber";
  if (resolution === "rejected") return "red";
  if (resolution === "completed" || resolution === "auto-approved" || resolution === "user-approved") return "green";
  return "neutral";
}

function formatResolution(resolution: TaskResolution) {
  if (resolution === "auto-approved") return "CC approved";
  if (resolution === "user-approved") return "approved";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedTasks = useMemo(
    () => sortPlanTasks(activeResponsePlan.tasks),
    [activeResponsePlan.tasks],
  );
  const openTasks = sortedTasks.filter(
    (task) => task.resolution !== "auto-approved" && task.resolution !== "completed" && task.resolution !== "user-approved",
  );
  const completedTasks = sortedTasks.filter(
    (task) => task.resolution === "auto-approved" || task.resolution === "completed" || task.resolution === "user-approved",
  );
  const safeTasks = openTasks.filter((task) => isSafeTask(task));

  useEffect(() => {
    if (state.planEditMode) {
      setMessages([
        {
          role: "assistant",
          content: [
            "Plan edit mode is active.",
            "Add a task, remove the selected task, reassign it between AI and human review, or change the suggested fix.",
          ].join("\n\n"),
        },
      ]);
      return;
    }

    if (!selectedTask) {
      setMessages([]);
    } else {
      setMessages([]);
    }
  }, [activeResponsePlan.summary, selectedTask, state.planEditMode]);

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
    <div className="w-[44rem] flex flex-col border-l border-border bg-card/40">
      <div className="px-4 py-3 border-b border-border">
        <div className="text-xs font-semibold text-foreground">COMMAND CENTER</div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[0.95fr_1.15fr]">
        <div className="border-r border-border min-h-0 flex flex-col">
          <div className="px-3 py-3 border-b border-border space-y-2">
            <div className="card-surface px-3 py-2 max-w-[25rem] min-h-[5.75rem]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-foreground">
                    {state.simulationPhase === "baseline" ? "Plan workspace" : "Dallas remediation plan"}
                  </div>
                  {state.simulationPhase !== "baseline" && (
                    <div className="mt-1 text-[10px] text-muted-foreground leading-tight">
                      Response actions and exceptions generated for the Dallas disruption.
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPlanEditMode(!state.planEditMode)}
                  disabled={state.simulationPhase === "baseline"}
                  className="px-2.5 py-1.5 rounded-md border border-border bg-secondary hover:bg-sn-surface-hover text-[10px] font-medium text-foreground transition-colors disabled:opacity-35 disabled:hover:bg-secondary"
                >
                  {state.planEditMode ? "Done Editing" : "Edit Plan"}
                </button>
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {state.simulationPhase === "baseline" ? (
                  <>
                    <Pill>Standby</Pill>
                  </>
                ) : (
                  <>
                    <Pill tone="amber">{openTasks.length} open</Pill>
                    <Pill tone="green">{completedTasks.length} completed</Pill>
                    <Pill>{Math.round(currentScenario.outcome.confidencePct)}% confidence</Pill>
                  </>
                )}
              </div>
            </div>

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
          </div>

          <div className="px-3 py-3 min-h-0 flex-1">
            <div className="card-surface overflow-hidden h-full flex flex-col">
              <div className="grid grid-cols-[1.7fr_0.8fr_0.8fr_0.95fr] gap-2 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground border-b border-border">
                <div>Task</div>
                <div>Owner</div>
                <div>Confidence</div>
                <div>Status</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {openTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task.id)}
                    className={`w-full grid grid-cols-[1.7fr_0.8fr_0.8fr_0.95fr] gap-2 px-3 py-1.5 text-left border-b border-border/60 transition-colors ${
                      selectedTask?.id === task.id ? "bg-primary/5" : "hover:bg-secondary/70"
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-foreground">{task.title}</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground self-center">{task.owner.replace("_", " ")}</div>
                    <div className="self-center">
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              task.confidenceBand === "high"
                                ? "bg-primary"
                                : task.confidenceBand === "medium"
                                  ? "bg-sn-warning"
                                  : "bg-sn-danger"
                            }`}
                            style={{ width: task.confidenceBand === "high" ? "92%" : task.confidenceBand === "medium" ? "60%" : "28%" }}
                          />
                        </div>
                        <div className="text-[9px] font-mono uppercase text-muted-foreground">{task.confidenceBand}</div>
                      </div>
                    </div>
                    <div className="self-center"><Pill tone={resolutionTone(task.resolution)}>{formatResolution(task.resolution)}</Pill></div>
                  </button>
                ))}

                {completedTasks.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-[10px] font-medium text-muted-foreground border-y border-border/60 bg-secondary/30">
                      Completed tasks ({completedTasks.length})
                    </div>
                    {completedTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task.id)}
                        className={`w-full grid grid-cols-[1.7fr_0.8fr_0.8fr_0.95fr] gap-2 px-3 py-1.5 text-left border-b border-border/60 transition-colors ${
                          selectedTask?.id === task.id ? "bg-primary/5" : "hover:bg-secondary/70"
                        }`}
                      >
                        <div className="text-[11px] text-foreground">{task.title}</div>
                        <div className="text-[10px] text-muted-foreground self-center">{task.owner.replace("_", " ")}</div>
                        <div className="self-center">
                          <div className="flex flex-col gap-1">
                            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  task.confidenceBand === "high"
                                    ? "bg-primary"
                                    : task.confidenceBand === "medium"
                                      ? "bg-sn-warning"
                                      : "bg-sn-danger"
                                }`}
                                style={{ width: task.confidenceBand === "high" ? "92%" : task.confidenceBand === "medium" ? "60%" : "28%" }}
                              />
                            </div>
                            <div className="text-[9px] font-mono uppercase text-muted-foreground">{task.confidenceBand}</div>
                          </div>
                        </div>
                        <div className="self-center"><Pill tone="green">{formatResolution(task.resolution)}</Pill></div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex flex-col">
          <div className="p-3">
            <div className="card-surface px-3 py-2 space-y-2 shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
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
                      : activeResponsePlan.summary}
                  </div>
                </>
              )}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={`${msg.role}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[96%] px-3 py-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-line ${
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

          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={placeholder}
                rows={4}
                className="flex-1 resize-none bg-secondary rounded-md px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
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
    </div>
  );
}
