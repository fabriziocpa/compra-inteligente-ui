"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LabelWithHelp } from "@/components/field-help";
import { GRACE_CODES } from "@/lib/loan-domain";
import { cn } from "@/lib/utils";
import type { GraceCode } from "@/lib/api/types";

const chipClass: Record<GraceCode, string> = {
  S: "bg-muted text-muted-foreground border-border",
  P: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
  T: "bg-destructive/15 text-destructive border-destructive/40",
};

function cycle(code: GraceCode): GraceCode {
  return code === "S" ? "P" : code === "P" ? "T" : "S";
}

export function GraceEditor({
  termPeriods,
  value,
  onChange,
}: {
  termPeriods: number;
  value: GraceCode[];
  onChange: (v: GraceCode[]) => void;
}) {
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("");
  const [tipo, setTipo] = useState<GraceCode>("P");

  const counts = value.reduce(
    (acc, c) => ({ ...acc, [c]: acc[c] + 1 }),
    { S: 0, P: 0, T: 0 } as Record<GraceCode, number>,
  );

  function applyRule() {
    const f = Number(from);
    const t = Number(to || from);
    if (!Number.isInteger(f) || !Number.isInteger(t)) return;
    const next = [...value];
    for (let i = f - 1; i <= t - 1; i++) {
      if (i >= 0 && i < next.length) next[i] = tipo;
    }
    onChange(next);
  }

  function reset() {
    onChange(Array.from({ length: termPeriods }, () => "S" as GraceCode));
  }

  if (termPeriods <= 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Define primero el número de períodos (plazo).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md border bg-muted px-2 py-1 text-muted-foreground">
          Normal (S): <b>{counts.S}</b>
        </span>
        <span className="border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning rounded-md border px-2 py-1">
          Parcial (P): <b>{counts.P}</b>
        </span>
        <span className="border-destructive/40 bg-destructive/15 text-destructive rounded-md border px-2 py-1">
          Total (T): <b>{counts.T}</b>
        </span>
      </div>

      {/* Aplicador de reglas por rango */}
      <div className="bg-muted/40 grid grid-cols-2 items-end gap-3 rounded-lg border p-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <LabelWithHelp>
            Desde
          </LabelWithHelp>
          <Input
            type="number"
            min={1}
            max={termPeriods}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <LabelWithHelp help="Último período. Vacío = solo el período 'Desde'.">
            Hasta
          </LabelWithHelp>
          <Input
            type="number"
            min={1}
            max={termPeriods}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <LabelWithHelp help="Sin gracia, Parcial (solo interés) o Total.">
            Tipo
          </LabelWithHelp>
          <Select
            items={GRACE_CODES}
            value={tipo}
            onValueChange={(v) => setTipo(v as GraceCode)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRACE_CODES.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={applyRule}>
          Aplicar
        </Button>
      </div>

      {/* Grilla de períodos — clic para ciclar S → P → T */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Toca un período para cambiar su tipo (S → P → T).
          </p>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="size-3.5" /> Reiniciar
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {value.map((code, i) => (
            <button
              key={i}
              type="button"
              title={`Período ${i + 1}: ${code}`}
              onClick={() => {
                const next = [...value];
                next[i] = cycle(code);
                onChange(next);
              }}
              className={cn(
                "flex h-9 w-9 flex-col items-center justify-center rounded-md border text-[10px] font-medium transition-colors",
                chipClass[code],
              )}
            >
              <span className="opacity-60">{i + 1}</span>
              <span className="text-xs font-bold">{code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
