import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createVerification, type VerificationState } from "./verification.js";
import type { Session } from "./types.js";

function createMockFetch(responses: Array<{ status: number; body?: unknown }>) {
  let callIndex = 0;
  return vi.fn(async () => {
    const response = responses[callIndex++];
    if (!response) throw new Error("No more mock responses");

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body,
      headers: new Headers(),
    } as Response;
  });
}

describe("createVerification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts in idle state", () => {
      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: vi.fn(),
      });

      expect(verification.state).toEqual({ status: "idle" });
    });
  });

  describe("start()", () => {
    it("transitions to loading then showQR", async () => {
      const mockSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://verify?request_uri=...",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([{ status: 201, body: mockSession }]);
      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
      });

      const states: VerificationState[] = [];
      verification.subscribe((state) => states.push(state));

      await verification.start({ age_over_18: true });

      expect(states).toContainEqual({ status: "idle" });
      expect(states).toContainEqual({ status: "loading" });
      expect(states).toContainEqual(
        expect.objectContaining({
          status: "showQR",
          sessionId: "session-123",
        }),
      );
    });

    it("transitions to error on API failure", async () => {
      const mockFetch = createMockFetch([
        {
          status: 500,
          body: { error: "server_error", message: "Internal error" },
        },
      ]);
      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
      });

      const states: VerificationState[] = [];
      verification.subscribe((state) => states.push(state));

      await verification.start({ age_over_18: true });

      expect(states[states.length - 1]).toMatchObject({
        status: "error",
      });
    });

    it("includes QR data URL in showQR state", async () => {
      const mockSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([{ status: 201, body: mockSession }]);
      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
      });

      await verification.start({ age_over_18: true });

      const state = verification.state;
      expect(state.status).toBe("showQR");
      if (state.status === "showQR") {
        expect(state.qrDataUrl).toContain("data:image/svg+xml");
        expect(state.qrUrl).toBe("openid4vp://test");
      }

      verification.destroy();
    });
  });

  describe("polling", () => {
    it("polls and updates state when session status changes", async () => {
      const pendingSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const waitingSession: Session = {
        id: "session-123",
        status: "waiting_for_wallet",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const verifiedSession: Session = {
        id: "session-123",
        status: "verified",
        token: "eudi_v1.abc.xyz",
        claims: { age_over_18: true },
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([
        { status: 201, body: pendingSession },
        { status: 200, body: waitingSession },
        { status: 200, body: verifiedSession },
      ]);

      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
        polling: { initialIntervalMs: 100 },
      });

      const states: VerificationState[] = [];
      verification.subscribe((state) => states.push(state));

      await verification.start({ age_over_18: true });
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);

      expect(states).toContainEqual(
        expect.objectContaining({ status: "waitingForWallet" }),
      );
      expect(states).toContainEqual(
        expect.objectContaining({
          status: "verified",
          token: "eudi_v1.abc.xyz",
          claims: { age_over_18: true },
        }),
      );
    });

    it("stops polling on terminal state", async () => {
      const pendingSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const expiredSession: Session = {
        id: "session-123",
        status: "expired",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([
        { status: 201, body: pendingSession },
        { status: 200, body: expiredSession },
      ]);

      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
        polling: { initialIntervalMs: 100 },
      });

      await verification.start({ age_over_18: true });
      await vi.advanceTimersByTimeAsync(200);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(verification.state.status).toBe("expired");
    });

    it("handles rejected status", async () => {
      const pendingSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const rejectedSession: Session = {
        id: "session-123",
        status: "rejected",
        error: "User declined",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([
        { status: 201, body: pendingSession },
        { status: 200, body: rejectedSession },
      ]);

      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
        polling: { initialIntervalMs: 100 },
      });

      await verification.start({ age_over_18: true });
      await vi.advanceTimersByTimeAsync(200);

      expect(verification.state).toMatchObject({
        status: "rejected",
        error: "User declined",
      });
    });

    it("maps cancelled session to rejected while polling", async () => {
      const pendingSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const cancelledSession: Session = {
        id: "session-123",
        status: "cancelled",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([
        { status: 201, body: pendingSession },
        { status: 200, body: cancelledSession },
      ]);

      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
        polling: { initialIntervalMs: 100 },
      });

      await verification.start({ age_over_18: true });
      await vi.advanceTimersByTimeAsync(200);

      expect(verification.state).toMatchObject({
        status: "rejected",
        error: "Request was declined",
      });
    });
  });

  describe("cancel()", () => {
    it("cancels the session and returns to idle", async () => {
      const pendingSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const cancelledSession: Session = {
        id: "session-123",
        status: "cancelled",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = vi.fn(async (input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const isCancel = url.endsWith("/cancel");
        const body = isCancel ? cancelledSession : pendingSession;
        return {
          ok: true,
          status: isCancel ? 200 : 201,
          json: async () => body,
          headers: new Headers(),
        } as Response;
      });

      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
      });

      await verification.start({ age_over_18: true });
      verification.destroy();

      const verification2 = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
      });

      await verification2.start({ age_over_18: true });
      await verification2.cancel();

      expect(verification2.state.status).toBe("idle");
    });

    it("does nothing if no session active", async () => {
      const mockFetch = vi.fn();
      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
      });

      await verification.cancel();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(verification.state.status).toBe("idle");
    });

    it("ignores stale poll results after cancel", async () => {
      const pendingSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const cancelledSession: Session = {
        id: "session-123",
        status: "cancelled",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      let resolvePoll: (value: Response) => void = () => {};
      const pollPromise = new Promise<Response>((resolve) => {
        resolvePoll = resolve;
      });

      let getSessionCalls = 0;
      const mockFetch = vi.fn(async (input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;

        if (url.endsWith("/cancel")) {
          return {
            ok: true,
            status: 200,
            json: async () => cancelledSession,
            headers: new Headers(),
          } as Response;
        }

        if (url.includes("/sessions/session-123")) {
          getSessionCalls += 1;
          if (getSessionCalls === 1) {
            return pollPromise;
          }
        }

        return {
          ok: true,
          status: 201,
          json: async () => pendingSession,
          headers: new Headers(),
        } as Response;
      });

      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
        polling: { initialIntervalMs: 100 },
      });

      const startPromise = verification.start({ age_over_18: true });
      await vi.waitFor(() => {
        expect(getSessionCalls).toBe(1);
      });

      const cancelPromise = verification.cancel();
      resolvePoll({
        ok: true,
        status: 200,
        json: async () => cancelledSession,
        headers: new Headers(),
      } as Response);
      await cancelPromise;
      await startPromise;

      expect(verification.state.status).toBe("idle");
    });
  });

  describe("destroy()", () => {
    it("stops polling and clears subscribers", async () => {
      const mockSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([
        { status: 201, body: mockSession },
        { status: 200, body: mockSession },
        { status: 200, body: mockSession },
      ]);

      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
        polling: { initialIntervalMs: 100 },
      });

      const callback = vi.fn();
      verification.subscribe(callback);

      await verification.start({ age_over_18: true });
      const callsBeforeDestroy = callback.mock.calls.length;

      verification.destroy();

      await vi.advanceTimersByTimeAsync(1000);

      expect(callback.mock.calls.length).toBe(callsBeforeDestroy);
    });
  });

  describe("subscribe()", () => {
    it("calls callback immediately with current state", () => {
      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: vi.fn(),
      });

      const callback = vi.fn();
      verification.subscribe(callback);

      expect(callback).toHaveBeenCalledWith({ status: "idle" });
    });

    it("returns unsubscribe function", async () => {
      const mockSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([{ status: 201, body: mockSession }]);
      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
      });

      const callback = vi.fn();
      const unsubscribe = verification.subscribe(callback);
      const callsBefore = callback.mock.calls.length;

      unsubscribe();
      await verification.start({ age_over_18: true });

      expect(callback.mock.calls.length).toBe(callsBefore);

      verification.destroy();
    });

    it("handles callback errors gracefully", async () => {
      const mockSession: Session = {
        id: "session-123",
        status: "pending",
        qrUrl: "openid4vp://test",
        createdAt: "2024-01-01T00:00:00Z",
        expiresAt: "2024-01-01T00:05:00Z",
      };

      const mockFetch = createMockFetch([{ status: 201, body: mockSession }]);
      const verification = createVerification({
        apiUrl: "https://api.example.com",
        fetch: mockFetch,
      });

      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error("Callback error");
      });
      const goodCallback = vi.fn();

      verification.subscribe(errorCallback);
      verification.subscribe(goodCallback);

      await verification.start({ age_over_18: true });

      expect(goodCallback).toHaveBeenCalledTimes(3);

      verification.destroy();
    });
  });

  describe("state transitions", () => {
    it("maps all session statuses correctly", async () => {
      const statuses: Array<{
        sessionStatus: Session["status"];
        expectedState: string;
      }> = [
        { sessionStatus: "pending", expectedState: "showQR" },
        {
          sessionStatus: "waiting_for_wallet",
          expectedState: "waitingForWallet",
        },
        { sessionStatus: "verified", expectedState: "verified" },
        { sessionStatus: "rejected", expectedState: "rejected" },
        { sessionStatus: "expired", expectedState: "expired" },
        { sessionStatus: "cancelled", expectedState: "rejected" },
        { sessionStatus: "error", expectedState: "error" },
      ];

      for (const { sessionStatus, expectedState } of statuses) {
        const session: Session = {
          id: "session-123",
          status: sessionStatus,
          qrUrl: sessionStatus === "pending" ? "openid4vp://test" : undefined,
          token: sessionStatus === "verified" ? "token" : undefined,
          claims:
            sessionStatus === "verified" ? { age_over_18: true } : undefined,
          createdAt: "2024-01-01T00:00:00Z",
          expiresAt: "2024-01-01T00:05:00Z",
        };

        const mockFetch = createMockFetch([{ status: 201, body: session }]);
        const verification = createVerification({
          apiUrl: "https://api.example.com",
          fetch: mockFetch,
        });

        await verification.start({ age_over_18: true });

        expect(verification.state.status).toBe(expectedState);

        verification.destroy();
      }
    });
  });
});
