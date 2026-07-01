import { useRef, useState, useEffect } from "react";
import { EudiVerify, type EudiVerifyRef } from "@eudi-verify/react";
import { inspectLink, wireInspectLog } from "../../shared/demo-inspect.js";
import {
  clearVerifierAudit,
  pushVerifierAudit,
} from "../../shared/demo-audit-log.js";

interface LogEntry {
  time: string;
  message: string;
  html?: boolean;
}

function sessionInspectUrl(id: string) {
  return `/api/eudi/sessions/${encodeURIComponent(id)}`;
}
function receiptInspectUrl(rid: string) {
  return `/api/demo/receipt/${encodeURIComponent(rid)}`;
}

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [curlCommand, setCurlCommand] = useState<string>("");
  const [showDemoWallet, setShowDemoWallet] = useState(false);
  const [showCurlHint, setShowCurlHint] = useState(false);
  const widgetRef = useRef<EudiVerifyRef>(null);
  const errorAlertRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (logRef.current) wireInspectLog(logRef.current);
  }, []);

  const log = (message: string, html = false) => {
    const entry = pushVerifierAudit(message, html);
    setLogs((prev) => [...prev, entry]);
  };

  const truncateToken = (token: string) => {
    if (!token || token.length <= 24) return token;
    return `${token.slice(0, 12)}…${token.slice(-8)}`;
  };

  const updateCurlHint = (sessionId: string) => {
    const origin = window.location.origin;
    setCurlCommand(
      `curl -X POST ${origin}/api/eudi/callback \\\n` +
        `  -H "Content-Type: application/x-www-form-urlencoded" \\\n` +
        `  -d "response=demo&state=${sessionId}"`,
    );
    setShowCurlHint(true);
  };

  const resetSessionUi = () => {
    setCurrentSessionId(null);
    setShowDemoWallet(false);
    setShowCurlHint(false);
  };

  const clearError = () => {
    setErrorMessage(null);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => errorAlertRef.current?.focus(), 100);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      const messages: Record<string, string> = {
        invalid_token: "Token validation failed. Please try again.",
        missing_token: "Missing verification token. Please try again.",
      };
      showError(
        messages[errorParam] || "Verification failed. Please try again.",
      );
    }
  }, []);

  const handleStateChange = ({ state }: { state: any }) => {
    const status = state.status;

    switch (status) {
      case "loading":
        clearVerifierAudit();
        setLogs([]);
        log("Starting verification…");
        resetSessionUi();
        clearError();
        break;

      case "showQR":
        if ("sessionId" in state) {
          const sessionId = state.sessionId;
          setCurrentSessionId(sessionId);
          log(
            `POST /sessions → session <code>${sessionId}</code> – ` +
              `${inspectLink(sessionInspectUrl(sessionId))}`,
            true,
          );
          updateCurlHint(sessionId);
          setShowDemoWallet(true);
        }
        break;

      case "waitingForWallet":
        if ("sessionId" in state) {
          const sessionId = state.sessionId;
          setCurrentSessionId(sessionId);
          updateCurlHint(sessionId);
          setShowDemoWallet(true);
        }
        log("Status: waiting_for_wallet");
        break;

      case "rejected":
        log(`Verification rejected${state.error ? `: ${state.error}` : ""}`);
        break;

      case "expired":
        log("Session expired");
        showError("Verification session expired. Please try again.");
        resetSessionUi();
        break;

      case "verified":
        if ("token" in state && currentSessionId) {
          log(
            `GET /sessions/${currentSessionId} → verified (token ${truncateToken(state.token)}) – ${inspectLink(sessionInspectUrl(currentSessionId))}`,
            true,
          );
        }
        break;

      case "error":
        if ("error" in state) {
          log(`Error: ${state.error}`);
          showError("Verification failed. Please try again.");
        }
        resetSessionUi();
        break;

      case "idle":
        resetSessionUi();
        break;
    }
  };

  const handleVerified = async ({
    token,
    claims,
  }: {
    token: string;
    claims: Record<string, unknown>;
  }) => {
    log(`Claims: ${JSON.stringify(claims)}`);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          eudi_token: token,
          eudi_session_id: currentSessionId || "",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.receiptId) {
          log(
            `POST /api/checkout → 200 – ${inspectLink(receiptInspectUrl(result.receiptId))}`,
            true,
          );
          window.location.href = `/success.html?rid=${encodeURIComponent(result.receiptId)}`;
        } else {
          showError("Checkout failed. Please try again.");
        }
      } else {
        showError("Token validation failed.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showError("Failed to submit token. Please try again.");
    }
  };

  const handleRejected = ({ error }: { error?: string }) => {
    log(`Verification rejected${error ? `: ${error}` : ""}`);
    showError(
      error
        ? `Verification was declined: ${error}`
        : "Verification was rejected. Please try again.",
    );
    resetSessionUi();
  };

  const handleExpired = () => {
    log("Session expired");
    showError("Verification session expired. Please try again.");
    resetSessionUi();
  };

  const handleError = ({ error }: { error: string }) => {
    log(`Error: ${error}`);
    showError("Verification failed. Please try again.");
    resetSessionUi();
  };

  const demoWalletLink = currentSessionId
    ? `/demo-wallet.html?state=${encodeURIComponent(currentSessionId)}`
    : "#";

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="demo-banner" role="status">
        Simulated verification — credentials are fake. For local testing only.
      </div>

      <div className="page-shell">
        <header className="site-header">
          <a href="/" className="site-header__brand">
            <img
              className="eu-emblem"
              src="/eu-emblem.svg"
              alt=""
              width="37"
              height="25"
              aria-hidden="true"
            />
            <span className="site-header__brand-text">
              <span className="site-header__title">EUDI Verify</span>
              <span className="site-header__subtitle">
                Age verification demo
              </span>
            </span>
          </a>
        </header>

        <main id="main-content" className="page-main" tabIndex={-1}>
          <div className="page-panel page-panel--flat">
            <span className="page-eyebrow">Captcha-style gate</span>
            <h1>Age Verification Required</h1>
            <p className="lead">
              This content requires age verification. Confirm you are over 18
              using your EU Digital Identity Wallet.
            </p>

            {errorMessage && (
              <div
                ref={errorAlertRef}
                className="alert alert-error"
                role="alert"
                tabIndex={-1}
              >
                {errorMessage}
              </div>
            )}

            <div className="card card--widget widget-section">
              <EudiVerify
                ref={widgetRef}
                apiUrl="/api/eudi"
                request={{ age_over_18: true }}
                onStateChange={handleStateChange}
                onVerified={handleVerified}
                onRejected={handleRejected}
                onExpired={handleExpired}
                onError={handleError}
              />
            </div>

            {showDemoWallet && (
              <div className="card demo-wallet-panel">
                <p className="demo-wallet-hint">
                  No EUDI Wallet app installed? Open the demo wallet in a new
                  tab to approve this request.
                </p>
                <a
                  className="btn-demo-wallet"
                  href={demoWalletLink}
                  target="_blank"
                  rel="noopener"
                >
                  Open demo wallet →
                </a>
              </div>
            )}

            {logs.length > 0 && (
              <div className="card log-card">
                <h3>Verification log</h3>
                <ol className="verification-log" ref={logRef}>
                  {logs.map((entry, i) =>
                    entry.html ? (
                      <li
                        key={i}
                        dangerouslySetInnerHTML={{
                          __html: `${entry.time}  ${entry.message}`,
                        }}
                      />
                    ) : (
                      <li key={i}>{`${entry.time}  ${entry.message}`}</li>
                    ),
                  )}
                </ol>
              </div>
            )}

            {showCurlHint && (
              <details className="curl-hint">
                <summary>Developer: simulate wallet with curl</summary>
                <div className="curl-hint__body">
                  <p className="curl-hint-note">
                    Same effect as the demo wallet Approve button — useful for
                    CI, scripting, and debugging.
                  </p>
                  <pre className="replay-result">{curlCommand}</pre>
                </div>
              </details>
            )}

            <div className="card card--accent">
              <h3>What happens next?</h3>
              <p>
                After verification, an opaque token is sent to our server which
                validates it before granting access. Your actual identity data
                never reaches the browser.
              </p>
            </div>

            <a href="/" className="back-link">
              ← Back to home
            </a>
          </div>
        </main>

        <footer className="site-footer">
          <p>
            Open source under{" "}
            <a href="https://github.com/eudi-verify/eudi-verify">Apache-2.0</a>.
            Designed for EU-sovereign deployment.
          </p>
        </footer>
      </div>
    </>
  );
}

export default App;
