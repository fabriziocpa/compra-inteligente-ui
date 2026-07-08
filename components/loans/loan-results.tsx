"use client";

// Detalle de una simulación: KPIs, indicadores (TIR/TCEA/VAN) y el plan de
// pagos completo con cargos por período y cuota total (norma de
// transparencia). Desde aquí también se editan los parámetros y se recalcula.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Maximize2,
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
import { graceLabel } from "@/lib/loan-domain";
import {
  formatMoney,
  formatPercent,
  decimalStringToPercent,
  percentToDecimalString,
} from "@/lib/format";
import { NumberShimmer } from "@/components/loans/number-shimmer";
import {
  SEGURO_FIJO_NAME,
  initialCostToForm,
  legacyFinancedCostsToForm,
  toLoanCreate,
  type LoanFormValues,
} from "@/lib/schemas";
import type { GraceCode, Loan, ScheduleRow, ScheduleSummary } from "@/lib/api/types";

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
            variant="outline"
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
        loan.data &&
        schedule.data?.summary && (
          <ResultsBody
            loan={loan.data}
            rows={rows}
            summary={schedule.data.summary}
            loanId={loanId}
            refreshing={generate.isPending || schedule.isFetching}
          />
        )
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
  summary,
  loanId,
  refreshing = false,
}: {
  loan: Loan;
  rows: ScheduleRow[];
  summary: ScheduleSummary;
  loanId: string;
  /** Recalculando el plan: los montos muestran el shimmer. */
  refreshing?: boolean;
}) {
  const currency = loan.currency;
  const hasCharges = rows.some((r) => (r.charges?.length ?? 0) > 0);
  const hasBalloon = summary.has_balloon;
  const hasInsurance = Number(summary.total_insurance) !== 0;
  const colTotals = summary.column_totals;
  const [tableOpen, setTableOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Monto del préstamo"
          value={formatMoney(summary.loan_principal, currency)}
          help="Precio − cuota inicial + costes financiados."
          loading={refreshing}
        />
        <Kpi
          label="Cuota regular"
          value={formatMoney(summary.regular_payment, currency)}
          help="Cuota del cronograma francés; incluye el seguro de desgravamen."
          accent
          loading={refreshing}
        />
        <Kpi
          label="Cuota balón (final)"
          value={hasBalloon ? formatMoney(summary.balloon_payment, currency) : "—"}
          help={hasBalloon ? "Se paga íntegra en el período N+1." : undefined}
          accent
          loading={refreshing}
        />
        <Kpi
          label="Intereses totales"
          value={formatMoney(summary.total_interest, currency)}
          help="Σ cuotas − Σ amortización − Σ desgravamen."
          loading={refreshing}
        />
      </div>

      <Resultados loan={loan} summary={summary} loanId={loanId} />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Plan de pagos</CardTitle>
              <CardDescription>
                Método francés vencido ordinario
                {hasBalloon &&
                  " — modelo Interbank: el cuotón capitaliza en paralelo y se paga en el período N+1"}
                . El flujo del período incluye seguros, comisiones y portes.
                {hasBalloon &&
                  " Amplía la tabla para ver también el cronograma regular."}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTableOpen(true)}>
              <Maximize2 /> Ampliar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {/* Vista normal: cronograma del cuotón (cuota final). El cronograma
              regular se muestra en la vista ampliada (o aquí si no hay balón). */}
          <ScheduleTable
            rows={rows}
            currency={currency}
            colTotals={colTotals}
            hasBalloon={hasBalloon}
            hasInsurance={hasInsurance}
            hasCharges={hasCharges}
            showRegular={!hasBalloon}
            maxHeightClass="max-h-[520px]"
          />
        </CardContent>
      </Card>

      <Dialog open={tableOpen} onOpenChange={setTableOpen}>
        <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-[min(96vw,1500px)]">
          <DialogHeader>
            <DialogTitle>Plan de pagos — vista completa</DialogTitle>
            <DialogDescription>
              {hasBalloon
                ? "Cronograma del cuotón (izquierda) y cronograma regular con la cuota (derecha)."
                : "Cronograma completo del crédito."}
            </DialogDescription>
          </DialogHeader>
          <ScheduleTable
            rows={rows}
            currency={currency}
            colTotals={colTotals}
            hasBalloon={hasBalloon}
            hasInsurance={hasInsurance}
            hasCharges={hasCharges}
            showRegular
            maxHeightClass="max-h-[74dvh]"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Celda monetaria: solo los montos NEGATIVOS van en rojo. */
function MoneyCell({
  value,
  currency,
  className = "",
  dash = false,
}: {
  value: string | number;
  currency: Loan["currency"];
  className?: string;
  dash?: boolean;
}) {
  if (dash) {
    return <TableCell className={`text-right tabular-nums ${className}`}>—</TableCell>;
  }
  const negative = Number(value) < 0;
  return (
    <TableCell
      className={`text-right tabular-nums ${negative ? "text-destructive" : ""} ${className}`}
    >
      {formatMoney(value, currency)}
    </TableCell>
  );
}

/** Tabla del cronograma. Orden de grupos: cuotón (cuota final) a la
 * IZQUIERDA y cronograma regular a la DERECHA; `showRegular` controla si el
 * grupo regular se renderiza (vista normal vs. ampliada). */
function ScheduleTable({
  rows,
  currency,
  colTotals,
  hasBalloon,
  hasInsurance,
  hasCharges,
  showRegular,
  maxHeightClass,
}: {
  rows: ScheduleRow[];
  currency: Loan["currency"];
  colTotals: ScheduleSummary["column_totals"];
  hasBalloon: boolean;
  hasInsurance: boolean;
  hasCharges: boolean;
  showRegular: boolean;
  maxHeightClass: string;
}) {
  const regularSpan = hasInsurance ? 6 : 5;
  return (
    <div className={`overflow-auto ${maxHeightClass}`}>
      <Table>
        <TableHeader className="bg-card sticky top-0 z-10">
          {hasBalloon && (
            <TableRow>
              <TableHead colSpan={2} />
              <TableHead
                colSpan={5}
                className="text-muted-foreground border-l text-center text-xs font-medium"
              >
                Cuotón (cuota final)
              </TableHead>
              {showRegular && (
                <TableHead
                  colSpan={regularSpan}
                  className="text-muted-foreground border-l text-center text-xs font-medium"
                >
                  Cronograma regular
                </TableHead>
              )}
              <TableHead colSpan={hasCharges ? 2 : 1} className="border-l" />
            </TableRow>
          )}
          <TableRow>
            <TableHead className="text-center">N°</TableHead>
            <TableHead className="text-center">Gracia</TableHead>
            {hasBalloon && (
              <>
                <TableHead className="border-l text-right">Saldo cuotón</TableHead>
                <TableHead className="text-right">Interés</TableHead>
                <TableHead className="text-right">Seg. desgrav.</TableHead>
                <TableHead className="text-right">Pago cuotón</TableHead>
                <TableHead className="text-right">Saldo final</TableHead>
              </>
            )}
            {showRegular && (
              <>
                <TableHead className="border-l text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Interés</TableHead>
                <TableHead className="text-right">Cuota</TableHead>
                <TableHead className="text-right">Amortización</TableHead>
                {hasInsurance && (
                  <TableHead className="text-right">Seg. desgrav.</TableHead>
                )}
                <TableHead className="text-right">Saldo final</TableHead>
              </>
            )}
            {hasCharges && <TableHead className="border-l text-right">Cargos</TableHead>}
            <TableHead className={`text-right ${hasCharges ? "" : "border-l"}`}>
              Flujo
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const isBalloonRow = hasBalloon && r.period === rows.length;
            return (
              <TableRow key={r.period} className={isBalloonRow ? "bg-primary/5" : undefined}>
                <TableCell className="text-center tabular-nums">{r.period}</TableCell>
                <TableCell className="text-center">
                  {isBalloonRow ? (
                    <Badge variant="default" title="Período extra: pago del cuotón">
                      N+1
                    </Badge>
                  ) : (
                    <Badge
                      variant={r.grace_type === "S" ? "outline" : "secondary"}
                      title={graceLabel(r.grace_type)}
                    >
                      {r.grace_type}
                    </Badge>
                  )}
                </TableCell>
                {hasBalloon && (
                  <>
                    <MoneyCell value={r.balloon_initial} currency={currency} className="border-l" />
                    <MoneyCell value={r.balloon_interest} currency={currency} />
                    <MoneyCell value={r.balloon_insurance} currency={currency} />
                    <MoneyCell
                      value={r.balloon_amortization}
                      currency={currency}
                      dash={!Number(r.balloon_amortization)}
                      className="font-medium"
                    />
                    <MoneyCell value={r.balloon_final} currency={currency} />
                  </>
                )}
                {showRegular && (
                  <>
                    <MoneyCell
                      value={r.initial_balance}
                      currency={currency}
                      dash={isBalloonRow}
                      className="border-l"
                    />
                    <MoneyCell value={r.interest} currency={currency} dash={isBalloonRow} />
                    <MoneyCell value={r.payment} currency={currency} dash={isBalloonRow} />
                    <MoneyCell
                      value={r.amortization}
                      currency={currency}
                      dash={isBalloonRow}
                    />
                    {hasInsurance && (
                      <MoneyCell value={r.insurance} currency={currency} dash={isBalloonRow} />
                    )}
                    <MoneyCell
                      value={r.final_balance}
                      currency={currency}
                      dash={isBalloonRow}
                    />
                  </>
                )}
                {hasCharges && (
                  <MoneyCell
                    value={r.charges_total}
                    currency={currency}
                    className="border-l"
                  />
                )}
                <MoneyCell
                  value={r.total_payment ?? r.payment}
                  currency={currency}
                  className={`font-semibold ${hasCharges ? "" : "border-l"}`}
                />
              </TableRow>
            );
          })}
          <TableRow className="bg-muted/40 font-medium">
            <TableCell className="text-center" colSpan={2}>
              Totales
            </TableCell>
            {hasBalloon && (
              <>
                <TableCell className="border-l" />
                <TableCell />
                <TableCell />
                <MoneyCell value={colTotals.balloon_amortization} currency={currency} />
                <TableCell />
              </>
            )}
            {showRegular && (
              <>
                <TableCell className="border-l" />
                <MoneyCell value={colTotals.interest} currency={currency} />
                <MoneyCell value={colTotals.payment} currency={currency} />
                <MoneyCell value={colTotals.amortization} currency={currency} />
                {hasInsurance && (
                  <MoneyCell value={colTotals.insurance} currency={currency} />
                )}
                <TableCell />
              </>
            )}
            {hasCharges && (
              <MoneyCell value={colTotals.charges} currency={currency} className="border-l" />
            )}
            <MoneyCell
              value={colTotals.total_payment}
              currency={currency}
              className={`font-semibold ${hasCharges ? "" : "border-l"}`}
            />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}


