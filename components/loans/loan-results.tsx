"use client";

// Detalle de una simulación: KPIs, indicadores (TIR/TCEA/VAN) y el plan de
// pagos completo con cargos por período y cuota total (norma de
// transparencia). Desde aquí también se editan los parámetros y se recalcula.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FieldHelp, LabelWithHelp } from "@/components/field-help";
import { EmptyState, ErrorState } from "@/components/data-states";
import { Skeleton } from "@/components/ui/skeleton";
import { LoanBuilder } from "@/components/loans/loan-builder";
import { emptySegment } from "@/components/loans/rate-segments-editor";
import {
  useGenerateSchedule,
  useIndicators,
  useLoan,
  useSchedule,
  useUpdateLoan,
} from "@/hooks/use-loans";
import { useClients } from "@/hooks/use-clients";
import { useVehicles } from "@/hooks/use-vehicles";
import { graceLabel, summarizeSchedule } from "@/lib/loan-domain";
import {
  formatMoney,
  formatPercent,
  decimalStringToPercent,
  percentToDecimalString,
} from "@/lib/format";
import { toLoanCreate, type LoanFormValues } from "@/lib/schemas";
import type { GraceCode, Loan, ScheduleRow } from "@/lib/api/types";

export function LoanResults({ loanId }: { loanId: string }) {
  const loan = useLoan(loanId);
  const schedule = useSchedule(loanId);
  const generate = useGenerateSchedule(loanId);
  const clients = useClients();
  const vehicles = useVehicles();
  const [editOpen, setEditOpen] = useState(false);

  const rows = schedule.data?.rows ?? [];
  const hasSchedule = rows.length > 0;

  const clientName =
    clients.data?.find((c) => c.id === loan.data?.client_id)?.full_name ?? "—";
  const vehicle = vehicles.data?.find((v) => v.id === loan.data?.vehicle_id);
  const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : "—";

  async function regenerate() {
    try {
      await generate.mutateAsync();
      toast.success("Plan de pagos calculado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo calcular.");
    }
  }

  if (loan.isError) {
    return (
      <ErrorState
        message="No se pudo cargar la simulación."
        onRetry={() => loan.refetch()}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Volver"
            render={<Link href="/simulaciones" />}
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{clientName}</h1>
            <p className="text-muted-foreground text-sm">
              {vehicleName}
              {loan.data && (
                <>
                  {" · "}
                  {loan.data.term_periods} cuotas cada {loan.data.frequency_days} días
                </>
              )}
            </p>
          </div>
          {loan.data && (
            <Badge variant={loan.data.status === "draft" ? "secondary" : "default"}>
              {loan.data.status === "draft" ? "Borrador" : "Calculada"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)} disabled={!loan.data}>
            <Pencil /> Editar parámetros
          </Button>
          <Button onClick={regenerate} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {hasSchedule ? "Recalcular" : "Calcular plan"}
          </Button>
        </div>
      </div>

      {schedule.isLoading || loan.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : schedule.isError ? (
        <ErrorState
          message="No se pudo cargar el plan de pagos."
          onRetry={() => schedule.refetch()}
        />
      ) : !hasSchedule ? (
        <EmptyState
          icon={TrendingUp}
          title="Aún no se ha calculado el plan de pagos"
          description="Genera el plan de pagos por el método francés para ver la cuota, los indicadores (TCEA, TIR, VAN) y los gráficos."
          action={
            <Button onClick={regenerate} disabled={generate.isPending}>
              {generate.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Calcular plan de pagos
            </Button>
          }
        />
      ) : (
        loan.data && <ResultsBody loan={loan.data} rows={rows} loanId={loanId} />
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar parámetros</DialogTitle>
            <DialogDescription>
              El formulario carga los valores guardados (tramos de tasa, gracia y
              cargos incluidos). Al guardar se recalcula el plan de pagos.
            </DialogDescription>
          </DialogHeader>
          {loan.data && (
            <EditLoan loan={loan.data} onDone={() => setEditOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResultsBody({
  loan,
  rows,
  loanId,
}: {
  loan: Loan;
  rows: ScheduleRow[];
  loanId: string;
}) {
  const totals = useMemo(() => summarizeSchedule(rows), [rows]);
  const financed = Number(rows[0]?.initial_balance ?? 0);
  const currency = loan.currency;
  const hasCharges = rows.some((r) => (r.charges?.length ?? 0) > 0);

  // Totales de la tabla (suma de cada columna monetaria).
  const sum = (fn: (r: ScheduleRow) => string) =>
    rows.reduce((a, r) => a + (Number(fn(r)) || 0), 0);
  const colTotals = {
    interest: sum((r) => r.interest),
    amortization: sum((r) => r.amortization),
    payment: sum((r) => r.payment),
    charges: sum((r) => r.charges_total ?? "0"),
    total: sum((r) => r.total_payment ?? r.payment),
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Monto financiado" value={formatMoney(financed, currency)} />
        <Kpi label="Cuota regular" value={formatMoney(totals.cuotaRegular, currency)} accent />
        <Kpi label="Cuota balón (final)" value={formatMoney(totals.cuotaBalon, currency)} accent />
        <Kpi label="Interés total" value={formatMoney(totals.totalInteres, currency)} />
      </div>

      <Indicators loanId={loanId} currency={currency} />

      <Card>
        <CardHeader>
          <CardTitle>Plan de pagos</CardTitle>
          <CardDescription>
            Método francés vencido ordinario — la cuota total incluye seguros,
            comisiones y portes del período (norma de transparencia).
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="bg-destructive size-2.5 rounded-full" /> Interés
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-success size-2.5 rounded-full" /> Amortización
            </span>
            {hasCharges && (
              <span className="flex items-center gap-1.5">
                <span className="bg-warning size-2.5 rounded-full" /> Cargos
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="bg-primary size-2.5 rounded-full" /> Cuota total
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader className="bg-card sticky top-0">
                <TableRow>
                  <TableHead className="text-center">N°</TableHead>
                  <TableHead className="text-center">Gracia</TableHead>
                  <TableHead className="text-right">Saldo inicial</TableHead>
                  <TableHead className="text-right">Interés</TableHead>
                  <TableHead className="text-right">Amortización</TableHead>
                  <TableHead className="text-right">Cuota</TableHead>
                  {hasCharges && (
                    <TableHead className="text-right">Cargos</TableHead>
                  )}
                  <TableHead className="text-right">Cuota total</TableHead>
                  <TableHead className="text-right">Saldo final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.period}>
                    <TableCell className="text-center tabular-nums">{r.period}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={r.grace_type === "S" ? "outline" : "secondary"}
                        title={graceLabel(r.grace_type)}
                      >
                        {r.grace_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(r.initial_balance, currency)}
                    </TableCell>
                    <TableCell className="text-destructive text-right tabular-nums">
                      {formatMoney(r.interest, currency)}
                    </TableCell>
                    <TableCell className="text-success text-right tabular-nums">
                      {formatMoney(r.amortization, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(r.payment, currency)}
                    </TableCell>
                    {hasCharges && (
                      <TableCell
                        className="text-warning-foreground dark:text-warning text-right tabular-nums"
                        title={r.charges
                          ?.map((c) => `${c.name}: ${formatMoney(c.amount, currency)}`)
                          .join(" · ")}
                      >
                        {formatMoney(r.charges_total, currency)}
                      </TableCell>
                    )}
                    <TableCell className="text-primary text-right font-semibold tabular-nums">
                      {formatMoney(r.total_payment ?? r.payment, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(r.final_balance, currency)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-medium">
                  <TableCell className="text-center" colSpan={2}>
                    Totales
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-destructive text-right tabular-nums">
                    {formatMoney(colTotals.interest, currency)}
                  </TableCell>
                  <TableCell className="text-success text-right tabular-nums">
                    {formatMoney(colTotals.amortization, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(colTotals.payment, currency)}
                  </TableCell>
                  {hasCharges && (
                    <TableCell className="text-warning-foreground dark:text-warning text-right tabular-nums">
                      {formatMoney(colTotals.charges, currency)}
                    </TableCell>
                  )}
                  <TableCell className="text-primary text-right tabular-nums">
                    {formatMoney(colTotals.total, currency)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Indicators({
  loanId,
  currency,
}: {
  loanId: string;
  currency: Loan["currency"];
}) {
  const [ratePct, setRatePct] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce de la tasa de descuento antes de pedir el VAN.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(ratePct), 500);
    return () => clearTimeout(id);
  }, [ratePct]);

  const discountDecimal =
    debounced.trim() !== "" && !Number.isNaN(Number(debounced))
      ? percentToDecimalString(Number(debounced))
      : undefined;

  const indicators = useIndicators(loanId, discountDecimal);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicadores de rentabilidad y transparencia</CardTitle>
        <CardDescription>
          Desde el punto de vista del cliente (deudor). TIR, TCEA y VAN.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {indicators.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : indicators.isError ? (
          <ErrorState
            message="No se pudieron calcular los indicadores. Genera el plan primero."
            onRetry={() => indicators.refetch()}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi
              label="TIR (por período)"
              value={indicators.data ? formatPercent(indicators.data.tir_per_period) : "…"}
              help="Tasa interna de retorno por período de pago."
            />
            <Kpi
              label="TCEA"
              value={indicators.data ? formatPercent(indicators.data.tcea) : "…"}
              help="Costo Efectivo Anual (convención 360 días, sistema financiero peruano)."
              accent
            />
            <Kpi
              label="VAN"
              value={
                indicators.data?.van_at_period_rate
                  ? formatMoney(indicators.data.van_at_period_rate, currency)
                  : "—"
              }
              help="Valor Actual Neto a la tasa de descuento indicada."
            />
          </div>
        )}
        <div className="max-w-xs space-y-1.5">
          <LabelWithHelp help="Tasa de descuento por período (en %) para calcular el VAN. Déjalo vacío para omitir el VAN.">
            Tasa de descuento por período (%)
          </LabelWithHelp>
          <Input
            type="number"
            step="0.0001"
            placeholder="Ej. 1.0"
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  help,
  accent,
}: {
  label: string;
  value: string;
  help?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : undefined}>
      <CardContent className="space-y-1 py-1">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          {label}
          {help && <FieldHelp text={help} />}
        </div>
        <p className="text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function EditLoan({ loan, onDone }: { loan: Loan; onDone: () => void }) {
  const update = useUpdateLoan(loan.id);
  const generate = useGenerateSchedule(loan.id);

  // Precarga desde el préstamo guardado: gracia con la longitud exacta del
  // plazo, tramos de tasa y cargos convertidos de decimal (0.2) a % (20).
  const grace: GraceCode[] = Array.from(
    { length: loan.term_periods },
    (_, i) => loan.grace_periods[i] ?? ("S" as GraceCode),
  );

  const defaults: Partial<LoanFormValues> = {
    client_id: loan.client_id,
    vehicle_id: loan.vehicle_id,
    currency: loan.currency,
    vehicle_price: loan.vehicle_price,
    initial_payment_pct: String(decimalStringToPercent(loan.initial_payment_pct)),
    balloon_pct: String(decimalStringToPercent(loan.balloon_pct)),
    term_periods: String(loan.term_periods),
    frequency_days: String(loan.frequency_days),
    rate_segments:
      loan.rate_segments.length > 0
        ? loan.rate_segments.map((s) => ({
            from_period: String(s.from_period),
            to_period: String(s.to_period),
            rate_kind: s.rate_kind,
            rate_value: String(decimalStringToPercent(s.rate_value)),
            capitalizations_per_year:
              s.capitalizations_per_year != null
                ? String(s.capitalizations_per_year)
                : "",
          }))
        : [emptySegment(1, loan.term_periods)],
    grace_periods: grace,
    additional_charges: loan.additional_charges.map((c) => ({
      name: c.name,
      kind: c.kind,
      basis: c.basis,
      value:
        c.basis === "fixed" ? c.value : String(decimalStringToPercent(c.value)),
      applies_from_period: String(c.applies_from_period),
      applies_to_period:
        c.applies_to_period != null ? String(c.applies_to_period) : "",
    })),
  };

  async function handleSubmit(values: LoanFormValues) {
    try {
      const payload = toLoanCreate(values);
      await update.mutateAsync({
        currency: payload.currency,
        vehicle_price: payload.vehicle_price,
        initial_payment_pct: payload.initial_payment_pct,
        balloon_pct: payload.balloon_pct,
        term_periods: payload.term_periods,
        frequency_days: payload.frequency_days,
        rate_segments: payload.rate_segments,
        grace_periods: payload.grace_periods,
        additional_charges: payload.additional_charges,
      });
      await generate.mutateAsync();
      toast.success("Simulación actualizada y recalculada");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  }

  return (
    <LoanBuilder
      defaultValues={defaults}
      onSubmit={handleSubmit}
      submitLabel="Guardar y recalcular"
      lockClientVehicle
    />
  );
}
