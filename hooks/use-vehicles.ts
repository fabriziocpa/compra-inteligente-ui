import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { qk } from "@/lib/query-keys";
import type { Vehicle, VehicleCreate, VehicleUpdate } from "@/lib/api/types";

export function useVehicles() {
  return useQuery({
    queryKey: qk.vehicles,
    queryFn: () => api<Vehicle[]>("vehicles"),
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: qk.vehicle(id ?? ""),
    queryFn: () => api<Vehicle>(`vehicles/${id}`),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VehicleCreate) =>
      api<Vehicle>("vehicles", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.vehicles }),
  });
}

export function useUpdateVehicle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VehicleUpdate) =>
      api<Vehicle>(`vehicles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.vehicles }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`vehicles/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.vehicles }),
  });
}
