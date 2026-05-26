"use client";

import Image from "next/image";
import Icon from "@shared/ui/Icon";
import { Card } from "@shared/ui/Card";
import { Chip } from "@shared/ui/Chip";
import { Button } from "@shared/ui/Button";
import type { PersonaEntry } from "../model/usePersonasStorage";

const GENDER_LABEL: Record<number, string> = { 1: "남", 2: "여" };

function MaleFigure() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="16" r="10" fill="rgba(255,255,255,0.7)" />
      <path d="M8 52c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

function FemaleFigure() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="16" r="10" fill="rgba(255,255,255,0.7)" />
      <path d="M14 52c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="rgba(255,255,255,0.5)" />
      <path d="M20 38c-2 4-2 8 8 10 10-2 10-6 8-10" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

function AllFigure() {
  return (
    <svg width="64" height="56" viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="16" r="9" fill="rgba(255,255,255,0.55)" />
      <path d="M2 52c0-11.046 8.954-18 20-18s20 6.954 20 18" fill="rgba(255,255,255,0.35)" />
      <circle cx="44" cy="16" r="9" fill="rgba(255,255,255,0.7)" />
      <path d="M24 52c0-11.046 8.954-18 20-18s20 6.954 20 18" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

const GENDER_BG: Record<"male" | "female" | "all", string> = {
  male: "linear-gradient(160deg, #C8DCFA 0%, #A8C4F0 100%)",
  female: "linear-gradient(160deg, #FFE8DC 0%, #FFD0BE 100%)",
  all: "linear-gradient(160deg, #D8EEE8 0%, #B8DECE 100%)",
};

interface Props {
  persona: PersonaEntry;
  canEdit?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function PersonaCard({ persona, canEdit = true, onEdit, onDelete }: Props) {
  const isMale = persona.genders?.length === 1 && persona.genders[0] === 1;
  const isFemale = persona.genders?.length === 1 && persona.genders[0] === 2;
  const genderType = isMale ? "male" : isFemale ? "female" : "all";

  const ageLabel =
    persona.ageMin != null && persona.ageMax != null
      ? `${persona.ageMin}–${persona.ageMax}세`
      : persona.ageMin != null
        ? `${persona.ageMin}세 이상`
        : persona.ageMax != null
          ? `${persona.ageMax}세 이하`
          : null;

  const genderLabel =
    !persona.genders || persona.genders.length === 0
      ? "전체"
      : persona.genders.map((g) => GENDER_LABEL[g] ?? g).join("·");

  return (
    <Card
      style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", cursor: canEdit ? "pointer" : "default", transition: "border-color 120ms ease" }}
      onClick={canEdit ? onEdit : undefined}
    >
      <div style={{ position: "relative", aspectRatio: "16 / 10", background: GENDER_BG[genderType], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, color: "#fff", gap: 8 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {genderType === "male" && <MaleFigure />}
          {genderType === "female" && <FemaleFigure />}
          {genderType === "all" && <AllFigure />}
        </div>
        <div
          style={{ width: "100%", letterSpacing: "-0.014em", textShadow: "0 2px 8px rgba(0,0,0,0.28)" }}
          className="font-bold text-[16px] leading-[1.35] [font-family:var(--w-font-display)]"
        >
          {persona.name}
        </div>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ageLabel && <Chip variant="neutral">{ageLabel}</Chip>}
          <Chip variant="neutral">{genderLabel}</Chip>
          {(persona.interests ?? []).slice(0, 3).map((i) => (
            <Chip key={i} variant="neutral">{i}</Chip>
          ))}
        </div>
        {persona.customerDescription && (
          <div
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "var(--w-fg-neutral)" }}
            className="font-medium text-[13px] leading-[1.55]"
          >
            {persona.customerDescription}
          </div>
        )}
        {canEdit && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--w-line-alternative)" }}>
            <Button variant="ghost" size="sm" style={{ color: "var(--w-fg-alternative)" }} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Icon name="x" size={14} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
