/**
 * Lightweight mock verifier API for e2e tests.
 * Simulates demo session lifecycle: pending → waiting_for_wallet → verified
 */
import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.EUDI_MOCK_API_PORT ?? 3456);
const BASE_PATH = "/api/eudi";

/** @type {Map<string, { status: string, pollCount: number, request: object }>} */
const sessions = new Map();

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "X-Eudi-Mode": "demo",
  });
  res.end(JSON.stringify(body));
}

function now() {
  const d = new Date();
  return d.toISOString();
}

function expires() {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString();
}

function sessionDto(id) {
  const session = sessions.get(id);
  if (!session) return null;

  const dto = {
    id,
    status: session.status,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };

  if (session.status === "pending") {
    dto.qrUrl = `openid4vp://demo/session/${id}`;
  }

  if (session.status === "verified") {
    dto.token = `demo-token-${id}`;
    dto.claims = { age_over_18: true, nationality: "LU" };
  }

  return dto;
}

function advanceSession(id) {
  const session = sessions.get(id);
  if (!session) return;

  session.pollCount += 1;

  if (session.status === "pending" && session.pollCount >= 1) {
    session.status = "waiting_for_wallet";
  } else if (
    session.status === "waiting_for_wallet" &&
    session.pollCount >= 5
  ) {
    session.status = "verified";
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && path === `${BASE_PATH}/health`) {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && path === `${BASE_PATH}/sessions`) {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const id = randomUUID();
      sessions.set(id, {
        status: "pending",
        pollCount: 0,
        request: JSON.parse(body || "{}").request ?? {},
        createdAt: now(),
        expiresAt: expires(),
      });
      json(res, 201, sessionDto(id));
    });
    return;
  }

  const getMatch = path.match(new RegExp(`^${BASE_PATH}/sessions/([^/]+)$`));
  if (req.method === "GET" && getMatch) {
    const id = decodeURIComponent(getMatch[1]);
    const session = sessions.get(id);
    if (!session) {
      json(res, 404, {
        error: "session_not_found",
        message: "Session not found",
      });
      return;
    }
    advanceSession(id);
    json(res, 200, sessionDto(id));
    return;
  }

  const cancelMatch = path.match(
    new RegExp(`^${BASE_PATH}/sessions/([^/]+)/cancel$`),
  );
  if (req.method === "POST" && cancelMatch) {
    const id = decodeURIComponent(cancelMatch[1]);
    const session = sessions.get(id);
    if (!session) {
      json(res, 404, {
        error: "session_not_found",
        message: "Session not found",
      });
      return;
    }
    session.status = "cancelled";
    json(res, 200, { ...sessionDto(id), status: "cancelled" });
    return;
  }

  json(res, 404, {
    error: "not_found",
    message: `No route for ${req.method} ${path}`,
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is in use. Set EUDI_MOCK_API_PORT to a free port.`,
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`🚀 Mock API server: http://localhost:${PORT}${BASE_PATH}`);
});
