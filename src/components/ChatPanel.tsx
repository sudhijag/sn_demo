import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "What happens to Q3 margin if Dallas stays down 30 more days?",
  "Re-route Dallas volume to Phoenix and Atlanta",
  "What's the cost to expedite Dallas repair?",
];

const mockResponses: Record<string, string> = {
  default:
    "Simulating... A continued Dallas shutdown cascades across 3 dependent plants. Detroit throughput drops 18% from missing sub-assemblies. Atlanta and Phoenix absorb partial load but run at 95%+ utilization risk. Network margin impact: -6.5% over 30 days. Recommendation: Expedite Dallas hydraulic repair ($340K) and temporarily shift 40% of Dallas volume to the Los Angeles facility. Estimated full recovery: 8 days with AI-optimized load balancing.",
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "user",
      content: "What happens to Q3 margin if our Dallas plant is down another 30 days?",
    },
    {
      role: "assistant",
      content:
        "Simulating... A 30-day extended shutdown at Dallas would reduce Q3 margin by an estimated 6.5%. Detroit Final Assembly throughput drops 18% due to sub-assembly shortage. Phoenix and Atlanta absorb partial load at 95%+ utilization.\n\nPotential Mitigations: Expedite sourcing from California Supplier & prioritize top-tier products. Estimated network recovery with AI rerouting: 12 days.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: mockResponses.default },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="w-72 flex flex-col border-l border-border bg-card/40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <span className="text-xs font-semibold text-foreground">AI EXEC ASSISTANT</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] px-3 py-2 rounded-lg text-[11px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "card-surface text-foreground"
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

      {/* Suggestions */}
      {messages.length <= 4 && (
        <div className="px-3 pb-2 flex flex-col gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-left text-[10px] text-primary hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary truncate"
            >
              → {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask natural language what-if questions..."
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
  );
}
