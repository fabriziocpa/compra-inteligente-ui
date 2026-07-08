"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Car, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useCreateVehicle,
  useDeleteVehicle,
  useUpdateVehicle,
  useVehicles,
} from "@/hooks/use-vehicles";
import {
  vehicleSchema,
  toVehicleCreate,
  type VehicleFormValues,
} from "@/lib/schemas";
import { CURRENCIES } from "@/lib/loan-domain";
import { formatMoney } from "@/lib/format";
import type { Vehicle } from "@/lib/api/types";

export function VehiclesView() {
  const { data, isLoading, isError, error, refetch } = useVehicles();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const deleteVehicle = useDeleteVehicle();

  return (
    <>
      <PageHeader
        title="Vehículos"
        description="Catálogo de vehículos disponibles para simular financiamiento."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Nuevo vehículo
        </Button>
      </PageHeader>

      <Card>
        <CardContent>
          {isLoading ? (
            <TableSkeleton cols={5} />
          ) : isError ? (
            <ErrorState
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={Car}
              title="Aún no hay vehículos"
              description="Registra un vehículo con su precio de lista para incluirlo en una simulación."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus /> Nuevo vehículo
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Precio de lista</TableHead>
                  <TableHead className="w-0 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.brand}</TableCell>
                    <TableCell>{v.model}</TableCell>
                    <TableCell>{v.year}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{v.currency}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(v.list_price, v.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Editar"
                          onClick={() => setEditTarget(v)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Eliminar"
                          onClick={() => setDeleteTarget(v)}
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

      <CreateVehicleDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditVehicleDialog
        vehicle={editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      />
      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar vehículo?"
        description={`Se eliminará ${deleteTarget?.brand} ${deleteTarget?.model}. Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          if (deleteTarget) await deleteVehicle.mutateAsync(deleteTarget.id);
        }}
      />
    </>
  );
}

function CreateVehicleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const create = useCreateVehicle();
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      brand: "",
      model: "",
      year: String(new Date().getFullYear()),
      list_price: "",
      currency: "PEN",
    },
  });

  async function onSubmit(values: VehicleFormValues) {
    try {
      await create.mutateAsync(toVehicleCreate(values));
      toast.success("Vehículo registrado");
      form.reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo vehículo</DialogTitle>
          <DialogDescription>
            Registra los datos del vehículo. Podrás editarlos más adelante.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="create-vehicle" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel help="Marca del vehículo.">Marca</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel help="Modelo del vehículo.">Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel help="Entre 1900 y 2100.">Año</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
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
                    <FormLabel help="Moneda del precio de lista.">Moneda</FormLabel>
                    <FormControl>
                      <Select
                        items={CURRENCIES}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Moneda" />
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
            </div>
            <FormField
              control={form.control}
              name="list_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Mayor que 0.">
                    Precio de lista
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="create-vehicle" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditVehicleDialog({
  vehicle,
  onOpenChange,
}: {
  vehicle: Vehicle | null;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={!!vehicle} onOpenChange={onOpenChange}>
      <DialogContent>
        {vehicle && <EditVehicleForm vehicle={vehicle} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditVehicleForm({ vehicle, onDone }: { vehicle: Vehicle; onDone: () => void }) {
  const update = useUpdateVehicle(vehicle.id);
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      list_price: vehicle.list_price,
      currency: vehicle.currency,
    },
  });

  async function onSubmit(values: VehicleFormValues) {
    try {
      await update.mutateAsync(toVehicleCreate(values));
      toast.success("Vehículo actualizado");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar vehículo</DialogTitle>
        <DialogDescription>
          Corrige los datos registrados y vuelve a guardarlos.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form id="edit-vehicle" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Marca del vehículo.">Marca</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Modelo del vehículo.">Modelo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Entre 1900 y 2100.">Año</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel help="Moneda del precio de lista.">Moneda</FormLabel>
                  <FormControl>
                    <Select
                      items={CURRENCIES}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Moneda" />
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
          </div>
          <FormField
            control={form.control}
            name="list_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel help="Mayor que 0.">
                  Precio de lista
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" form="edit-vehicle" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Guardar
        </Button>
      </DialogFooter>
    </>
  );
}
