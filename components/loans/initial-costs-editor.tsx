"use client";

// Editor de costos/gastos iniciales (una sola vez): mismo patrón de filas
// que el editor de cargos adicionales, pero con tres campos por fila:
// concepto (catálogo), monto y forma de pago (Financiado / Al contado).

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
import { INITIAL_COST_CONCEPTS, INITIAL_COST_PAYMENTS } from "@/lib/loan-domain";
import type { InitialCostFormValues } from "@/lib/schemas";

export function emptyInitialCost(): InitialCostFormValues {
  return { concept: "notariales", name: "", amount: "", payment: "financiado" };
}

export function InitialCostsEditor({
  value,
  onChange,
}: {
  value: InitialCostFormValues[];
  onChange: (v: InitialCostFormValues[]) => void;
}) {
  function update(i: number, patch: Partial<InitialCostFormValues>) {
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Opcional. Se pagan una sola vez al inicio. Los «Financiado» se suman al
        préstamo; los «Al contado» se pagan aparte y no generan intereses.
      </p>

      {value.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          Sin costos iniciales.
        </p>
      )}

      {value.map((c, i) => (
        <div key={i} className="bg-muted/40 space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Costo inicial {i + 1}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Eliminar costo inicial"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              <Trash2 />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <LabelWithHelp help="Concepto del gasto (hoja Interbank).">
                Concepto
              </LabelWithHelp>
              <Select
                items={INITIAL_COST_CONCEPTS}
                value={c.concept}
                onValueChange={(v) =>
                  update(i, { concept: v as InitialCostFormValues["concept"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INITIAL_COST_CONCEPTS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {c.concept === "otro" && (
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <LabelWithHelp help="Nombre del costo no listado en el catálogo.">
                  Nombre
                </LabelWithHelp>
                <Input
                  value={c.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <LabelWithHelp help="Monto que se paga una sola vez.">
                Monto
              </LabelWithHelp>
              <DecimalInput
                value={c.amount}
                onChange={(v) => update(i, { amount: v })}
              />
            </div>
            <div className="space-y-1.5">
              <LabelWithHelp help="Financiado se suma al préstamo; Al contado se paga aparte.">
                Forma de pago
              </LabelWithHelp>
              <Select
                items={INITIAL_COST_PAYMENTS}
                value={c.payment}
                onValueChange={(v) =>
                  update(i, { payment: v as InitialCostFormValues["payment"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INITIAL_COST_PAYMENTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, emptyInitialCost()])}
      >
        <Plus /> Agregar costo inicial
      </Button>
    </div>
  );
}
