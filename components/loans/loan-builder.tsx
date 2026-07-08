"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraceEditor } from "@/components/loans/grace-editor";
import { PercentInput } from "@/components/loans/decimal-input";
import { RateSegmentsEditor, emptySegment } from "@/components/loans/rate-segments-editor";
import { ChargesEditor } from "@/components/loans/charges-editor";
import { InitialCostsEditor } from "@/components/loans/initial-costs-editor";
import { useClients } from "@/hooks/use-clients";
import { useVehicles } from "@/hooks/use-vehicles";
import { loanSchema, type LoanFormValues } from "@/lib/schemas";
import { CURRENCIES, FREQUENCIES, SEGURO_TIPOS } from "@/lib/loan-domain";
import { formatMoney } from "@/lib/format";
import type { GraceCode } from "@/lib/api/types";

// El formulario inicia vacío: el usuario ingresa sus propios parámetros
// (sin placeholders de ejemplo, a pedido del usuario).
function baseDefaults(): LoanFormValues {
  return {
    client_id: "",
    vehicle_id: "",
    currency: "PEN",
    vehicle_price: "",
    initial_payment_pct: "",
    balloon_pct: "",
    term_periods: "",
    frequency_days: "",
    initial_costs: [],
    seguro_tipo: "porcentaje",
    seguro_valor: "",
    rate_segments: [{ ...emptySegment(1, 1), to_period: "" }],
    grace_periods: [],
    additional_charges: [],
  };
}

