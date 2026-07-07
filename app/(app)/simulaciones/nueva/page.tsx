"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoanBuilder } from "@/components/loans/loan-builder";
import { useCreateLoan } from "@/hooks/use-loans";
import { useClients } from "@/hooks/use-clients";
import { useVehicles } from "@/hooks/use-vehicles";
import { api } from "@/lib/api/client";
import { toLoanCreate, type LoanFormValues } from "@/lib/schemas";
import type { Loan } from "@/lib/api/types";

export default function NuevaSimulacionPage() {
  const router = useRouter();
  const create = useCreateLoan();
  const clients = useClients();
  const vehicles = useVehicles();

  const missingData =
    (clients.data && clients.data.length === 0) ||
    (vehicles.data && vehicles.data.length === 0);

  async function handleSubmit(values: LoanFormValues) {
    try {
      const loan = await create.mutateAsync(toLoanCreate(values));
      // Se genera el cronograma de inmediato para que los resultados ya estén
      // listos en la página siguiente.
      try {
        await api<Loan>(`loans/${loan.id}/schedule`, { method: "POST" });
      } catch {
        // No es fatal: la página de resultados permite (re)calcular.
      }
      toast.success("Simulación creada");
      router.push(`/simulaciones/${loan.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la simulación.");
    }
  }

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-semibold tracking-tight">Nueva simulación</h1>
          <p className="text-muted-foreground text-sm">
            Configura los parámetros del crédito. El plan de pagos se calcula en el
            servidor.
          </p>
        </div>
      </div>

      {missingData && (
        <Alert>
          <AlertTitle>Faltan datos para simular</AlertTitle>
          <AlertDescription>
            Necesitas al menos un{" "}
            <Link href="/clientes" className="font-medium underline">
              cliente
            </Link>{" "}
            y un{" "}
            <Link href="/vehiculos" className="font-medium underline">
              vehículo
            </Link>{" "}
            registrados antes de crear una simulación.
          </AlertDescription>
        </Alert>
      )}

      <LoanBuilder onSubmit={handleSubmit} submitLabel="Crear y calcular" />
    </div>
  );
}
