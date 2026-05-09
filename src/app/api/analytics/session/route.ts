export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { sessionId?: unknown } | null;
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : crypto.randomUUID();

  return Response.json({ ok: true, sessionId });
}
