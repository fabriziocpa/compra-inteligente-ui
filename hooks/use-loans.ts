import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { qk } from "@/lib/query-keys";
import type {
  Indicators,
  Loan,
  LoanCreate,
  LoanUpdate,
  Schedule,
} from "@/lib/api/types";

export function useLoans() {
  return useQuery({
    queryKey: qk.loans,
    queryFn: () => api<Loan[]>("loans"),
  });
}

export function useLoan(id: string | undefined) {
  return useQuery({
    queryKey: qk.loan(id ?? ""),
    queryFn: () => api<Loan>(`loans/${id}`),
    enabled: !!id,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoanCreate) =>
      api<Loan>("loans", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.loans }),
  });
}

export function useUpdateLoan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoanUpdate) =>
      api<Loan>(`loans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.loans });
      qc.invalidateQueries({ queryKey: qk.loan(id) });
    },
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`loans/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.loans }),
  });
}

export function useSchedule(id: string | undefined) {
  return useQuery({
    queryKey: qk.schedule(id ?? ""),
    queryFn: () => api<Schedule>(`loans/${id}/schedule`),
    enabled: !!id,
  });
}

/** Calcula y persiste el cronograma (POST). La fuente de verdad es el servidor. */
export function useGenerateSchedule(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<Schedule>(`loans/${id}/schedule`, { method: "POST" }),
    onSuccess: (data) => {
      qc.setQueryData(qk.schedule(id), data);
      qc.invalidateQueries({ queryKey: qk.loan(id) });
      qc.invalidateQueries({ queryKey: ["loans", id, "indicators"] });
    },
  });
}

export function useIndicators(
  id: string | undefined,
  discountRateAnnual?: string,
) {
  return useQuery({
    queryKey: qk.indicators(id ?? "", discountRateAnnual),
    queryFn: () => {
      // El COK viaja ANUAL; el servidor lo convierte a la tasa del período.
      const q = discountRateAnnual
        ? `?discount_rate_annual=${encodeURIComponent(discountRateAnnual)}`
        : "";
      return api<Indicators>(`loans/${id}/indicators${q}`);
    },
    enabled: !!id,
    retry: false,
  });
}
