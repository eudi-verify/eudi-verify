// Must precede any `@openeudi/openid4vp` import — see openid4vp.ts for why.
import "reflect-metadata";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it, expect } from "vitest";
import { StaticTrustStore } from "@openeudi/openid4vp";
import { Openid4vpEngine } from "./openid4vp.js";
import { buildAvDcqlQuery, AV_DOCTYPE } from "./openid4vp-mappers.js";
import type { Session } from "../types.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const bindingMeta = JSON.parse(
  readFileSync(join(fixturesDir, "av-direct-post-binding.json"), "utf8"),
) as {
  state: string;
  request: { age_over_18: true };
  binding: { clientId: string; responseUri: string; nonce: string };
  deviceResponseFile: string;
};
// DeviceResponse is stored as wrapped base64url (sidecar) so the JSON stays
// under the repo long-line scan (max 500 chars).
const deviceResponse = readFileSync(
  join(fixturesDir, bindingMeta.deviceResponseFile),
  "utf8",
).replace(/\s+/g, "");
const bindingFixture = {
  ...bindingMeta,
  vpToken: { av: [deviceResponse] },
};

// A syntactically-valid throwaway cert is not needed here — StaticTrustStore
// parsing happens lazily and these tests only exercise construction guards
// and request-shape assertions, never real trust evaluation.
const trustedCerts: Uint8Array[] = [];

describe("openid4vp-mappers", () => {
  describe("buildAvDcqlQuery", () => {
    it("builds an mso_mdoc query for the AV doctype with requested claims", () => {
      const query = buildAvDcqlQuery({ age_over_18: true });

      expect(query.credentials).toHaveLength(1);
      const [credential] = query.credentials;
      expect(credential.format).toBe("mso_mdoc");
      expect(credential.meta?.doctype_value).toBe(AV_DOCTYPE);
      expect(credential.claims).toEqual([
        { path: [AV_DOCTYPE, "age_over_18"] },
      ]);
    });

    it("includes multiple requested claims", () => {
      const query = buildAvDcqlQuery({
        age_over_18: true,
        nationality: true,
      });

      expect(query.credentials[0].claims).toEqual([
        { path: [AV_DOCTYPE, "age_over_18"] },
        { path: [AV_DOCTYPE, "nationality"] },
      ]);
    });

    it("omits claims with no known mdoc path mapping", () => {
      const query = buildAvDcqlQuery({
        age_over_18: true,
        given_name: true,
      });

      expect(query.credentials[0].claims).toEqual([
        { path: [AV_DOCTYPE, "age_over_18"] },
      ]);
    });
  });
});

