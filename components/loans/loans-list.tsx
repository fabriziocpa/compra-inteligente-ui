"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Eye, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDelete } from "@/components/confirm-delete";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data-states";
import { useDeleteLoan, useLoans } from "@/hooks/use-loans";
import { useClients } from "@/hooks/use-clients";
import { useVehicles } from "@/hooks/use-vehicles";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Loan } from "@/lib/api/types";

export function LoansList() {
  const loans = useLoans();
  const clients = useClients();
  const vehicles = useVehicles();
  const deleteLoan = useDeleteLoan();
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);

  const clientName = useMemo(() => {
    const m = new Map(clients.data?.map((c) => [c.id, c.full_name]));
    return (id: string) => m.get(id) ?? "—";
  }, [clients.data]);

  const vehicleName = useMemo(() => {
    const m = new Map(vehicles.data?.map((v) => [v.id, `${v.brand} ${v.model}`]));
    return (id: string) => m.get(id) ?? "—";
  }, [vehicles.data]);

  return (
    <>
      <PageHeader
        title="Simulaciones"
        description="Crea y consulta planes de pago bajo la modalidad Compra Inteligente (cuota balón)."
      >
        <Button render={<Link href="/simulaciones/nueva" />}>
          <Plus /> Nueva simulación
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          {loans.isLoading ? (
            <TableSkeleton cols={6} />
          ) : loans.isError ? (
            <ErrorState
              message={loans.error instanceof Error ? loans.error.message : undefined}
              onRetry={() => loans.refetch()}
            />
          ) : !loans.data || loans.data.length === 0 ? (
            <EmptyState
              icon={Calculator}
              title="Aún no hay simulaciones"
              description="Crea tu primera simulación seleccionando un cliente y un vehículo."
              action={
                <Button render={<Link href="/simulaciones/nueva" />}>
                  <Plus /> Nueva simulación
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Inicial</TableHead>
                  <TableHead className="text-right">Balón</TableHead>
                  <TableHead className="text-center">Plazo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-0 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.data.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{clientName(l.client_id)}</TableCell>
                    <TableCell>{vehicleName(l.vehicle_id)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(l.vehicle_price, l.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(l.initial_payment_pct, 2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPercent(l.balloon_pct, 2)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {l.term_periods}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.status === "draft" ? "secondary" : "default"}>
                        {l.status === "draft" ? "Borrador" : "Calculada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Ver"
                          render={<Link href={`/simulaciones/${l.id}`} />}
                        >
                          <Eye />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar"
                          onClick={() => setDeleteTarget(l)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar simulación?"
        description="Se eliminará la simulación y su plan de pagos. Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (deleteTarget) await deleteLoan.mutateAsync(deleteTarget.id);
        }}
      />
    </>
  );
}
