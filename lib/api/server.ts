// Núcleo del BFF — corre SOLO en el servidor de Next.js (route handlers).
// Guarda los tokens en cookies HttpOnly y reenvía las peticiones del navegador
// al backend real, refrescando el access token ante un 401 y reintentando una
// vez. next/headers hace que este módulo sea server-only por construcción.
import { cookies } from "next/headers";
import type { TokenPair } from "@/lib/api/types";

const API_BASE_URL =
  process.env.API_BASE_URL ?? "http://localhost:8000/api/v1";

export const ACCESS_COOKIE = "ci_at";
export const REFRESH_COOKIE = "ci_rt";

const ACCESS_MAX_AGE = 60 * 30; // 30 min (igual que el default del API)
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setAuthCookies(tokens: TokenPair): Promise<void> {
  const c = await cookies();
  c.set(ACCESS_COOKIE, tokens.access_token, cookieOpts(ACCESS_MAX_AGE));
  c.set(REFRESH_COOKIE, tokens.refresh_token, cookieOpts(REFRESH_MAX_AGE));
}

export async function clearAuthCookies(): Promise<void> {
  const c = await cookies();
  c.set(ACCESS_COOKIE, "", cookieOpts(0));
  c.set(REFRESH_COOKIE, "", cookieOpts(0));
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export function backendUrl(path: string, search = ""): string {
  const clean = path.replace(/^\/+/, "");
  return `${API_BASE_URL}/${clean}${search}`;
}

export function jsonError(
  status: number,
  error: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Reenvía una respuesta del backend al navegador conservando status y body. */
async function passthrough(res: Response): Promise<Response> {
  if (res.status === 204) return new Response(null, { status: 204 });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

/** Canjea la cookie de refresh por un par de tokens nuevo y lo persiste. */
export async function refreshTokens(): Promise<TokenPair | null> {
  const rt = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!rt) return null;
  const res = await fetch(backendUrl("auth/refresh"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const tokens = (await res.json()) as TokenPair;
  await setAuthCookies(tokens);
  return tokens;
}

/**
 * Proxy con manejo de tokens usado por la ruta BFF catch-all. Inyecta el
 * access token y, ante un 401, refresca una vez y reintenta la petición.
 */
export async function proxyToBackend(
  request: Request,
  path: string,
): Promise<Response> {
  const search = new URL(request.url).search;
  const method = request.method;
  const hasBody = method !== "GET" && method !== "HEAD";
  const bodyText = hasBody ? await request.text() : undefined;

  const access = await getAccessToken();

  const doFetch = (token?: string) =>
    fetch(backendUrl(path, search), {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(hasBody ? { "content-type": "application/json" } : {}),
      },
      body: bodyText,
      cache: "no-store",
    });

  let res = await doFetch(access);

  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (!refreshed) {
      await clearAuthCookies();
      return jsonError(401, "authentication_error", "Sesión expirada. Inicia sesión nuevamente.");
    }
    res = await doFetch(refreshed.access_token);
  }

  return passthrough(res);
}
