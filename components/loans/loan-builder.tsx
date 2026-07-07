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
import { RateSegmentsEditor, emptySegment } from "@/components/loans/rate-segments-editor";
import { ChargesEditor } from "@/components/loans/charges-editor";
import { useClients } from "@/hooks/use-clients";
import { useVehicles } from "@/hooks/use-vehicles";
import { loanSchema, type LoanFormValues } from "@/lib/schemas";
import { CURRENCIES } from "@/lib/loan-domain";
import type { GraceCode } from "@/lib/api/types";

// El formulario inicia vacío: el usuario ingresa sus propios parámetros
// (los placeholders solo muestran ejemplos).
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
                  <FormLabel help="Cliente al que pertenece la simulación.">
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
                  <FormLabel help="Vehículo a financiar. Define la moneda y el precio base.">
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
                  <FormLabel help="Moneda en la que se calcula el crédito.">
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
                  <FormLabel help="Precio del vehículo a financiar. Se autocompleta al elegir el vehículo.">
                    Precio del vehículo
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="85000.00" {...field} />
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
                  <FormLabel help="Porcentaje del precio que paga el cliente como cuota inicial (ej. 20 = 20%).">
                    Cuota inicial (%)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="balloon_pct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Porcentaje del precio diferido a la última cuota (cuota balón).">
                    Cuota balón (%)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="term_periods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Número de cuotas del crédito (ej. 36).">
                    Plazo (períodos)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="36" {...field} />
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
                  <FormLabel help="Días entre cuotas: 30 = mensual, 15 = quincenal.">
                    Frecuencia (días)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="30" {...field} />
                  </FormControl>
                  <FormMessage />
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