export function LoanBuilder({
  defaultValues,
  onSubmit,
  submitLabel = "Crear y calcular",
  lockClientVehicle = false,
}: {
  defaultValues?: Partial<LoanFormValues>;
  onSubmit: (values: LoanFormValues) => Promise<void>;
  submitLabel?: string;
  lockClientVehicle?: boolean;
}) {
  const clients = useClients();
  const vehicles = useVehicles();

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: { ...baseDefaults(), ...defaultValues },
    mode: "onBlur",
  });

  // La moneda y el precio SIEMPRE se heredan del vehículo elegido (además
  // del onValueChange del Select, este efecto cubre cualquier vía por la que
  // cambie vehicle_id). En edición el vehículo está bloqueado: no se pisa.
  const vehicleId = form.watch("vehicle_id");
  useEffect(() => {
    if (lockClientVehicle || !vehicleId) return;
    const veh = vehicles.data?.find((x) => x.id === vehicleId);
    if (!veh) return;
    if (form.getValues("currency") !== veh.currency) {
      form.setValue("currency", veh.currency, { shouldDirty: true });
    }
    if (form.getValues("vehicle_price") !== veh.list_price) {
      form.setValue("vehicle_price", veh.list_price, { shouldDirty: true });
    }
  }, [vehicleId, vehicles.data, lockClientVehicle, form]);

  // Mantiene la gracia y el tramo único de tasa sincronizados con el plazo.
  const term = form.watch("term_periods");
  useEffect(() => {
    const n = Number(term);
    if (!Number.isInteger(n) || n <= 0 || n > 600) return;
    const cur = form.getValues("grace_periods");
    if (cur.length !== n) {
      const next = Array.from({ length: n }, (_, i) => cur[i] ?? ("S" as GraceCode));
      form.setValue("grace_periods", next, { shouldValidate: false });
    }
    // Si hay un solo tramo de tasa, se estira hasta cubrir todo el plazo.
    const segs = form.getValues("rate_segments");
    if (segs.length === 1 && segs[0].to_period !== String(n)) {
      form.setValue(
        "rate_segments",
        [{ ...segs[0], from_period: "1", to_period: String(n) }],
        { shouldValidate: false },
      );
    }
  }, [term, form]);

  const termNum = Number(term) || 0;
  const seguroTipo = form.watch("seguro_tipo");

  // Equivalencias en dinero de los % (solo presentación: el % sigue siendo
  // la fuente de verdad y lo único que viaja al API).
  const currency = form.watch("currency");
  const price = Number(form.watch("vehicle_price")) || 0;
  const ciPct = Number(form.watch("initial_payment_pct"));
  const cfPct = Number(form.watch("balloon_pct"));
  const equivalence = (pct: number) =>
    price > 0 && Number.isFinite(pct) && pct > 0 && pct < 100
      ? `Equivale a ${formatMoney((price * pct) / 100, currency)}.`
      : null;

  // `items` permite que el trigger del Select muestre la etiqueta legible
  // en lugar del valor crudo (el UUID del cliente/vehículo).
  const clientItems = (clients.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.full_name} · ${c.document_id}`,
  }));
  const vehicleItems = (vehicles.data ?? []).map((v) => ({
    value: v.id,
    label: `${v.brand} ${v.model} (${v.year})`,
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Datos generales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
            <CardDescription>Cliente, vehículo y moneda del crédito.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Cliente
                  </FormLabel>
                  <FormControl>
                    <Select
                      items={clientItems}
                      value={field.value || null}
                      onValueChange={(v) => field.onChange(v ?? "")}
                      disabled={lockClientVehicle}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.data?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.full_name} · {c.document_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Vehículo a financiar; define moneda y precio.">
                    Vehículo
                  </FormLabel>
                  <FormControl>
                    <Select
                      items={vehicleItems}
                      value={field.value || null}
                      disabled={lockClientVehicle}
                      onValueChange={(v) => {
                        field.onChange(v ?? "");
                        const veh = vehicles.data?.find((x) => x.id === v);
                        if (veh) {
                          form.setValue("currency", veh.currency);
                          form.setValue("vehicle_price", veh.list_price);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un vehículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.data?.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.brand} {v.model} ({v.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Moneda
                  </FormLabel>
                  <FormControl>
                    <Select
                      items={CURRENCIES}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicle_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Se autocompleta al elegir el vehículo.">
                    Precio del vehículo
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Parámetros financieros */}
        <Card>
          <CardHeader>
            <CardTitle>Parámetros financieros</CardTitle>
            <CardDescription>
              Cuota inicial, cuota balón, plazo y frecuencia de pago.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField
              control={form.control}
              name="initial_payment_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="% del precio pagado al inicio. Mayor que 0.">
                    Cuota inicial (%)
                  </FormLabel>
                  <FormControl>
                    <PercentInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  {equivalence(ciPct) && (
                    <p className="text-muted-foreground text-xs">{equivalence(ciPct)}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="balloon_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="% del precio diferido a la cuota final (N+1). Mayor que 0.">
                    Cuota final / balón (%)
                  </FormLabel>
                  <FormControl>
                    <PercentInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  {(equivalence(cfPct) || termNum > 0) && (
                    <p className="text-muted-foreground text-xs">
                      {equivalence(cfPct)}
                      {termNum > 0 && ` Se paga en el período ${termNum + 1}.`}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="term_periods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Plazo (períodos)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Frecuencia de pago
                  </FormLabel>
                  <FormControl>
                    <Select
                      items={FREQUENCIES}
                      value={field.value || null}
                      onValueChange={(v) => field.onChange(v ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona la frecuencia" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seguro_tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Obligatorio. En % va dentro de la cuota; el fijo se cobra aparte.">
                    Seguro de desgravamen
                  </FormLabel>
                  <FormControl>
                    <Select
                      items={SEGURO_TIPOS}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? "porcentaje")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEGURO_TIPOS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seguro_valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel
                    help={
                      seguroTipo === "porcentaje"
                        ? "% mensual sobre el saldo."
                        : "Monto fijo por mes."
                    }
                  >
                    {seguroTipo === "porcentaje"
                      ? "Seguro (% mensual)"
                      : "Seguro (monto por mes)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={seguroTipo === "porcentaje" ? "0.001" : "0.01"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Costos iniciales (una sola vez) */}
        <Card>
          <CardHeader>
            <CardTitle>Costos / gastos iniciales</CardTitle>
            <CardDescription>
              Notariales, registrales, tasación y comisiones que se pagan una
              sola vez: financiados o al contado (opcional).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="initial_costs"
              render={({ field, fieldState }) => (
                <FormItem>
                  <InitialCostsEditor value={field.value} onChange={field.onChange} />
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      Revisa los costos iniciales.
                    </p>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Tramos de tasa */}
        <Card>
          <CardHeader>
            <CardTitle>Tramos de tasa</CardTitle>
            <CardDescription>
              Define una o más tasas por rangos de períodos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="rate_segments"
              render={({ field, fieldState }) => (
                <FormItem>
                  <RateSegmentsEditor
                    termPeriods={termNum}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message ??
                        "Revisa los tramos de tasa."}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Períodos de gracia */}
        <Card>
          <CardHeader>
            <CardTitle>Períodos de gracia</CardTitle>
            <CardDescription>
              Asigna gracia Normal, Parcial o Total a cada período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="grace_periods"
              render={({ field, fieldState }) => (
                <FormItem>
                  <GraceEditor
                    termPeriods={termNum}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  {fieldState.error && (
                    <p className="text-destructive text-sm">
                      {fieldState.error.message}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Cargos adicionales */}
        <Card>
          <CardHeader>
            <CardTitle>Cargos adicionales</CardTitle>
            <CardDescription>Seguros, comisiones y portes (opcional).</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="additional_charges"
              render={({ field }) => (
                <ChargesEditor value={field.value} onChange={field.onChange} />
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