/** Bloque «Resultados» jerárquico, con la misma estructura que la hoja del
 * curso. TODOS los valores vienen calculados del API (`summary` del
 * cronograma e `/indicators`); aquí solo se formatea y renderiza. */
function Resultados({
  loan,
  summary,
  loanId,
}: {
  loan: Loan;
  summary: ScheduleSummary;
  loanId: string;
}) {
  const currency = loan.currency;
  const frec = loan.frequency_days;

  // COK anual (obligatorio y ≥ 0): viaja tal cual al API, que lo convierte
  // a COKi = (1+COK)^(frec/360) − 1 y lo devuelve en la respuesta.
  const [cokPct, setCokPct] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(cokPct), 500);
    return () => clearTimeout(id);
  }, [cokPct]);
  const cokNum = Number(debounced);
  const cokEmpty = debounced.trim() === "";
  const cokInvalid = !cokEmpty && (Number.isNaN(cokNum) || cokNum < 0);
  const cokAnnualDecimal =
    !cokEmpty && !cokInvalid ? percentToDecimalString(cokNum) : undefined;
  const indicators = useIndicators(loanId, cokAnnualDecimal);
  const coki = indicators.data?.discount_rate_per_period ?? null;
  const vanNum = Number(indicators.data?.van_at_period_rate ?? NaN);

  const multiTramo = loan.rate_segments.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados</CardTitle>
        <CardDescription>
          Calculados del plan de pagos, con la misma estructura que la hoja del
          curso. Desde el punto de vista del cliente (deudor).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        <ResultSection title="Del financiamiento">
          <ResultRow
            label="Tasa efectiva anual (TEA)"
            value={formatPercent(summary.tea, 7) + (multiTramo ? " (tramo 1)" : "")}
            help="Tasa efectiva anual del crédito; si la tasa fue TNA, ya está convertida."
          />
          <ResultRow
            label={
              frec === 30
                ? "Tasa efectiva mensual (TEM)"
                : `Tasa efectiva del período (${frec} días)`
            }
            value={formatPercent(summary.tep, 7) + (multiTramo ? " (tramo 1)" : "")}
            help="TEA convertida al período de pago; es la tasa que se aplica en cada cuota."
          />
          <ResultRow
            label="Nº cuotas por año"
            value={String(summary.payments_per_year)}
            help="360 días entre la frecuencia de pago."
          />
          <ResultRow
            label="Nº total de cuotas"
            value={String(summary.total_payments)}
            help="Plazo del crédito en cuotas regulares (el cuotón se paga en N+1)."
          />
          <ResultRow
            label="Cuota inicial"
            value={formatMoney(summary.initial_payment, currency)}
            help="Pago al contado al inicio: % inicial × precio del vehículo."
          />
          <ResultRow
            label="Cuota final"
            value={formatMoney(summary.balloon, currency)}
            help="Balón: % final × precio; se paga íntegro en el período N+1."
          />
          {Number(summary.financed_costs) !== 0 && (
            <ResultRow
              label="Costes iniciales financiados"
              value={formatMoney(summary.financed_costs, currency)}
              help="Notariales, registrales y comisiones que se suman al préstamo."
            />
          )}
          {Number(summary.cash_costs) !== 0 && (
            <ResultRow
              label="Costes iniciales al contado"
              value={formatMoney(summary.cash_costs, currency)}
              help="Se pagan aparte en el desembolso; no entran al préstamo ni a los indicadores."
            />
          )}
          <ResultRow
            label="Monto del préstamo"
            value={formatMoney(summary.loan_principal, currency)}
            strong
            help="Precio − cuota inicial + costes iniciales financiados."
          />
          {summary.has_balloon && (
            <ResultRow
              label="Saldo a financiar con cuotas"
              value={formatMoney(summary.regular_principal, currency)}
              help="Préstamo menos el valor presente del cuotón; se amortiza con las cuotas regulares."
            />
          )}
        </ResultSection>

        <ResultSection title="Costes y gastos periódicos">
          <ResultRow
            label="% de seguro desgravamen per."
            value={formatPercent(summary.desgravamen_pct_per_period, 3)}
            help="Tasa del seguro de desgravamen por período; va dentro de la cuota."
          />
          {summary.periodic_charges.map((c) => (
            <ResultRow
              key={c.name}
              label={c.name}
              value={formatMoney(c.amount, currency)}
            />
          ))}
        </ResultSection>

        <ResultSection title="Totales por concepto">
          <ResultRow
            label="Intereses"
            value={formatMoney(summary.total_interest, currency)}
            help="Interés pagado dentro de las cuotas: Σ cuotas − Σ amortización − Σ desgravamen."
          />
          <ResultRow
            label="Amortización del capital"
            value={formatMoney(summary.total_amortization, currency)}
            help="Capital devuelto en todo el plan, incluido el cuotón y el interés capitalizado en gracia."
          />
          <ResultRow
            label="Seguro de desgravamen"
            value={formatMoney(summary.total_insurance, currency)}
            help="Total pagado por desgravamen en el cronograma regular."
          />
          {summary.total_charges.map((c) => (
            <ResultRow
              key={c.name}
              label={c.name}
              value={formatMoney(c.amount, currency)}
            />
          ))}
        </ResultSection>

        <ResultSection title="Indicadores de rentabilidad">
          {indicators.isError ? (
            <ErrorState
              message="No se pudieron calcular los indicadores. Genera el plan primero."
              onRetry={() => indicators.refetch()}
            />
          ) : (
            <>
              <ResultRow
                label="Tasa de descuento (COKi)"
                value={coki ? formatPercent(coki, 5) : "—"}
                help="COK anual convertido al período: (1+COK)^(frec/360) − 1."
                loading={indicators.isFetching}
              />
              <ResultRow
                label="TIR de la operación"
                value={
                  indicators.data
                    ? formatPercent(indicators.data.tir_per_period, 5)
                    : "…"
                }
                help="Tasa interna de retorno por período del flujo del deudor (t0 = préstamo)."
                loading={indicators.isFetching}
              />
              <ResultRow
                label="TCEA de la operación"
                value={indicators.data ? formatPercent(indicators.data.tcea, 5) : "…"}
                strong
                help="Costo efectivo anual real del crédito: TIR anualizada con cargos y seguros."
                loading={indicators.isFetching}
              />
              <ResultRow
                label="VAN operación"
                value={
                  indicators.data?.van_at_period_rate
                    ? formatMoney(indicators.data.van_at_period_rate, currency)
                    : "—"
                }
                strong
                help="Valor actual neto del flujo descontado al COKi; negativo si el COK es menor que la TCEA."
                loading={indicators.isFetching}
              />
            </>
          )}
          <div className="mt-3 max-w-sm space-y-1.5">
            <LabelWithHelp help="Costo de oportunidad anual del deudor; se convierte a tasa del período.">
              COK anual (%) — obligatorio para el VAN
            </LabelWithHelp>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={cokPct}
              onChange={(e) => setCokPct(e.target.value)}
              aria-invalid={cokInvalid}
            />
            {cokInvalid ? (
              <p className="text-destructive text-xs">
                El COK no puede ser negativo. Ingresa un porcentaje ≥ 0.
              </p>
            ) : cokEmpty ? (
              <p className="text-muted-foreground text-xs">
                Ingresa el COK anual para calcular el VAN.
              </p>
            ) : null}
            {!Number.isNaN(vanNum) && vanNum < 0 && (
              <p className="text-warning-foreground dark:text-warning text-xs">
                VAN negativo: el COK ingresado es menor que el costo efectivo del
                crédito (TCEA); a esa tasa de oportunidad la financiación no le
                conviene al deudor. Prueba con un COK anual mayor.
              </p>
            )}
          </div>
        </ResultSection>
      </CardContent>
    </Card>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-muted/40 rounded-xl border p-4">
      <h3 className="text-primary mb-3 text-xs font-semibold tracking-widest uppercase">
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function ResultRow({
  label,
  value,
  strong,
  help,
  loading,
}: {
  label: string;
  value: string;
  strong?: boolean;
  help?: string;
  loading?: boolean;
}) {
  return (
    <div className="border-border/70 flex items-center justify-between gap-6 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {label}
        {help && <FieldHelp text={help} />}
      </span>
      <span
        className={`text-right text-sm tabular-nums ${
          strong ? "text-primary font-semibold" : "font-medium"
        }`}
      >
        {loading ? <NumberShimmer widthClass="w-20" /> : value}
      </span>
    </div>
  );
}

