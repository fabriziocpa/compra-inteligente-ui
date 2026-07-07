import {
  backendUrl,
  clearAuthCookies,
  getAccessToken,
  jsonError,
  refreshTokens,
} from "@/lib/api/server";
import type { User } from "@/lib/api/types";

async function fetchMe(token: string): Promise<Response> {
  return fetch(backendUrl("auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function GET(): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    return jsonError(401, "authentication_error", "No autenticado.");
  }

  let res = await fetchMe(token);
  if (res.status === 401) {
    const refreshed = await refreshTokens();
    if (!refreshed) {
      await clearAuthCookies();
      return jsonError(401, "authentication_error", "Sesión expirada.");
    }
    res = await fetchMe(refreshed.access_token);
  }

  if (!res.ok) {
    return jsonError(res.status, "authentication_error", "No autenticado.");
  }
  const user = (await res.json()) as User;
  return Response.json({ user });
}
