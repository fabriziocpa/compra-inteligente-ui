"use client";

// Gráfico interés vs. amortización del cronograma regular: la lectura clásica
// del método francés — cuota constante, el interés baja y la amortización
// sube hasta cruzarse. Solo presenta datos del API; no calcula nada.

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { graceLabel } from "@/lib/loan-domain";
import { formatMoney } from "@/lib/format";
import type { Currency, GraceCode, ScheduleRow } from "@/lib/api/types";

// Pareja categórica validada (contraste ≥3:1, banda de luminosidad y CVD)
// sobre las superficies card de cada modo; cercana a --chart-1/--chart-2.
const chartConfig = {
  interes: {
    label: "Interés",
    theme: { light: "#e65300", dark: "#f05c00" },
  },
  amortizacion: {
    label: "Amortización",
    theme: { light: "#0d4dbe", dark: "#4d82e6" },
  },
} satisfies ChartConfig;

export function InterestAmortizationChart({
  rows,
  currency,
  hasBalloon,
}: {
  rows: ScheduleRow[];
  currency: Currency;
  hasBalloon: boolean;
}) {
  // El API devuelve los montos con signo (flujos del deudor); se normaliza
  // para graficar hacia arriba conservando los signos relativos, de modo que
  // en gracia total la amortización negativa (el saldo crece) siga visible.
  const regularRows = hasBalloon ? rows.slice(0, -1) : rows;
  const flip =
    regularRows.reduce((acc, r) => acc + Number(r.payment), 0) < 0 ? -1 : 1;
  const data = regularRows.map((r) => ({
    period: r.period,
    grace: r.grace_type,
    interes: flip * Number(r.interest),
    amortizacion: flip * Number(r.amortization),
  }));

  const compact = new Intl.NumberFormat("es-PE", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interés vs. amortización</CardTitle>
        <CardDescription>
          Método francés: la cuota es constante, pero cada período el interés
          baja y la amortización del capital sube
          {hasBalloon && " (cronograma regular, sin el cuotón N+1)"}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={72}
              // Redondea el techo del dominio para que los ticks caigan en
              // números limpios (0, 1000, 2000, …) en vez de fracciones.
              domain={[
                (dataMin: number) => Math.min(0, dataMin),
                (dataMax: number) => {
                  const step = Math.pow(10, Math.floor(Math.log10(Math.max(dataMax, 1))));
                  return Math.ceil(dataMax / (step / 2)) * (step / 2);
                },
              ]}
              tickFormatter={(v: number) => compact.format(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as
                      | { period: number; grace: GraceCode }
                      | undefined;
                    if (!p) return null;
                    return p.grace === "S"
                      ? `Cuota ${p.period}`
                      : `Cuota ${p.period} · ${graceLabel(p.grace)}`;
                  }}
                  formatter={(value, name, item) => (
                    <>
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label ?? name}
                        </span>
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {formatMoney(Number(value), currency)}
                        </span>
                      </div>
                    </>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="interes"
              type="monotone"
              stroke="var(--color-interes)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            />
            <Line
              dataKey="amortizacion"
              type="monotone"
              stroke="var(--color-amortizacion)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