function Kpi({
  label,
  value,
  help,
  accent,
  loading,
}: {
  label: string;
  value: string;
  help?: string;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : undefined}>
      <CardContent className="space-y-1 py-1">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          {label}
          {help && <FieldHelp text={help} />}
        </div>
        <p className="text-xl font-semibold tracking-tight tabular-nums">
          {loading ? <NumberShimmer widthClass="w-28" /> : value}
        </p>
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

  // Seguro: el % mensual vive en desgravamen_monthly_pct; el monto fijo vive
  // como cargo adicional con nombre reservado (se saca de la lista de cargos).
  const desgravamenPct = Number(loan.desgravamen_monthly_pct) || 0;
  const seguroFijo = loan.additional_charges.find(
    (c) => c.name === SEGURO_FIJO_NAME && c.basis === "fixed",
  );
  const seguroTipo: "porcentaje" | "fijo" =
    desgravamenPct <= 0 && seguroFijo ? "fijo" : "porcentaje";
  const seguroValor =
    seguroTipo === "porcentaje"
      ? String(decimalStringToPercent(loan.desgravamen_monthly_pct))
      : String(Number(seguroFijo?.value ?? 0));
  const otherCharges = loan.additional_charges.filter(
    (c) => c.name !== SEGURO_FIJO_NAME,
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
    // Con desglose guardado se reconstruyen las filas; los préstamos
    // anteriores a la migración solo traen el total financiado.
    initial_costs:
      loan.initial_costs.length > 0
        ? loan.initial_costs.map(initialCostToForm)
        : legacyFinancedCostsToForm(loan.financed_costs),
    seguro_tipo: seguroTipo,
    seguro_valor: seguroValor,
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
    additional_charges: otherCharges.map((c) => ({
      name: c.name,
      kind: c.kind,
      basis: c.basis,
      value:
        c.basis === "fixed"
          ? String(Number(c.value))
          : String(decimalStringToPercent(c.value)),
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
        financed_costs: payload.financed_costs,
        initial_costs: payload.initial_costs,
        desgravamen_monthly_pct: payload.desgravamen_monthly_pct,
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
