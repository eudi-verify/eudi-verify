import {
  createServer,
  request as httpRequest,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SHARED_DIR = join(__dirname, "../shared");
const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "127.0.0.1";
const API_PORT = parseInt(process.env.API_PORT || "3000", 10);

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
};

async function serveStatic(
  res: ServerResponse,
  filePath: string,
): Promise<boolean> {
  try {
    const fullPath = join(__dirname, "public", filePath);
    const content = await readFile(fullPath);
    const ext = extname(filePath);
    const headers: Record<string, string> = {
      "Content-Type": MIME[ext] || "text/plain",
    };
    if (ext === ".html" && filePath !== "index.html") {
      headers["X-Robots-Tag"] = "noindex";
    }
    res.writeHead(200, headers);
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

async function serveShared(
  res: ServerResponse,
  fileName: string,
): Promise<boolean> {
  try {
    const content = await readFile(join(SHARED_DIR, fileName));
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

async function serveEmbedBundle(res: ServerResponse): Promise<void> {
  try {
    const bundlePath = join(
      __dirname,
      "../../packages/embed/dist/eudi-verify.iife.js",
    );
    const content = await readFile(bundlePath);
    res.writeHead(200, {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(
      "Widget bundle not found. Run `pnpm build` in packages/embed first.",
    );
  }
}

function proxyApi(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  search: string,
): void {
  const proxyReq = httpRequest(
    {
      hostname: "localhost",
      port: API_PORT,
      path: path + search,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${API_PORT}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "api_not_here",
        message:
          "API server runs separately on port 3000. Start it with: cd ../server && pnpm start",
      }),
    );
  });

  req.pipe(proxyReq);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === "/eudi-verify.js") {
    return serveEmbedBundle(res);
  }

  if (path.startsWith("/api/")) {
    return proxyApi(req, res, path, url.search);
  }

  let filePath = path === "/" ? "index.html" : path.slice(1);
  if (!extname(filePath)) filePath += ".html";

  if (await serveStatic(res, filePath)) return;

  if (filePath.endsWith(".js") && (await serveShared(res, filePath))) return;

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`\n📁 Static server running at http://${HOST}:${PORT}\n`);
  console.log(
    "Make sure the API server is running: cd ../server && pnpm start\n",
  );
});
