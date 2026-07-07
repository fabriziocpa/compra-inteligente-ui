import { clearAuthCookies, jsonError, refreshTokens } from "@/lib/api/server";

export async function POST(): Promise<Response> {
  const tokens = await refreshTokens();
  if (!tokens) {
    await clearAuthCookies();
    return jsonError(401, "authentication_error", "No se pudo renovar la sesión.");
  }
  return Response.json({ ok: true });
}
