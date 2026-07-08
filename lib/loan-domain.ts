// Vocabulario del dominio (catálogos de la UI) para la modalidad
// «Compra Inteligente» (crédito con cuota balón).
import type {
  ChargeBasis,
  ChargeKind,
  Currency,
  GraceCode,
  RateKind,
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

// Modalidades del seguro de desgravamen (campo obligatorio del formulario).
export const SEGURO_TIPOS: { value: "porcentaje" | "fijo"; label: string }[] = [
  { value: "porcentaje", label: "% mensual del saldo" },
  { value: "fijo", label: "Monto fijo por mes" },
];

// (4.8) Frecuencias cerradas: divisores de 360 con nombre comercial.
export const FREQUENCIES: { value: string; label: string }[] = [
  { value: "30", label: "Mensual (30 días)" },
  { value: "60", label: "Bimestral (60 días)" },
  { value: "90", label: "Trimestral (90 días)" },
  { value: "120", label: "Cuatrimestral (120 días)" },
  { value: "180", label: "Semestral (180 días)" },
  { value: "360", label: "Anual (360 días)" },
];

// Conceptos de los costos/gastos iniciales (una sola vez, hoja Interbank).
// "otro" habilita el nombre libre en el editor.
export const INITIAL_COST_CONCEPTS: { value: string; label: string }[] = [
  { value: "notariales", label: "Gastos notariales" },
  { value: "registrales", label: "Gastos registrales" },
  { value: "tasacion", label: "Tasación" },
  { value: "estudio", label: "Comisión de estudio" },
  { value: "activacion", label: "Comisión de activación" },
  { value: "otro", label: "Otro" },
];

export function initialCostConceptLabel(value: string): string {
  return INITIAL_COST_CONCEPTS.find((c) => c.value === value)?.label ?? value;
}

// Formas de pago de un costo inicial: financiado (se suma al préstamo)
// o al contado (informativo, se paga aparte en el desembolso).
export const INITIAL_COST_PAYMENTS: {
  value: "financiado" | "contado";
  label: string;
  help: string;
}[] = [
  {
    value: "financiado",
    label: "Financiado",
    help: "El monto se suma al préstamo y genera intereses.",
  },
  {
    value: "contado",
    label: "Al contado",
    help: "Se paga por separado al inicio; no entra al préstamo.",
  },
];

export const CHARGE_KINDS: { value: ChargeKind; label: string }[] = [
  { value: "seguro", label: "Seguro" },
  { value: "comision", label: "Comisión" },
  { value: "portes", label: "Portes" },
  { value: "otro", label: "Otro" },
];

// Cargos periódicos frecuentes (hoja Interbank): chips que precargan la fila
// en el editor; el usuario solo digita el valor.
export const CHARGE_PRESETS: {
  name: string;
  kind: ChargeKind;
  basis: ChargeBasis;
}[] = [
  { name: "GPS", kind: "otro", basis: "fixed" },
  { name: "Portes", kind: "portes", basis: "fixed" },
  { name: "Gastos adm.", kind: "comision", basis: "fixed" },
  { name: "Seguro vehicular (todo riesgo)", kind: "seguro", basis: "vehicle_pct_annual" },
];

export const CHARGE_BASES: { value: ChargeBasis; label: string; help: string }[] = [
  { value: "fixed", label: "Monto fijo", help: "Importe fijo cobrado cada período." },
  { value: "balance_pct", label: "% del saldo", help: "Porcentaje del saldo pendiente del período." },
  { value: "payment_pct", label: "% de la cuota", help: "Porcentaje del monto de la cuota del período." },
  {
    value: "vehicle_pct_annual",
    label: "% anual del precio del vehículo",
    help: "Tasa anual sobre el precio del vehículo, prorrateada al período (ej. seguro de riesgo 0.30% anual).",
  },
];

export function graceLabel(code: GraceCode): string {
  return GRACE_CODES.find((g) => g.value === code)?.label ?? code;
}

export function currencyName(c: Currency): string {
  return c === "PEN" ? "Soles" : "Dólares";
}

// NOTA: aquí NO hay derivaciones numéricas del cronograma. Todo cálculo
// financiero (totales, cuota regular, cuotón, TEA/TEM, COKi…) lo hace el API
// y llega en `Schedule.summary` e `Indicators`; la UI solo formatea.

export { type Currency };
