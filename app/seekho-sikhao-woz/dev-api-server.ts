/**
 * Local dev server that serves the Vercel serverless functions (api/tutor.ts +
 * api/tts.ts) over plain HTTP so the Expo app (iOS simulator) can reach them at
 * http://localhost:3111 without deploying to Vercel. Loads env from .env.local.
 *
 * Run:  npx tsx dev-api-server.ts
 */
import fs from 'node:fs';
import http from 'node:http';

// ── Load .env.local into process.env (no dep) ──────────────────────────
try {
  const raw = fs.readFileSync(new URL('./.env.local', import.meta.url), 'utf8');
  for (const line of raw.split('\n')) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch { /* no .env.local */ }

const { default: tutorHandler } = await import('./api/tutor.ts');
const { default: ttsHandler } = await import('./api/tts.ts');
const { default: sttHandler } = await import('./api/stt.ts');

const PORT = 3111;

http
  .createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const u = new URL(req.url || '/', `http://localhost:${PORT}`);
    const query: Record<string, string> = {};
    u.searchParams.forEach((v, k) => { query[k] = v; });

    let bodyStr = '';
    for await (const chunk of req) bodyStr += chunk;
    let body: unknown = {};
    if (bodyStr) { try { body = JSON.parse(bodyStr); } catch { body = bodyStr; } }

    const vreq = { method: req.method, url: req.url, headers: req.headers, query, body } as never;
    const vres = {
      statusCode: 200,
      status(c: number) { (this as { statusCode: number }).statusCode = c; return this; },
      setHeader(k: string, v: string) { res.setHeader(k, v); return this; },
      json(o: unknown) { res.writeHead((this as { statusCode: number }).statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); },
      send(d: unknown) { res.writeHead((this as { statusCode: number }).statusCode); res.end(Buffer.isBuffer(d) ? d : typeof d === 'string' ? d : JSON.stringify(d)); },
      end(d?: unknown) { res.writeHead((this as { statusCode: number }).statusCode); res.end(d as never); },
    } as never;

    const started = Date.now();
    try {
      if (u.pathname === '/api/tutor') await tutorHandler(vreq, vres);
      else if (u.pathname === '/api/tts') await ttsHandler(vreq, vres);
      else if (u.pathname === '/api/stt') await sttHandler(vreq, vres);
      else { res.writeHead(404); res.end('not found'); }
    } catch (e) {
      console.error('[dev-api] handler error', e);
      if (!res.headersSent) { res.writeHead(500); res.end(String(e)); }
    }
    console.log(`[dev-api] ${req.method} ${u.pathname} -> ${res.statusCode} (${Date.now() - started}ms)`);
  })
  .listen(PORT, () => console.log(`[dev-api] listening on http://localhost:${PORT}  (tutor + tts)`));
