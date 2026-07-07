import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { qk } from "@/lib/query-keys";
import type { Client, ClientCreate, ClientUpdate } from "@/lib/api/types";

export function useClients() {
  return useQuery({
    queryKey: qk.clients,
    queryFn: () => api<Client[]>("clients"),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: qk.client(id ?? ""),
    queryFn: () => api<Client>(`clients/${id}`),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClientCreate) =>
      api<Client>("clients", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clients }),
  });
}

export function useUpdateClient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClientUpdate) =>
      api<Client>(`clients/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clients }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`clients/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clients }),
  });
}
