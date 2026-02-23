"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Music,
  Plus,
  X,
  Play,
  Building2,
  Sparkles,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { PropertyInfo, MusicChoice, MontageConfig } from "@/lib/types";

interface MontageFormProps {
  onSubmit: (config: MontageConfig) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const MUSIC_OPTIONS: { id: MusicChoice; label: string; description: string }[] = [
  { id: "none", label: "Pas de musique", description: "Vidéo sans audio" },
  { id: "elegant", label: "Elegant", description: "Piano doux, ambiance luxe" },
  { id: "energetic", label: "Energetic", description: "Moderne, dynamique" },
  { id: "minimal", label: "Minimal", description: "Ambient subtil" },
  { id: "dramatic", label: "Dramatic", description: "Cinématique, orchestral" },
];

export default function MontageForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: MontageFormProps) {
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [price, setPrice] = useState("");
  const [surface, setSurface] = useState("");
  const [rooms, setRooms] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [highlightInput, setHighlightInput] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [music, setMusic] = useState<MusicChoice>("elegant");

  const addHighlight = () => {
    const trimmed = highlightInput.trim();
    if (trimmed && !highlights.includes(trimmed)) {
      setHighlights([...highlights, trimmed]);
      setHighlightInput("");
    }
  };

  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const propertyInfo: PropertyInfo = {
      title: title.trim(),
      ...(city && { city }),
      ...(neighborhood && { neighborhood }),
      ...(price && { price }),
      ...(surface && { surface }),
      ...(rooms && { rooms }),
      ...(highlights.length > 0 && { highlights }),
      ...(agencyName && { agencyName }),
    };

    onSubmit({ propertyInfo, music });
  };

  const inputClass =
    "w-full rounded-xl bg-input-bg border border-input-border px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent-from focus:ring-1 focus:ring-accent-from/50 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-badge-gold-bg border border-badge-gold-border mb-3">
              <Sparkles className="h-4 w-4 text-icon-accent" />
              <span className="text-xs font-medium text-badge-gold-text">
                Studio Montage
              </span>
            </div>
            <h3 className="text-xl font-bold">
              Créez une présentation premium
            </h3>
            <p className="mt-1 text-sm text-muted">
              Montage cinématique avec effets 3D et transitions dynamiques
            </p>
          </div>

          {/* Property Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-feature-text">
              <Building2 className="h-4 w-4" />
              Informations du bien
            </div>

            <input
              type="text"
              placeholder="Titre du bien *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Quartier"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Prix (ex: 450 000 €)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Surface (ex: 85 m²)"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                className={inputClass}
              />
            </div>

            <input
              type="text"
              placeholder="Nombre de pièces (ex: 3 pièces)"
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Highlights */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-feature-text">
              Points forts (optionnel)
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Balcon, Parking..."
                value={highlightInput}
                onChange={(e) => setHighlightInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHighlight();
                  }
                }}
                className={inputClass}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addHighlight}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {highlights.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-badge-gold-bg text-badge-gold-text border border-badge-gold-border"
                  >
                    {h}
                    <button
                      type="button"
                      onClick={() => removeHighlight(i)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Agency */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-feature-text">
              Agence (optionnel)
            </div>
            <input
              type="text"
              placeholder="Nom de l'agence"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Music */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-feature-text">
              <Music className="h-4 w-4" />
              Musique
            </div>
            <div className="space-y-2">
              {MUSIC_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    music === option.id
                      ? "border-accent-from bg-badge-gold-bg"
                      : "border-input-border bg-input-bg hover:border-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="music"
                    value={option.id}
                    checked={music === option.id}
                    onChange={() => setMusic(option.id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      music === option.id
                        ? "border-accent-from"
                        : "border-muted"
                    }`}
                  >
                    {music === option.id && (
                      <div className="w-2 h-2 rounded-full bg-accent-from" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="ml-2 text-xs text-muted">
                      {option.description}
                    </span>
                  </div>
                  {option.id !== "none" && (
                    <Play className="h-3.5 w-3.5 text-muted" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={onCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={!title.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Lancement...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Créer le montage
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
