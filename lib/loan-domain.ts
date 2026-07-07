// Vocabulario del dominio + derivaciones para la modalidad «Compra Inteligente»
// (crédito con cuota balón).
import type {
  ChargeBasis,
  ChargeKind,
  Currency,
  GraceCode,
  RateKind,
  ScheduleRow,
} from "@/lib/api/types";

export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "PEN", label: "Soles (S/)" },
  { value: "USD", label: "Dólares (US$)" },
];

export const RATE_KINDS: { value: RateKind; label: string; help: string }[] = [
  { value: "TEA", label: "TEA — Tasa Efectiva Anual", help: "Tasa efectiva anual. No requiere capitalización." },
  { value: "TNA", label: "TNA — Tasa Nominal Anual", help: "Tasa nominal anual. Requiere indicar las capitalizaciones por año." },
];

export const GRACE_CODES: { value: GraceCode; label: string; short: string; help: string }[] = [
  { value: "S", label: "Normal (sin gracia)", short: "S", help: "Cuota completa: interés + amortización." },
  { value: "P", label: "Parcial (solo interés)", short: "P", help: "Solo se paga el interés del período; no amortiza capital." },
  { value: "T", label: "Total", short: "T", help: "No se paga nada; el interés se capitaliza al saldo." },
];

export const CHARGE_KINDS: { value: ChargeKind; label: string }[] = [
  { value: "seguro", label: "Seguro" },
  { value: "comision", label: "Comisión" },
  { value: "portes", label: "Portes" },
  { value: "otro", label: "Otro" },
];

export const CHARGE_BASES: { value: ChargeBasis; label: string; help: string }[] = [
  { value: "fixed", label: "Monto fijo", help: "Importe fijo cobrado cada período." },
  { value: "balance_pct", label: "% del saldo", help: "Porcentaje del saldo pendiente del período." },
  { value: "payment_pct", label: "% de la cuota", help: "Porcentaje del monto de la cuota del período." },
];

export function graceLabel(code: GraceCode): string {
  return GRACE_CODES.find((g) => g.value === code)?.label ?? code;
}

export function currencyName(c: Currency): string {
  return c === "PEN" ? "Soles" : "Dólares";
}

// ---- Derivaciones del cronograma (las entradas son strings decimales) ----

export interface ScheduleTotals {
  totalInteres: number;
  totalAmortizacion: number;
  totalCuotas: number;
  cuotaRegular: number;
  cuotaBalon: number;
}

export function summarizeSchedule(rows: ScheduleRow[]): ScheduleTotals {
  const totalInteres = rows.reduce((a, r) => a + (Number(r.interest) || 0), 0);
  const totalAmortizacion = rows.reduce((a, r) => a + (Number(r.amortization) || 0), 0);
  const totalCuotas = rows.reduce((a, r) => a + (Number(r.payment) || 0), 0);
  const payments = rows.map((r) => Number(r.payment) || 0);
  const last = payments[payments.length - 1] ?? 0;
  // La cuota "regular" es la más representativa de los pagos no finales.
  const regular = payments.slice(0, -1).filter((p) => p > 0).sort((a, b) => a - b)[
    Math.floor(Math.max(payments.length - 2, 0) / 2)
  ] ?? last;
  return {
    totalInteres,
    totalAmortizacion,
    totalCuotas,
    cuotaRegular: regular,
    cuotaBalon: last,
  };
}

export { type Currency };
