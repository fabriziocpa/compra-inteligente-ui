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
import { CHARGE_BASES, CHARGE_KINDS } from "@/lib/loan-domain";
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
        return (
          <div key={i} className="bg-muted/40 space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cargo {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar cargo"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <LabelWithHelp help="Nombre descriptivo del cargo (ej. Seguro vehicular).">
                  Nombre
                </LabelWithHelp>
                <Input
                  placeholder="Seguro vehicular"
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
                <LabelWithHelp help="Cómo se calcula: monto fijo, % del saldo o % de la cuota.">
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
                <LabelWithHelp
                  help={
                    isPct
                      ? "Porcentaje a aplicar (ej. 0.3 para 0.3%)."
                      : "Monto fijo por período en la moneda del crédito."
                  }
                >
                  {isPct ? "Valor (%)" : "Monto"}
                </LabelWithHelp>
                <Input
                  type="number"
                  step="0.0001"
                  value={c.value}
                  onChange={(e) => update(i, { value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithHelp help="Período desde el cual se aplica el cargo.">
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
                <LabelWithHelp help="Período hasta el cual se aplica. Vacío = hasta el final.">
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, emptyCharge()])}
      >
        <Plus /> Agregar cargo
      </Button>
    </div>
  );
}