describe("Openid4vpEngine", () => {
  describe("construction guards (security controls)", () => {
    it("throws when no trust anchoring is configured at all", () => {
      expect(
        () =>
          new Openid4vpEngine({
            mode: "production",
            baseUrl: "https://verify.example.com",
          }),
      ).toThrow(/trust anchoring/i);
    });

    it("throws when skipTrustCheck is set without acknowledgeInsecureTrust", () => {
      expect(
        () =>
          new Openid4vpEngine({
            mode: "production",
            baseUrl: "https://verify.example.com",
            skipTrustCheck: true,
          }),
      ).toThrow(/trust anchoring/i);
    });

    it("does not throw when skipTrustCheck + acknowledgeInsecureTrust are both set", () => {
      expect(
        () =>
          new Openid4vpEngine({
            mode: "production",
            baseUrl: "https://verify.example.com",
            skipTrustCheck: true,
            acknowledgeInsecureTrust: true,
          }),
      ).not.toThrow();
    });

    it("does not throw when a trustStore is provided", () => {
      expect(
        () =>
          new Openid4vpEngine({
            mode: "production",
            baseUrl: "https://verify.example.com",
            trustStore: new StaticTrustStore(trustedCerts),
          }),
      ).not.toThrow();
    });

    it("throws unconditionally in NODE_ENV=production without anchored trust, even with the insecure hatch armed", () => {
      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        expect(
          () =>
            new Openid4vpEngine({
              mode: "production",
              baseUrl: "https://verify.example.com",
              skipTrustCheck: true,
              acknowledgeInsecureTrust: true,
            }),
        ).toThrow(/NODE_ENV/);
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it("throws when baseUrl is not https:// and allowInsecureTransport is not set", () => {
      expect(
        () =>
          new Openid4vpEngine({
            mode: "production",
            baseUrl: "http://192.168.1.50:3000/api/eudi",
            skipTrustCheck: true,
            acknowledgeInsecureTrust: true,
          }),
      ).toThrow(/https/i);
    });

    it("allows http:// baseUrl when allowInsecureTransport is set (LAN lab)", () => {
      expect(
        () =>
          new Openid4vpEngine({
            mode: "production",
            baseUrl: "http://192.168.1.50:3000/api/eudi",
            skipTrustCheck: true,
            acknowledgeInsecureTrust: true,
            allowInsecureTransport: true,
          }),
      ).not.toThrow();
    });
  });

  describe("createSession", () => {
    function buildEngine(): Openid4vpEngine {
      return new Openid4vpEngine({
        mode: "production",
        baseUrl: "https://verify.example.com/api/eudi",
        skipTrustCheck: true,
        acknowledgeInsecureTrust: true,
      });
    }

    it("emits a request URI with plain direct_post and redirect_uri: client_id", async () => {
      const engine = buildEngine();
      const result = await engine.createSession({
        sessionId: "sess-1",
        request: { age_over_18: true },
        baseUrl: "https://verify.example.com/api/eudi",
        ttlMs: 300_000,
      });

      const url = new URL(result.qrUrl);
      expect(url.searchParams.get("response_mode")).toBe("direct_post");
      expect(url.searchParams.get("client_id")).toBe(
        "redirect_uri:https://verify.example.com/api/eudi/callback",
      );
      expect(url.searchParams.get("response_uri")).toBe(
        "https://verify.example.com/api/eudi/callback",
      );
      expect(url.searchParams.get("state")).toBe("sess-1");
    });

    it("carries a dcql_query requesting the AV doctype + age_over_18", async () => {
      const engine = buildEngine();
      const result = await engine.createSession({
        sessionId: "sess-2",
        request: { age_over_18: true },
        baseUrl: "https://verify.example.com/api/eudi",
        ttlMs: 300_000,
      });

      const url = new URL(result.qrUrl);
      const dcqlQuery = JSON.parse(url.searchParams.get("dcql_query")!);
      expect(dcqlQuery.credentials[0].meta.doctype_value).toBe(AV_DOCTYPE);
      expect(dcqlQuery.credentials[0].claims).toEqual([
        { path: [AV_DOCTYPE, "age_over_18"] },
      ]);
    });

    it("persists engineData needed by handleCallback (nonce, dcqlQuery, clientId, responseUri)", async () => {
      const engine = buildEngine();
      const result = await engine.createSession({
        sessionId: "sess-3",
        request: { age_over_18: true },
        baseUrl: "https://verify.example.com/api/eudi",
        ttlMs: 300_000,
      });

      expect(result.engineData).toMatchObject({
        clientId: "redirect_uri:https://verify.example.com/api/eudi/callback",
        responseUri: "https://verify.example.com/api/eudi/callback",
        requestedClaims: ["age_over_18"],
      });
    });
  });

  describe("parseCallback", () => {
    function buildEngine(): Openid4vpEngine {
      return new Openid4vpEngine({
        mode: "production",
        baseUrl: "https://verify.example.com/api/eudi",
        skipTrustCheck: true,
        acknowledgeInsecureTrust: true,
      });
    }

    it("builds a CallbackData envelope from vp_token + state", async () => {
      const engine = buildEngine();
      const vpToken = { av: ["deadbeef"] };
      const body = new URLSearchParams({
        vp_token: JSON.stringify(vpToken),
        state: "sess-1",
      }).toString();

      const data = await engine.parseCallback(body);

      expect(data.sessionId).toBe("sess-1");
      expect(data.state).toBe("sess-1");
      expect(data.vpToken).toEqual(vpToken);
    });

    it("uses session_id when state is absent", async () => {
      const engine = buildEngine();
      const body = new URLSearchParams({
        vp_token: JSON.stringify({ av: ["deadbeef"] }),
        session_id: "sess-2",
      }).toString();

      const data = await engine.parseCallback(body);

      expect(data.sessionId).toBe("sess-2");
    });

    it("rejects a callback where state and session_id disagree", async () => {
      const engine = buildEngine();
      const body = new URLSearchParams({
        vp_token: JSON.stringify({ av: ["deadbeef"] }),
        state: "sess-1",
        session_id: "sess-DIFFERENT",
      }).toString();

      await expect(engine.parseCallback(body)).rejects.toThrow(/disagree/i);
    });

    it("rejects a callback missing vp_token", async () => {
      const engine = buildEngine();
      const body = new URLSearchParams({ state: "sess-1" }).toString();

      await expect(engine.parseCallback(body)).rejects.toThrow(/vp_token/i);
    });

    it("rejects a callback missing both state and session_id", async () => {
      const engine = buildEngine();
      const body = new URLSearchParams({
        vp_token: JSON.stringify({ av: ["deadbeef"] }),
      }).toString();

      await expect(engine.parseCallback(body)).rejects.toThrow(/state/i);
    });

    it("rejects a callback with malformed vp_token JSON", async () => {
      const engine = buildEngine();
      const body = "vp_token=not-json&state=sess-1";

      await expect(engine.parseCallback(body)).rejects.toThrow(/JSON/i);
    });
  });

  describe("handleCallback", () => {
    it("rejects when the callback state disagrees with the session it's posted against", async () => {
      const engine = new Openid4vpEngine({
        mode: "production",
        baseUrl: "https://verify.example.com/api/eudi",
        skipTrustCheck: true,
        acknowledgeInsecureTrust: true,
      });

      const created = await engine.createSession({
        sessionId: "sess-real",
        request: { age_over_18: true },
        baseUrl: "https://verify.example.com/api/eudi",
        ttlMs: 300_000,
      });

      const session = {
        id: "sess-real",
        status: "waiting_for_wallet" as const,
        request: { age_over_18: true as const },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300_000),
        _engineData: created.engineData,
      };

      const result = await engine.handleCallback(
        { sessionId: "sess-real", vpToken: { av: [] }, state: "sess-other" },
        session,
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe("error");
      expect(result.error).toBe("state_mismatch");
    });

    it("fails closed (error, not throw) when session._engineData is missing", async () => {
      const engine = new Openid4vpEngine({
        mode: "production",
        baseUrl: "https://verify.example.com/api/eudi",
        skipTrustCheck: true,
        acknowledgeInsecureTrust: true,
      });

      const session = {
        id: "sess-no-data",
        status: "waiting_for_wallet" as const,
        request: { age_over_18: true as const },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300_000),
      };

      const result = await engine.handleCallback(
        {
          sessionId: "sess-no-data",
          vpToken: { av: [] },
          state: "sess-no-data",
        },
        session,
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe("error");
      expect(result.error).toBe("missing_engine_session_data");
    });
  });

  /**
   * Negative binding tests against a captured AV wallet vp_token.
   * Proves SessionTranscript binding is enforced (not shape-matched): the
   * correct clientId/responseUri/nonce verify; independently mutating each
   * rejects with a failed DeviceSignature.
   */
  describe("SessionTranscript binding (captured fixture)", () => {
    const { binding, state, request, vpToken } = bindingFixture;

    function buildEngine(): Openid4vpEngine {
      return new Openid4vpEngine({
        mode: "production",
        baseUrl: "http://192.168.178.116:3001/api/eudi",
        skipTrustCheck: true,
        acknowledgeInsecureTrust: true,
        allowInsecureTransport: true,
      });
    }

    function sessionWith(
      overrides: Partial<{
        clientId: string;
        responseUri: string;
        nonce: string;
      }> = {},
    ): Session {
      const engineData = {
        nonce: overrides.nonce ?? binding.nonce,
        requestedClaims: ["age_over_18"],
        dcqlQuery: buildAvDcqlQuery(request),
        clientId: overrides.clientId ?? binding.clientId,
        responseUri: overrides.responseUri ?? binding.responseUri,
        createdAt: Date.now(),
      };
      return {
        id: state,
        status: "pending",
        request,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300_000),
        _engineData: engineData,
      };
    }

    it("accepts the captured vp_token with the matching binding", async () => {
      const result = await buildEngine().handleCallback(
        { sessionId: state, vpToken, state },
        sessionWith(),
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("verified");
      expect(result.claims).toEqual({ age_over_18: true });
      expect(result.trustLevel).toBe("none");
    });

    it.each([
      {
        field: "clientId",
        overrides: {
          clientId: "redirect_uri:http://evil.example/callback",
        },
      },
      {
        field: "responseUri",
        overrides: { responseUri: "http://evil.example/callback" },
      },
      {
        field: "nonce",
        overrides: { nonce: "00000000000000000000000000000000" },
      },
    ] as const)(
      "rejects when $field is mutated (DeviceSignature binding)",
      async ({ overrides }) => {
        const result = await buildEngine().handleCallback(
          { sessionId: state, vpToken, state },
          sessionWith(overrides),
        );

        expect(result.success).toBe(false);
        expect(result.status).toBe("rejected");
        expect(result.error).toMatch(/DeviceSignature|device authentication/i);
      },
    );
  });
});
