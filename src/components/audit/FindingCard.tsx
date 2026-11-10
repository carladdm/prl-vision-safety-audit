import { AlertTriangle, CalendarClock, Pencil, Scale, ShieldCheck, UserCog, Wrench } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { riskLabel, riskLevel, type Hallazgo, type RiskLevel } from "@/lib/report";

const accent: Record<RiskLevel, string> = {
  low: "bg-risk-low",
  medium: "bg-risk-medium",
  high: "bg-risk-high",
};

const badgeVariant = {
  low: "risk-low",
  medium: "risk-medium",
  high: "risk-high",
} as const;

const NIVELES = ["Leve", "Moderado", "Importante"] as const;
const activeLevel: Record<(typeof NIVELES)[number], string> = {
  Leve: "bg-risk-low text-primary-foreground border-risk-low",
  Moderado: "bg-risk-medium text-risk-medium-ink border-risk-medium",
  Importante: "bg-risk-high text-primary-foreground border-risk-high",
};

interface Props {
  hallazgo: Hallazgo;
  index: number;
  onChange?: (h: Hallazgo) => void;
}

export function FindingCard({ hallazgo, index, onChange }: Props) {
  const lvl = riskLevel(hallazgo.nivel_riesgo);
  const isAct = /acto/i.test(hallazgo.tipo);
  const [editing, setEditing] = useState(false);

  return (
    <article className="surface-card relative overflow-hidden">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${accent[lvl]}`} />
      <div className="space-y-4 p-4 pl-6 sm:p-5 sm:pl-7">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            #{String(index + 1).padStart(2, "0")}
          </span>
          <Badge variant={badgeVariant[lvl]} className="gap-1 uppercase tracking-wide">
            <AlertTriangle className="size-3" />
            {hallazgo.nivel_riesgo || riskLabel[lvl]}
          </Badge>
          {hallazgo.tipo && (
            <Badge variant="outline" className="gap-1 bg-muted text-muted-foreground">
              {isAct ? <UserCog className="size-3" /> : <Wrench className="size-3" />}
              {hallazgo.tipo}
            </Badge>
          )}
        </div>

        <h3 className="text-xl font-semibold leading-tight">{hallazgo.titulo}</h3>

        {onChange && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nivel de riesgo (criterio del técnico)
            </p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Nivel de riesgo">
              {NIVELES.map((n) => {
                const on = riskLevel(n) === lvl;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => onChange({ ...hallazgo, nivel_riesgo: n })}
                    className={`h-10 rounded-md border text-sm font-semibold transition-colors ${on ? activeLevel[n] : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Scale className="size-3.5" /> Normativa aplicable
          </p>
          <p className="text-sm font-bold">{hallazgo.normativa || "—"}</p>
        </div>

        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Medida correctiva propuesta
          </p>
          {onChange && editing ? (
            <Textarea
              autoFocus
              value={hallazgo.medida_correctiva}
              onChange={(e) => onChange({ ...hallazgo, medida_correctiva: e.target.value })}
              onBlur={() => setEditing(false)}
              rows={4}
              maxLength={2000}
              className="bg-card text-sm"
            />
          ) : onChange ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group w-full rounded-md border border-dashed border-transparent p-1 -m-1 text-left text-sm leading-relaxed hover:border-border hover:bg-muted/50"
              aria-label="Editar medida correctiva"
            >
              {hallazgo.medida_correctiva || "—"}
              <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                <Pencil className="size-3" /> Editar
              </span>
            </button>
          ) : (
            <p className="text-sm leading-relaxed">{hallazgo.medida_correctiva || "—"}</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarClock className="size-3.5" /> Plazo
            </dt>
            <dd className="mt-0.5 text-sm font-semibold">{hallazgo.plazo || "—"}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <UserCog className="size-3.5" /> Responsable
            </dt>
            <dd className="mt-0.5 text-sm font-semibold">{hallazgo.responsable || "—"}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
