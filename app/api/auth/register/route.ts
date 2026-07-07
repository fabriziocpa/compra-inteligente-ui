import { backendUrl, setAuthCookies } from "@/lib/api/server";
import type { TokenPair, User } from "@/lib/api/types";

export async function POST(request: Request): Promise<Response> {
  const { email, password, full_name } = await request.json();

  const res = await fetch(backendUrl("auth/register"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, full_name }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  }

  const user = (await res.json()) as User;

  // Login automático para que el usuario nuevo entre ya autenticado.
  const loginRes = await fetch(backendUrl("auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (loginRes.ok) {
    const tokens = (await loginRes.json()) as TokenPair;
    await setAuthCookies(tokens);
  }

  return Response.json({ user }, { status: 201 });
}
