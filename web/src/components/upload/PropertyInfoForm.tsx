"use client";

import { useState } from "react";
import { Building2, Music, Plus, X, Play } from "lucide-react";
import Button from "@/components/ui/Button";
import type { PropertyInfo, MusicChoice } from "@/lib/types";

interface PropertyInfoFormProps {
  value: { propertyInfo: PropertyInfo; music: MusicChoice };
  onChange: (val: { propertyInfo: PropertyInfo; music: MusicChoice }) => void;
}

const MUSIC_OPTIONS: { id: MusicChoice; label: string; description: string }[] = [
  { id: "none", label: "Pas de musique", description: "Vidéo sans audio" },
  { id: "elegant", label: "Elegant", description: "Piano doux, ambiance luxe" },
  { id: "energetic", label: "Energetic", description: "Moderne, dynamique" },
  { id: "minimal", label: "Minimal", description: "Ambient subtil" },
  { id: "dramatic", label: "Dramatic", description: "Cinématique, orchestral" },
];

export default function PropertyInfoForm({ value, onChange }: PropertyInfoFormProps) {
  const [highlightInput, setHighlightInput] = useState("");

  const update = (fields: Partial<PropertyInfo>) => {
    onChange({
      ...value,
      propertyInfo: { ...value.propertyInfo, ...fields },
    });
  };

  const addHighlight = () => {
    const trimmed = highlightInput.trim();
    if (trimmed && !(value.propertyInfo.highlights || []).includes(trimmed)) {
      update({ highlights: [...(value.propertyInfo.highlights || []), trimmed] });
      setHighlightInput("");
    }
  };

  const removeHighlight = (index: number) => {
    update({
      highlights: (value.propertyInfo.highlights || []).filter((_, i) => i !== index),
    });
  };

  const inputClass =
    "w-full rounded-xl bg-input-bg border border-input-border px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent-from focus:ring-1 focus:ring-accent-from/50 transition-colors";

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-6">
      {/* Property Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-feature-text">
          <Building2 className="h-4 w-4" />
          Informations du bien
        </div>

        <input
          type="text"
          placeholder="Titre du bien *"
          value={value.propertyInfo.title}
          onChange={(e) => update({ title: e.target.value })}
          className={inputClass}
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Ville"
            value={value.propertyInfo.city || ""}
            onChange={(e) => update({ city: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Quartier"
            value={value.propertyInfo.neighborhood || ""}
            onChange={(e) => update({ neighborhood: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Prix (ex: 450 000 €)"
            value={value.propertyInfo.price || ""}
            onChange={(e) => update({ price: e.target.value })}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Surface (ex: 85 m²)"
            value={value.propertyInfo.surface || ""}
            onChange={(e) => update({ surface: e.target.value })}
            className={inputClass}
          />
        </div>

        <input
          type="text"
          placeholder="Nombre de pièces (ex: 3 pièces)"
          value={value.propertyInfo.rooms || ""}
          onChange={(e) => update({ rooms: e.target.value })}
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
          <Button type="button" variant="secondary" size="sm" onClick={addHighlight}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {(value.propertyInfo.highlights || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(value.propertyInfo.highlights || []).map((h, i) => (
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
          value={value.propertyInfo.agencyName || ""}
          onChange={(e) => update({ agencyName: e.target.value })}
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
                value.music === option.id
                  ? "border-accent-from bg-badge-gold-bg"
                  : "border-input-border bg-input-bg hover:border-muted"
              }`}
            >
              <input
                type="radio"
                name="music-upload"
                value={option.id}
                checked={value.music === option.id}
                onChange={() => onChange({ ...value, music: option.id })}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  value.music === option.id ? "border-accent-from" : "border-muted"
                }`}
              >
                {value.music === option.id && (
                  <div className="w-2 h-2 rounded-full bg-accent-from" />
                )}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="ml-2 text-xs text-muted">{option.description}</span>
              </div>
              {option.id !== "none" && <Play className="h-3.5 w-3.5 text-muted" />}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
