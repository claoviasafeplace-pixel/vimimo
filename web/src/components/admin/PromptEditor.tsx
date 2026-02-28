"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { RefreshCw, Loader2 } from "lucide-react";

interface PromptEditorProps {
  roomIndex: number;
  currentPrompt: string;
  onRegenerate: (roomIndex: number, customPrompt: string) => Promise<void>;
}

export default function PromptEditor({
  roomIndex,
  currentPrompt,
  onRegenerate,
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState(currentPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegenerate = async () => {
    if (prompt.trim().length < 10) {
      setError("Le prompt doit faire au moins 10 caractères.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await onRegenerate(roomIndex, prompt);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la regeneration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted uppercase tracking-wider">
        Prompt personnalise — Piece {roomIndex + 1}
      </label>
      <textarea
        value={prompt}
        onChange={(e) => {
          setPrompt(e.target.value);
          setError(null);
          setSuccess(false);
        }}
        rows={4}
        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-amber-500/50 resize-y"
        placeholder="Decrivez le staging souhaite..."
      />

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-400">Regeneration lancee avec succes !</p>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={handleRegenerate}
        disabled={loading || prompt.trim().length < 10}
      >
        {loading ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        )}
        {loading ? "Regeneration..." : "Regenerer"}
      </Button>
    </div>
  );
}
