"use client";

import { Plus, Trash2 } from "lucide-react";
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
import { DecimalInput } from "@/components/loans/decimal-input";
import { RATE_KINDS } from "@/lib/loan-domain";
import type { RateSegmentFormValues } from "@/lib/schemas";

/** Re-encadena from_period para que los tramos queden contiguos desde 1. */
function rechain(segs: RateSegmentFormValues[]): RateSegmentFormValues[] {
  let start = 1;
  return segs.map((s) => {
    const from = start;
    const to = Number(s.to_period);
    start = (Number.isFinite(to) && to >= from ? to : from) + 1;
    return { ...s, from_period: String(from) };
  });
}

export function emptySegment(from: number, to: number): RateSegmentFormValues {
  return {
    from_period: String(from),
    to_period: String(to),
    rate_kind: "TEA",
    rate_value: "",
    capitalizations_per_year: "",
  };
}

export function RateSegmentsEditor({
  termPeriods,
  value,
  onChange,
}: {
  termPeriods: number;
  value: RateSegmentFormValues[];
  onChange: (v: RateSegmentFormValues[]) => void;
}) {
  function update(i: number, patch: Partial<RateSegmentFormValues>) {
    onChange(rechain(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s))));
  }

  function addSegment() {
    const lastTo = Number(value[value.length - 1]?.to_period) || 0;
    const from = lastTo + 1;
    const to = Math.max(from, termPeriods || from);
    onChange(rechain([...value, emptySegment(from, to)]));
  }

  function removeSegment(i: number) {
    onChange(rechain(value.filter((_, idx) => idx !== i)));
  }

  function single() {
    onChange([emptySegment(1, termPeriods || 1)]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Los tramos deben ser contiguos y cubrir del período 1 al {termPeriods || "N"}.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={single}>
          Un solo tramo
        </Button>
      </div>

      <div className="space-y-3">
        {value.map((seg, i) => (
          <div key={i} className="bg-muted/40 rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                Tramo {i + 1} · períodos {seg.from_period}–{seg.to_period || "?"}
              </span>
              {value.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Eliminar tramo"
                  onClick={() => removeSegment(i)}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <LabelWithHelp>
                  Hasta período
                </LabelWithHelp>
                <Input
                  type="number"
                  min={Number(seg.from_period)}
                  max={termPeriods || undefined}
                  value={seg.to_period}
                  onChange={(e) => update(i, { to_period: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp help="TEA: efectiva anual. TNA: nominal anual.">
                  Tipo de tasa
                </LabelWithHelp>
                <Select
                  value={seg.rate_kind}
                  onValueChange={(v) =>
                    update(i, {
                      rate_kind: v as RateSegmentFormValues["rate_kind"],
                      capitalizations_per_year:
                        v === "TNA" ? seg.capitalizations_per_year || "12" : "",
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATE_KINDS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp help="Tasa anual en porcentaje.">
                  Tasa (%)
                </LabelWithHelp>
                <DecimalInput
                  value={seg.rate_value}
                  onChange={(v) => update(i, { rate_value: v })}
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp help="Solo TNA: capitalizaciones por año.">
                  Capit./año
                </LabelWithHelp>
                <Input
                  type="number"
                  min={1}
                  disabled={seg.rate_kind !== "TNA"}
                  value={seg.capitalizations_per_year}
                  onChange={(e) =>
                    update(i, { capitalizations_per_year: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addSegment}>
        <Plus /> Agregar tramo
      </Button>
    </div>
  );
}
