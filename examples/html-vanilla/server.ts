import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createVerifierHandlers,
  OpenEudiEngine,
  MemoryKVStore,
  type RequestContext,
  type HandlerResponse,
} from '@eudi-verify/server';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}/api/eudi`;

const engine = new OpenEudiEngine({ mode: 'demo', baseUrl: BASE_URL });
const store = new MemoryKVStore();
const handlers = createVerifierHandlers({
  engine,
  store,
  baseUrl: BASE_URL,
  mode: 'demo',
  tokenSecret: process.env.TOKEN_SECRET || 'demo-secret-change-in-production',
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
});

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

async function serveStatic(res: ServerResponse, filePath: string): Promise<boolean> {
  try {
    const fullPath = join(__dirname, 'public', filePath);
    const content = await readFile(fullPath);
    const ext = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

async function serveEmbedBundle(res: ServerResponse): Promise<void> {
  try {
    const bundlePath = join(__dirname, '../../packages/embed/dist/eudi-verify.iife.js');
    const content = await readFile(bundlePath);
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Widget bundle not found. Run `pnpm build` in packages/embed first.');
  }
}

async function parseBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

function buildContext(req: IncomingMessage, params: Record<string, string>, body?: unknown, rawBody?: string): RequestContext {
  return {
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1',
    origin: req.headers.origin,
    params,
    body,
    rawBody,
  };
}

async function sendResponse(res: ServerResponse, result: HandlerResponse): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...result.headers };
  res.writeHead(result.status, headers);
  res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  // Serve embed widget bundle
  if (path === '/eudi-verify.js') {
    return serveEmbedBundle(res);
  }

  // API routes
  if (path.startsWith('/api/eudi')) {
    const apiPath = path.replace('/api/eudi', '');

    if (req.method === 'POST' && apiPath === '/sessions') {
      const raw = await parseBody(req);
      const body = JSON.parse(raw);
      return sendResponse(res, await handlers.createSession(buildContext(req, {}, body, raw)));
    }

    const sessionMatch = apiPath.match(/^\/sessions\/([^/]+)$/);
    if (sessionMatch) {
      const [, sessionId] = sessionMatch;
      if (req.method === 'GET') {
        return sendResponse(res, await handlers.getSession(buildContext(req, { sessionId })));
      }
      if (req.method === 'POST') {
        return sendResponse(res, await handlers.cancelSession(buildContext(req, { sessionId })));
      }
    }

    if (req.method === 'POST' && apiPath === '/tokens/verify') {
      const raw = await parseBody(req);
      const body = JSON.parse(raw);
      return sendResponse(res, await handlers.verifyToken(buildContext(req, {}, body, raw)));
    }

    if (req.method === 'POST' && apiPath === '/callback') {
      const raw = await parseBody(req);
      return sendResponse(res, await handlers.handleCallback(buildContext(req, {}, undefined, raw)));
    }

    const requestMatch = apiPath.match(/^\/request\/([^/]+)$/);
    if (requestMatch && req.method === 'GET') {
      return sendResponse(res, await handlers.getRequest(buildContext(req, { requestId: requestMatch[1] })));
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found', message: 'API endpoint not found' }));
  }

  // Checkout form handler (demonstrates server-side token verification)
  if (req.method === 'POST' && path === '/api/checkout') {
    const raw = await parseBody(req);
    const params = new URLSearchParams(raw);
    const token = params.get('eudi_token');

    if (!token) {
      res.writeHead(302, { Location: '/verify.html?error=missing_token' });
      return res.end();
    }

    const result = await handlers.verifyToken(buildContext(req, {}, { token }, raw));
    const verifyResult = result.body as { valid: boolean };

    if (verifyResult.valid) {
      res.writeHead(302, { Location: '/success.html' });
    } else {
      res.writeHead(302, { Location: '/verify.html?error=invalid_token' });
    }
    return res.end();
  }

  // Static files
  let filePath = path === '/' ? 'index.html' : path.slice(1);
  if (!extname(filePath)) filePath += '.html';

  if (await serveStatic(res, filePath)) return;

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🔵 EUDI Verify Demo running at http://localhost:${PORT}\n`);
  console.warn('⚠️  DEMO MODE - Credentials are simulated. Do not use in production.\n');
});
