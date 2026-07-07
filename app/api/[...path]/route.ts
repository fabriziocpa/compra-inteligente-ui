// Proxy BFF catch-all. Toda petición del navegador a /api/* (salvo auth) se
// reenvía al backend inyectando el access token desde la cookie HttpOnly.
// Ej.: GET /api/clients -> GET {API_BASE_URL}/clients
import { proxyToBackend } from "@/lib/api/server";

async function handle(
  request: Request,
  ctx: RouteContext<"/api/[...path]">,
): Promise<Response> {
  const { path } = await ctx.params;
  return proxyToBackend(request, path.join("/"));
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
