"use client";

import Link from "next/link";
import { ArrowRight, Calculator, Car, Plus, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/data-states";
import { useClients } from "@/hooks/use-clients";
import { useVehicles } from "@/hooks/use-vehicles";
import { useLoans } from "@/hooks/use-loans";
import { useMe } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/format";

export function DashboardView() {
  const me = useMe();
  const clients = useClients();
  const vehicles = useVehicles();
  const loans = useLoans();

  const activeLoans = loans.data?.filter((l) => l.status !== "draft").length ?? 0;
  const recent = [...(loans.data ?? [])]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5);

  const clientName = (id: string) =>
    clients.data?.find((c) => c.id === id)?.full_name ?? "—";
  const vehicleName = (id: string) => {
    const v = vehicles.data?.find((x) => x.id === id);
    return v ? `${v.brand} ${v.model}` : "—";
  };

  return (
    <>
      <PageHeader
        title={`Hola${me.data ? `, ${me.data.full_name.split(" ")[0]}` : ""} 👋`}
        description="Resumen de tu cartera y acceso rápido a nuevas simulaciones."
      >
        <Button render={<Link href="/simulaciones/nueva" />}>
          <Plus /> Nueva simulación
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          href="/clientes"
          icon={Users}
          label="Clientes"
          value={clients.data?.length}
          loading={clients.isLoading}
        />
        <StatCard
          href="/vehiculos"
          icon={Car}
          label="Vehículos"
          value={vehicles.data?.length}
          loading={vehicles.isLoading}
        />
        <StatCard
          href="/simulaciones"
          icon={Calculator}
          label="Simulaciones"
          value={loans.data?.length}
          loading={loans.isLoading}
        />
        <StatCard
          href="/simulaciones"
          icon={Calculator}
          label="Calculadas"
          value={activeLoans}
          loading={loans.isLoading}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Simulaciones recientes</CardTitle>
            <CardDescription>Tus últimas simulaciones creadas.</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/simulaciones" />}
          >
            Ver todas <ArrowRight />
          </Button>
        </CardHeader>
        <CardContent>
          {loans.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : loans.isError ? (
            <ErrorState
              message="No se pudieron cargar las simulaciones."
              onRetry={() => loans.refetch()}
            />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={Calculator}
              title="Sin simulaciones todavía"
              description="Crea tu primera simulación para verla aquí."
              action={
                <Button render={<Link href="/simulaciones/nueva" />}>
                  <Plus /> Nueva simulación
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {recent.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/simulaciones/${l.id}`}
                    className="hover:bg-muted/50 -mx-2 flex items-center justify-between rounded-md px-2 py-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{clientName(l.client_id)}</p>
                      <p className="text-muted-foreground truncate text-sm">
                        {vehicleName(l.vehicle_id)} · {l.term_periods} cuotas
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden tabular-nums sm:inline">
                        {formatMoney(l.vehicle_price, l.currency)}
                      </span>
                      <Badge variant={l.status === "draft" ? "secondary" : "default"}>
                        {l.status === "draft" ? "Borrador" : "Calculada"}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  loading,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  loading?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex items-center gap-4 py-1">
          <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-lg">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-muted-foreground text-sm">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums">{value ?? 0}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
