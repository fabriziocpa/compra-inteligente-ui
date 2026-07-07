// Claves de TanStack Query centralizadas para invalidar la caché.
export const qk = {
  me: ["me"] as const,
  clients: ["clients"] as const,
  client: (id: string) => ["clients", id] as const,
  vehicles: ["vehicles"] as const,
  vehicle: (id: string) => ["vehicles", id] as const,
  loans: ["loans"] as const,
  loan: (id: string) => ["loans", id] as const,
  schedule: (id: string) => ["loans", id, "schedule"] as const,
  indicators: (id: string, rate?: string) =>
    ["loans", id, "indicators", rate ?? null] as const,
};
