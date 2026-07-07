import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { qk } from "@/lib/query-keys";
import type { User } from "@/lib/api/types";

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => api<{ user: User }>("auth/me").then((r) => r.user),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      api<{ user: User }>("auth/login", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: (data) => qc.setQueryData(qk.me, data.user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { email: string; password: string; full_name: string }) =>
      api<{ user: User }>("auth/register", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: (data) => qc.setQueryData(qk.me, data.user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("auth/logout", { method: "POST" }),
    onSuccess: () => qc.clear(),
  });
}
