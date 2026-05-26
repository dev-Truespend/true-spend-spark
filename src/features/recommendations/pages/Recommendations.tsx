/**
 * Recommendations
 *
 * Full-page AI recommendations feed. Shows the user's active AI-generated
 * insights — missed rewards, card tips, apply suggestions, anomaly alerts —
 * with the ability to chat with the agent and run on-demand analyses.
 *
 * @requires useRecommendations hook
 * @requires useAgentMutation hook
 * @requires ai_recommendations table (RLS: user sees own rows)
 */

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useRecommendations, useAgentMutation, useAgentChat, type AgentIntent } from "@/shared/hooks/useAIAgent";
import { RecommendationCard } from "@/features/recommendations/components/RecommendationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Sparkles, TrendingUp, CreditCard, AlertTriangle, MessageSquare,
  Loader2, Send, RefreshCw, ChevronRight, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// ── Quick-action buttons ──────────────────────────────────────────────────────

const QUICK_ACTIONS: Array<{ intent: AgentIntent; label: string; icon: React.ReactNode; description: string }> = [
  {
    intent: "analyze_spending",
    label: "Analyze spending",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Trends, top categories, and one optimization tip",
  },
  {
    intent: "missed_rewards",
    label: "Missed rewards",
    icon: <Sparkles className="h-4 w-4" />,
    description: "How much you left on the table this month",
  },
  {
    intent: "apply_recommendations",
    label: "Best cards to apply for",
    icon: <CreditCard className="h-4 w-4" />,
    description: "Top 2 cards based on your actual spending",
  },
  {
    intent: "anomaly_check",
    label: "Check for issues",
    icon: <AlertTriangle className="h-4 w-4" />,
    description: "Duplicate charges and unusual transactions",
  },
];

// ── Markdown renderer for agent responses ────────────────────────────────────
function AgentMarkdown({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          h3: ({ children }) => <h3 className="font-semibold text-sm mt-3 mb-1">{children}</h3>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Recommendations() {
  const { recommendations, isLoading, dismiss, markActioned, refetch } = useRecommendations();
  const { ask, result, isPending, reset } = useAgentMutation();
  const { messages, send, isPending: chatPending, clear } = useAgentChat();
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuickAction = (intent: AgentIntent) => {
    reset();
    ask(intent, { period: "month", days: 30 });
    toast.info("Analyzing…");
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    send(chatInput.trim());
    setChatInput("");
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Recommendations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Powered by Claude — your personal credit card co-pilot
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChat((s) => !s)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {showChat ? "Hide chat" : "Ask Claude"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      {showChat && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Ask Claude anything about your finances
            </CardTitle>
            <CardDescription className="text-xs">
              Try: "What's my best card for Amazon?" or "Am I spending too much on dining?"
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Chat history */}
            {messages.length > 0 && (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg p-3 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-card border mr-8"
                    )}
                  >
                    {m.role === "assistant" ? (
                      <AgentMarkdown text={m.text} />
                    ) : (
                      <p>{m.text}</p>
                    )}
                  </div>
                ))}
                {chatPending && (
                  <div className="bg-card border rounded-lg p-3 mr-8 flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Claude is thinking…
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                placeholder="Ask about your spending, cards, rewards…"
                disabled={chatPending}
                className="flex-1"
              />
              <Button
                onClick={handleSendChat}
                disabled={chatPending || !chatInput.trim()}
                className="gap-1 shrink-0"
              >
                {chatPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear} className="text-xs text-muted-foreground">
                Clear conversation
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Analyze now
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.intent}
              type="button"
              onClick={() => handleQuickAction(action.intent)}
              disabled={isPending}
              className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent response panel ───────────────────────────────────────── */}
      {(isPending || result) && (
        <Card className={cn("border-primary/20", isPending && "animate-pulse")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {isPending ? "Claude is analyzing…" : "Analysis complete"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : result ? (
              <div className="space-y-3">
                <AgentMarkdown text={result.response} />
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="ghost" onClick={reset} className="text-xs text-muted-foreground">
                    Close
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => refetch()} className="text-xs gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Refresh feed
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ── Saved recommendations feed ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Your feed
          </h2>
          {recommendations.length > 0 && (
            <Badge variant="secondary">{recommendations.length}</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Lightbulb className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">No recommendations yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Run one of the analyses above and Claude will save insights directly to your feed.
                </p>
              </div>
              <Button
                onClick={() => handleQuickAction("analyze_spending")}
                disabled={isPending}
                className="gap-2"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Analyze my spending now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onDismiss={dismiss}
                onAction={markActioned}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Upgrade nudge if no cards connected ───────────────────────── */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">Connect your credit cards</span> to unlock personalized card optimization and real missed-rewards calculations.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 gap-1">
            <Link to="/credit-cards">
              <CreditCard className="h-3.5 w-3.5" />
              Connect
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
