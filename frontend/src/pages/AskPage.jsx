import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  BookOpen,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { GlowButton } from "@/components/GlowButton";
import { SourcePill } from "@/components/SourcePill";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AskPage = () => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAsk = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      const response = await axios.post(`${API}/ask`, { question });
      setAnswer(response.data);
    } catch (error) {
      console.error("Error asking question:", error);
      const detail = error.response?.data?.detail || "Failed to get answer";
      setErrorMessage(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const confidenceStyles = (value) => {
    if (value === "high") {
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    }
    if (value === "medium") {
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    }
    return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  };

  const toPercent = (score) =>
    Math.max(0, Math.min(100, Math.round(score * 100)));

  const isInsufficient =
    answer?.answer?.includes("I don't have enough information") || false;

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-heading font-bold text-foreground mb-2">
          Ask Your Knowledge Base
        </h1>
        <p className="text-muted-foreground">
          Get AI-powered answers from your uploaded documents
        </p>
      </motion.div>

      <div className="flex-1 flex gap-6">
        {/* Left: Question & Answer */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Input Area */}
          <GlassCard className="glass-card">
            <div className="space-y-4">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Your Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What would you like to know?"
                className="w-full min-h-[120px] bg-muted/30 border border-white/10 rounded-lg p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                data-testid="question-input"
              />
              <GlowButton
                onClick={handleAsk}
                disabled={loading || !question.trim()}
                className="w-full"
                data-testid="ask-button"
              >
                {loading ? (
                  "Thinking..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Ask Question
                  </>
                )}
              </GlowButton>
            </div>
          </GlassCard>

          {/* Answer Area */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard data-testid="answer-loading">
                  <div className="h-5 w-24 bg-white/10 rounded mb-4 animate-pulse" />
                  <div className="space-y-3">
                    <div className="h-4 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 bg-white/10 rounded animate-pulse" />
                    <div className="h-4 bg-white/10 rounded animate-pulse w-2/3" />
                  </div>
                </GlassCard>
              </motion.div>
            )}
            {!loading && errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard data-testid="answer-error">
                  <p className="text-sm text-rose-200">{errorMessage}</p>
                  {errorMessage.includes("No documents available") && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Upload a document first, then ask your question.
                    </p>
                  )}
                </GlassCard>
              </motion.div>
            )}
            {answer && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard data-testid="answer-card">
                  {isInsufficient && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-rose-200">
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        No relevant context found in uploaded documents
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Answer
                    </h3>
                    {answer.confidence && (
                      <span
                        className={`px-2 py-1 text-xs rounded-full border ${confidenceStyles(
                          answer.confidence,
                        )}`}
                        data-testid="confidence-badge"
                      >
                        {answer.confidence.toUpperCase()} CONFIDENCE
                      </span>
                    )}
                    <button
                      onClick={() => copyToClipboard(answer.answer, "answer")}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      data-testid="copy-answer-button"
                    >
                      {copiedIndex === "answer" ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {answer.answer}
                  </p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Sources Panel */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-96"
            >
              <GlassCard
                className="glass-card sticky top-8"
                data-testid="sources-loading"
              >
                <div className="h-5 w-32 bg-white/10 rounded mb-4 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-20 bg-white/10 rounded animate-pulse" />
                  <div className="h-20 bg-white/10 rounded animate-pulse" />
                </div>
              </GlassCard>
            </motion.div>
          )}
          {answer &&
            answer.sources &&
            answer.sources.length > 0 &&
            !loading && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-96"
              >
                <GlassCard
                  className="glass-card sticky top-8"
                  data-testid="sources-panel"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Sources ({answer.sources.length})
                  </h3>
                  <div className="space-y-4">
                    {answer.sources.map((source, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-lg bg-muted/30 border border-white/5"
                        data-testid={`source-${index}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <SourcePill className="mb-2">
                            {source.document_name}
                          </SourcePill>
                          <span className="text-xs text-muted-foreground">
                            {toPercent(source.score)}% match
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Chunk {source.chunk_index + 1}
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full bg-primary/70"
                            style={{ width: `${toPercent(source.score)}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                          <span className="bg-primary/20 text-foreground rounded px-1 py-0.5">
                            {source.highlight}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {source.snippet}
                        </p>
                        <button
                          onClick={() => copyToClipboard(source.snippet, index)}
                          className="mt-2 text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                          data-testid={`copy-source-${index}`}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-3 h-3" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy snippet
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (source.document_id) {
                              window.location.href = `/documents#doc-${source.document_id}`;
                            }
                          }}
                          className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          data-testid={`scroll-doc-${index}`}
                        >
                          <ChevronRight className="w-3 h-3" /> Scroll to
                          document
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};
