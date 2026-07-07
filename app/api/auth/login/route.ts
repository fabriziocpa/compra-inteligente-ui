import { backendUrl, setAuthCookies } from "@/lib/api/server";
import type { TokenPair, User } from "@/lib/api/types";

export async function POST(request: Request): Promise<Response> {
  const { email, password } = await request.json();

  const res = await fetch(backendUrl("auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  }

  const tokens = (await res.json()) as TokenPair;
  await setAuthCookies(tokens);

  const meRes = await fetch(backendUrl("auth/me"), {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  const user = meRes.ok ? ((await meRes.json()) as User) : null;

  return Response.json({ user });
}
