/**
 * Manual wallet spike server (Milestone B lab / INTEROP captures).
 *
 * Standalone QR + capture helper. For the env-gated production engine on the
 * shared example API, use `EUDI_MODE=production` with `server.ts` instead.
 *
 * Usage:
 *   BASE_URL=http://192.168.1.50:3001/api/eudi pnpm --filter example-server spike:wallet
 *
 * Every callback is logged in full and saved under `captures/` together with
 * the session binding (`nonce`, `clientId`, `responseUri`) needed for
 * negative-fixture tests.
 */
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import {
  createVerifierHandlers,
  Openid4vpEngine,
  MemoryKVStore,
  sessionKey,
  clientIpFromHeaders,
  type RequestContext,
  type HandlerResponse,
  type Session,
} from "@eudi-verify/server";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Must be reachable from the phone: your machine's LAN IP, not localhost.
const BASE_URL = process.env.BASE_URL;
if (!BASE_URL) {
  console.error(
    "\nSet BASE_URL to your LAN address, e.g.\n" +
      "  BASE_URL=http://192.168.1.50:3001/api/eudi pnpm --filter example-server spike:wallet\n",
  );
  process.exit(1);
}

const trustMode = process.env.EUDI_TRUST || "skip"; // skip|static
const trustedCertsPath = process.env.EUDI_TRUSTED_CERTS;

let trustConfig:
  | { trustedCerts: Uint8Array[] }
  | {
      skipTrustCheck: true;
      acknowledgeInsecureTrust: true;
    };
if (trustMode === "static" && trustedCertsPath) {
  const { readFileSync } = await import("node:fs");
  trustConfig = {
    trustedCerts: [new Uint8Array(readFileSync(trustedCertsPath))],
  };
} else {
  trustConfig = { skipTrustCheck: true, acknowledgeInsecureTrust: true };
}

const engine = new Openid4vpEngine({
  mode: "production",
  baseUrl: BASE_URL,
  allowInsecureTransport: !BASE_URL.startsWith("https://"),
  ...trustConfig,
});

const store = new MemoryKVStore();
const handlers = createVerifierHandlers({
  engine,
  store,
  baseUrl: BASE_URL,
  mode: "production",
  tokenSecret: process.env.TOKEN_SECRET || "wallet-spike-secret-change-me-32c",
});

async function parseBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

function buildContext(
  req: IncomingMessage,
  params: Record<string, string>,
  body?: unknown,
  rawBody?: string,
): RequestContext {
  return {
    ip: clientIpFromHeaders(req.headers, req.socket.remoteAddress),
    origin: req.headers.origin,
    params,
    body,
    rawBody,
  };
}

async function sendResponse(
  res: ServerResponse,
  result: HandlerResponse,
): Promise<void> {
  res.writeHead(result.status, {
    "Content-Type": "application/json",
    ...result.headers,
  });
  res.end(
    typeof result.body === "string" ? result.body : JSON.stringify(result.body),
  );
}

function landingPage(
  sessionId: string,
  qrUrl: string,
  qrDataUrl: string,
): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>OpenID4VP wallet spike</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; }
    #status { font-weight: 600; }
    img.qr { display: block; width: 320px; height: 320px; }
    pre { background: #f4f4f4; padding: 12px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <h1>OpenID4VP wallet spike (checkpoint D)</h1>
  <p>Scan with the AV wallet. Status polls every 2s.</p>
  <img class="qr" alt="OpenID4VP authorization request QR" src="${qrDataUrl}" />
  <p>Status: <span id="status">pending</span></p>
  <details>
    <summary>Deep link (if camera scan fails)</summary>
    <pre>${qrUrl.replace(/</g, "&lt;")}</pre>
  </details>
  <pre id="raw"></pre>
  <script>
    const sessionId = ${JSON.stringify(sessionId)};
    async function poll() {
      const res = await fetch("/api/eudi/sessions/" + sessionId);
      const body = await res.json();
      document.getElementById("status").textContent = body.status;
      document.getElementById("raw").textContent = JSON.stringify(body, null, 2);
      if (!["verified", "rejected", "expired", "cancelled", "error"].includes(body.status)) {
        setTimeout(poll, 2000);
      }
    }
    poll();
  </script>
</body>
</html>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/" && req.method === "GET") {
    const created = await handlers.createSession(
      buildContext(req, {}, { request: { age_over_18: true } }),
    );
    if (created.status !== 201) {
      res.writeHead(created.status, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(created.body));
    }
    const body = created.body as { id: string; qrUrl: string };
    const qrDataUrl = await QRCode.toDataURL(body.qrUrl, {
      width: 320,
      margin: 2,
    });
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(landingPage(body.id, body.qrUrl, qrDataUrl));
  }

  if (path.startsWith("/api/eudi")) {
    const apiPath = path.replace("/api/eudi", "");

    if (req.method === "POST" && apiPath === "/callback") {
      const raw = await parseBody(req);
      console.log("\n=== CALLBACK RECEIVED ===");
      console.log("headers:", JSON.stringify(req.headers, null, 2));
      console.log("raw body length:", raw.length);
      console.log("raw body:", raw);
      try {
        const dir = join(process.cwd(), "captures");
        mkdirSync(dir, { recursive: true });
        const stamp = Date.now();
        writeFileSync(join(dir, `callback-${stamp}.txt`), raw, "utf8");
        const state = new URLSearchParams(raw).get("state");
        const session = state
          ? await store.get<Session>(sessionKey(state))
          : undefined;
        if (session?._engineData) {
          writeFileSync(
            join(dir, `binding-${stamp}.json`),
            JSON.stringify(
              {
                state,
                binding: {
                  nonce: (session._engineData as { nonce?: string }).nonce,
                  clientId: (session._engineData as { clientId?: string })
                    .clientId,
                  responseUri: (session._engineData as { responseUri?: string })
                    .responseUri,
                },
              },
              null,
              2,
            ) + "\n",
            "utf8",
          );
        }
        console.log("saved capture under", dir, `(stamp ${stamp})`);
      } catch (err) {
        console.warn("failed to save capture:", err);
      }
      console.log("=========================\n");
      return sendResponse(
        res,
        await handlers.handleCallback(buildContext(req, {}, undefined, raw)),
      );
    }

    const sessionMatch = apiPath.match(/^\/sessions\/([^/]+)$/);
    if (sessionMatch && req.method === "GET") {
      return sendResponse(
        res,
        await handlers.getSession(
          buildContext(req, { sessionId: sessionMatch[1] }),
        ),
      );
    }

    if (req.method === "POST" && apiPath === "/sessions") {
      const raw = await parseBody(req);
      const body = JSON.parse(raw);
      return sendResponse(
        res,
        await handlers.createSession(buildContext(req, {}, body, raw)),
      );
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, HOST, () => {
  console.log(
    `\nWallet spike server: http://${HOST}:${PORT}/ (open on your laptop)`,
  );
  console.log(`BASE_URL (must match what the phone can reach): ${BASE_URL}`);
  console.log(
    `Trust mode: ${trustMode === "static" ? "static (anchored)" : "skip (lab-only, no trust anchoring)"}`,
  );
  console.log(
    "\nOpen http://<your-laptop-ip>:" +
      PORT +
      "/ on the laptop, scan the QR with the AV wallet.\n",
  );
});
