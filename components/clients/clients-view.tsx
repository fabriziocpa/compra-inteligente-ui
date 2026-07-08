"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  useClients,
  useCreateClient,
  useDeleteClient,
  useUpdateClient,
} from "@/hooks/use-clients";
import {
  clientSchema,
  clientUpdateSchema,
  toClientCreate,
  type ClientFormValues,
  type ClientUpdateFormValues,
} from "@/lib/schemas";
import { formatDate } from "@/lib/format";
import type { Client } from "@/lib/api/types";

export function ClientsView() {
  const { data, isLoading, isError, error, refetch } = useClients();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const deleteClient = useDeleteClient();

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Administra los clientes a quienes les simularás un crédito vehicular."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus /> Nuevo cliente
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
              icon={Users}
              title="Aún no hay clientes"
              description="Registra tu primer cliente para empezar a crear simulaciones."
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus /> Nuevo cliente
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Registrado</TableHead>
                  <TableHead className="w-0 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.document_id}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Editar"
                          onClick={() => setEditTarget(c)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Eliminar"
                          onClick={() => setDeleteTarget(c)}
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

      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditClientDialog
        client={editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      />
      <ConfirmDelete
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar cliente?"
        description={`Se eliminará a ${deleteTarget?.full_name}. Esta acción no se puede deshacer.`}
        onConfirm={async () => {
          if (deleteTarget) await deleteClient.mutateAsync(deleteTarget.id);
        }}
      />
    </>
  );
}

function CreateClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const create = useCreateClient();
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { full_name: "", document_id: "", email: "", phone: "" },
  });

  async function onSubmit(values: ClientFormValues) {
    try {
      await create.mutateAsync(toClientCreate(values));
      toast.success("Cliente registrado");
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
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Registra los datos del cliente. Podrás editarlos más adelante.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="create-client" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nombre completo
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="document_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="DNI u otro documento de identidad.">
                    Documento de identidad
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Correo de contacto del cliente.">Correo</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel help="Opcional.">
                    Teléfono
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
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
          <Button type="submit" form="create-client" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({
  client,
  onOpenChange,
}: {
  client: Client | null;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={!!client} onOpenChange={onOpenChange}>
      <DialogContent>
        {client && <EditClientForm client={client} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function EditClientForm({ client, onDone }: { client: Client; onDone: () => void }) {
  const update = useUpdateClient(client.id);
  const form = useForm<ClientUpdateFormValues>({
    resolver: zodResolver(clientUpdateSchema),
    defaultValues: {
      full_name: client.full_name,
      document_id: client.document_id,
      email: client.email,
      phone: client.phone ?? "",
    },
  });

  async function onSubmit(values: ClientUpdateFormValues) {
    try {
      await update.mutateAsync({
        full_name: values.full_name,
        document_id: values.document_id,
        email: values.email,
        phone: values.phone || undefined,
      });
      toast.success("Cliente actualizado");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar cliente</DialogTitle>
        <DialogDescription>
          Corrige los datos registrados y vuelve a guardarlos.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form id="edit-client" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Nombre completo
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="document_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel help="DNI u otro documento de identidad.">
                  Documento de identidad
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel help="Nuevo correo de contacto.">Correo</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel help="Opcional.">Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} />
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
        <Button type="submit" form="edit-client" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Guardar cambios
        </Button>
      </DialogFooter>
    </>
  );
}
