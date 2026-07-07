// Wrapper de fetch para el navegador. Habla SOLO con el BFF del mismo origen
// (/api/*), nunca directo con el backend. Los tokens viven en cookies HttpOnly
// que el navegador adjunta solo, así que aquí no hay nada que administrar.
import type { ApiErrorBody } from "@/lib/api/types";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("/api") ? path : `/api/${path.replace(/^\/+/, "")}`;
  const hasBody = init?.body !== undefined;

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const body = (typeof data === "object" ? data : {}) as Partial<ApiErrorBody>;
    throw new ApiError(
      res.status,
      body.error ?? "error",
      body.message ?? "Ocurrió un error inesperado.",
    );
  }

  return data as T;
}
