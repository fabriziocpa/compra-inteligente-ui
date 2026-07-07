// Helpers de presentación es-PE. Montos y tasas llegan como strings; se
// parsean solo para mostrar — nunca devuelvas al API un float parseado.
import type { Currency } from "@/lib/api/types";

const currencyLabels: Record<Currency, string> = { PEN: "S/", USD: "US$" };

export function formatMoney(
  value: string | number | null | undefined,
  currency: Currency = "PEN",
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${currencyLabels[currency]} ${formatted}`;
}

export function formatNumber(value: string | number, digits = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

/** Tasa decimal (0.12) → string en porcentaje ("12,0000 %"). */
export function formatPercent(
  value: string | number | null | undefined,
  digits = 4,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return `${formatNumber(n * 100, digits)} %`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "20" (porcentaje, como se digita) → "0.2" (string decimal para el API). */
export function percentToDecimalString(percent: number | string): string {
  const n = typeof percent === "string" ? Number(percent) : percent;
  if (Number.isNaN(n)) return "0";
  return String(n / 100);
}

/** "0.2" (decimal, del API) → 20 (número en porcentaje para un formulario). */
export function decimalStringToPercent(decimal: string | number): number {
  const n = typeof decimal === "string" ? Number(decimal) : decimal;
  if (Number.isNaN(n)) return 0;
  return Number((n * 100).toFixed(6));
}
