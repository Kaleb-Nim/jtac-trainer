import { Session, type SessionData } from './session';
import { isValidBrowserMessage } from './types';
import { initLogDir } from './logger';

const port = Number(process.env.PORT) || 8080;

initLogDir();

const server = Bun.serve<SessionData>({
  port,

  // ── HTTP fetch handler (health check + WS upgrade) ──────────────────────
  fetch(req, server) {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('ok', {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain',
        },
      });
    }

    // WebSocket upgrade on /ws
    if (url.pathname === '/ws') {
      const sessionId = crypto.randomUUID();
      const upgraded = server.upgrade(req, {
        data: { sessionId, session: null },
      });
      if (upgraded) return undefined;
      return new Response('WebSocket upgrade failed', { status: 500 });
    }

    return new Response('Not Found', { status: 404 });
  },

  // ── WebSocket handler ────────────────────────────────────────────────────
  websocket: {
    open(ws) {
      const session = new Session(ws);
      ws.data.session = session;
      console.log(`[ws] session ${ws.data.sessionId} connected`);
    },

    message(ws, raw) {
      const session = ws.data.session;
      if (!session) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
      } catch {
        session.send({ type: 'error', message: 'Invalid JSON' });
        return;
      }

      if (!isValidBrowserMessage(parsed)) {
        session.send({ type: 'error', message: `Unknown message type: ${(parsed as { type?: string })?.type ?? 'unknown'}` });
        return;
      }

      switch (parsed.type) {
        case 'session.start':
          session.startPipeline();
          break;

        case 'audio.append':
          session.handleAudio(parsed.data);
          break;

        case 'audio.end':
          console.log(`[ws] session ${session.sessionId} audio.end received`);
          void session.handleAudioEnd();
          break;
      }
    },

    close(ws) {
      console.log(`[ws] session ${ws.data.sessionId} disconnected`);
      ws.data.session?.cleanup();
    },
  },
});

console.log(`[server] listening on port ${server.port}`);
