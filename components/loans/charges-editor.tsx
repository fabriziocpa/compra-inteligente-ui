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
import { CHARGE_BASES, CHARGE_KINDS, CHARGE_PRESETS } from "@/lib/loan-domain";
import type { AdditionalChargeFormValues } from "@/lib/schemas";

export function emptyCharge(): AdditionalChargeFormValues {
  return {
    name: "",
    kind: "seguro",
    basis: "balance_pct",
    value: "",
    applies_from_period: "1",
    applies_to_period: "",
  };
}

export function ChargesEditor({
  value,
  onChange,
}: {
  value: AdditionalChargeFormValues[];
  onChange: (v: AdditionalChargeFormValues[]) => void;
}) {
  function update(i: number, patch: Partial<AdditionalChargeFormValues>) {
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Opcional. Seguros, comisiones o portes que se aplican por período.
      </p>

      {value.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          Sin cargos adicionales.
        </p>
      )}

      {value.map((c, i) => {
        const isPct = c.basis !== "fixed";
        const valueHelp =
          c.basis === "fixed"
            ? "Monto fijo por período."
            : c.basis === "vehicle_pct_annual"
              ? "% anual sobre el precio del vehículo."
              : "Porcentaje a aplicar.";
        return (
          <div key={i} className="bg-muted/40 space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cargo {i + 1}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Eliminar cargo"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <LabelWithHelp>
                  Nombre
                </LabelWithHelp>
                <Input
                  value={c.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp help="Categoría del cargo.">Tipo</LabelWithHelp>
                <Select
                  items={CHARGE_KINDS}
                  value={c.kind}
                  onValueChange={(v) =>
                    update(i, { kind: v as AdditionalChargeFormValues["kind"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHARGE_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp help="Forma de cálculo del cargo.">
                  Base
                </LabelWithHelp>
                <Select
                  items={CHARGE_BASES}
                  value={c.basis}
                  onValueChange={(v) =>
                    update(i, { basis: v as AdditionalChargeFormValues["basis"] })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHARGE_BASES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp help={valueHelp}>
                  {c.basis === "vehicle_pct_annual"
                    ? "Valor (% anual)"
                    : isPct
                      ? "Valor (%)"
                      : "Monto"}
                </LabelWithHelp>
                <DecimalInput
                  value={c.value}
                  onChange={(v) => update(i, { value: v })}
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp>
                  Desde período
                </LabelWithHelp>
                <Input
                  type="number"
                  min={1}
                  value={c.applies_from_period}
                  onChange={(e) => update(i, { applies_from_period: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp help="Último período. Vacío = hasta el final.">
                  Hasta período
                </LabelWithHelp>
                <Input
                  type="number"
                  min={1}
                  placeholder="Hasta el final"
                  value={c.applies_to_period}
                  onChange={(e) => update(i, { applies_to_period: e.target.value })}
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...value, emptyCharge()])}
        >
          <Plus /> Agregar cargo
        </Button>
        {/* Presets del modelo Interbank: precargan nombre, tipo y base;
            solo queda digitar el valor. Se ocultan si la fila ya existe. */}
        {CHARGE_PRESETS.filter(
          (p) => !value.some((c) => c.name === p.name),
        ).map((p) => (
          <Button
            key={p.name}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange([
                ...value,
                { ...emptyCharge(), name: p.name, kind: p.kind, basis: p.basis },
              ])
            }
          >
            <Plus /> {p.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
