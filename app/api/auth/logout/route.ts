import { clearAuthCookies } from "@/lib/api/server";

export async function POST(): Promise<Response> {
  await clearAuthCookies();
  return new Response(null, { status: 204 });
}
