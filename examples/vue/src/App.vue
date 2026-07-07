<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import "@eudi-verify/embed";
import type { EudiVerifyEventMap } from "@eudi-verify/embed";
import { inspectLink, wireInspectLog } from "../../shared/demo-inspect.js";
import {
  clearVerifierAudit,
  pushVerifierAudit,
  type VerifierAuditEntry,
} from "../../shared/demo-audit-log.js";

type VerificationState = EudiVerifyEventMap["state-change"]["detail"]["state"];
type VerifiedDetail = EudiVerifyEventMap["verified"]["detail"];
type RejectedDetail = EudiVerifyEventMap["rejected"]["detail"];
type ErrorDetail = EudiVerifyEventMap["error"]["detail"];

const request = JSON.stringify({ age_over_18: true });
const logs = ref<VerifierAuditEntry[]>([]);
const currentSessionId = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const curlCommand = ref("");
const showDemoWallet = ref(false);
const showCurlHint = ref(false);
const errorAlertRef = ref<HTMLDivElement | null>(null);
const logRef = ref<HTMLOListElement | null>(null);

const demoWalletLink = computed(() =>
  currentSessionId.value
    ? `/demo-wallet.html?state=${encodeURIComponent(currentSessionId.value)}`
    : "#",
);

function sessionInspectUrl(id: string) {
  return `/api/eudi/sessions/${encodeURIComponent(id)}`;
}

function receiptInspectUrl(rid: string) {
  return `/api/demo/receipt/${encodeURIComponent(rid)}`;
}

function focusErrorAlert() {
  void nextTick(() => {
    errorAlertRef.value?.focus();
  });
}

function ensureLogWired() {
  void nextTick(() => {
    wireInspectLog(logRef.value);
  });
}

function log(message: string, html = false) {
  const entry = pushVerifierAudit(message, html);
  logs.value = [...logs.value, entry];
  ensureLogWired();
}

function truncateToken(token: string) {
  if (!token || token.length <= 24) return token;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

function updateCurlHint(sessionId: string) {
  const origin = window.location.origin;
  curlCommand.value =
    `curl -X POST ${origin}/api/eudi/callback \\\n` +
    `  -H "Content-Type: application/x-www-form-urlencoded" \\\n` +
    `  -d "response=demo&state=${sessionId}"`;
  showCurlHint.value = true;
}

function resetSessionUi() {
  currentSessionId.value = null;
  showDemoWallet.value = false;
  showCurlHint.value = false;
}

function clearError() {
  errorMessage.value = null;
}

function showError(message: string) {
  errorMessage.value = message;
  focusErrorAlert();
}

function detailFromEvent<T>(event: Event): T {
  return (event as CustomEvent<T>).detail;
}

function stateFromEvent(event: Event): VerificationState {
  return detailFromEvent<EudiVerifyEventMap["state-change"]["detail"]>(event)
    .state;
}

function handleStateChange(event: Event) {
  const state = stateFromEvent(event);

  switch (state.status) {
    case "loading":
      clearVerifierAudit();
      logs.value = [];
      log("Starting verification...");
      resetSessionUi();
      clearError();
      break;

    case "showQR":
      if ("sessionId" in state) {
        const sessionId = state.sessionId;
        currentSessionId.value = sessionId;
        log(
          `POST /sessions -> session <code>${sessionId}</code> - ` +
            `${inspectLink(sessionInspectUrl(sessionId))}`,
          true,
        );
        updateCurlHint(sessionId);
        showDemoWallet.value = true;
      }
      break;

    case "waitingForWallet":
      if ("sessionId" in state) {
        const sessionId = state.sessionId;
        currentSessionId.value = sessionId;
        updateCurlHint(sessionId);
        showDemoWallet.value = true;
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
      if ("token" in state && currentSessionId.value) {
        log(
          `GET /sessions/${currentSessionId.value} -> verified ` +
            `(token ${truncateToken(state.token)}) - ` +
            inspectLink(sessionInspectUrl(currentSessionId.value)),
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
}

async function handleVerified(event: Event) {
  const { token, claims } = detailFromEvent<VerifiedDetail>(event);
  log(`Claims: ${JSON.stringify(claims)}`);

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        eudi_token: token,
        eudi_session_id: currentSessionId.value || "",
      }),
    });

    if (response.ok) {
      const result = (await response.json()) as {
        success?: boolean;
        receiptId?: string;
      };
      if (result.success && result.receiptId) {
        log(
          `POST /api/checkout -> 200 - ` +
            inspectLink(receiptInspectUrl(result.receiptId)),
          true,
        );
        window.location.href = `/success.html?rid=${encodeURIComponent(
          result.receiptId,
        )}`;
      } else {
        showError("Checkout failed. Please try again.");
      }
    } else {
      showError("Token validation failed.");
    }
  } catch (error) {
    console.error("Checkout error:", error);
    showError("Failed to submit token. Please try again.");
  }
}

function handleRejected(event: Event) {
  const { error } = detailFromEvent<RejectedDetail>(event);
  log(`Verification rejected${error ? `: ${error}` : ""}`);
  showError(
    error
      ? `Verification was declined: ${error}`
      : "Verification was rejected. Please try again.",
  );
  resetSessionUi();
}

function handleExpired() {
  log("Session expired");
  showError("Verification session expired. Please try again.");
  resetSessionUi();
}

function handleError(event: Event) {
  const { error } = detailFromEvent<ErrorDetail>(event);
  log(`Error: ${error}`);
  showError("Verification failed. Please try again.");
  resetSessionUi();
}

onMounted(() => {
  wireInspectLog(logRef.value);

  const params = new URLSearchParams(window.location.search);
  const errorParam = params.get("error");
  if (errorParam) {
    const messages: Record<string, string> = {
      invalid_token: "Token validation failed. Please try again.",
      missing_token: "Missing verification token. Please try again.",
    };
    showError(messages[errorParam] || "Verification failed. Please try again.");
  }
});
</script>

<template>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div class="demo-banner" role="status">
    Simulated verification - credentials are fake. For local testing only.
  </div>

  <div class="page-shell">
    <header class="site-header">
      <a href="/" class="site-header__brand">
        <img
          class="eu-emblem"
          src="/eu-emblem.svg"
          alt=""
          width="37"
          height="25"
          aria-hidden="true"
        />
        <span class="site-header__brand-text">
          <span class="site-header__title">EUDI Verify</span>
          <span class="site-header__subtitle">Age verification demo</span>
        </span>
      </a>
    </header>

    <main id="main-content" class="page-main" tabindex="-1">
      <div class="page-panel page-panel--flat">
        <span class="page-eyebrow">Captcha-style gate</span>
        <h1>Age Verification Required</h1>
        <p class="lead">
          This content requires age verification. Confirm you are over 18 using
          your EU Digital Identity Wallet.
        </p>

        <div
          v-if="errorMessage"
          ref="errorAlertRef"
          class="alert alert-error"
          role="alert"
          tabindex="-1"
        >
          {{ errorMessage }}
        </div>

        <div class="card card--widget widget-section">
          <eudi-verify
            api-url="/api/eudi"
            :request="request"
            @state-change="handleStateChange"
            @verified="handleVerified"
            @rejected="handleRejected"
            @expired="handleExpired"
            @error="handleError"
          />
        </div>

        <div v-if="showDemoWallet" class="card demo-wallet-panel">
          <p class="demo-wallet-hint">
            No EUDI Wallet app installed? Open the demo wallet in a new tab to
            approve this request.
          </p>
          <a
            class="btn-demo-wallet"
            :href="demoWalletLink"
            target="_blank"
            rel="noopener"
          >
            Open demo wallet -&gt;
          </a>
        </div>

        <div v-if="logs.length > 0" class="card log-card">
          <h3>Verification log</h3>
          <ol ref="logRef" class="verification-log">
            <li v-for="(entry, i) in logs" :key="`${entry.time}-${i}`">
              <span
                v-if="entry.html"
                v-html="`${entry.time}  ${entry.message}`"
              />
              <template v-else>{{
                `${entry.time}  ${entry.message}`
              }}</template>
            </li>
          </ol>
        </div>

        <details v-if="showCurlHint" class="curl-hint">
          <summary>Developer: simulate wallet with curl</summary>
          <div class="curl-hint__body">
            <p class="curl-hint-note">
              Same effect as the demo wallet Approve button - useful for CI,
              scripting, and debugging.
            </p>
            <pre class="replay-result">{{ curlCommand }}</pre>
          </div>
        </details>

        <div class="card card--accent">
          <h3>What happens next?</h3>
          <p>
            After verification, an opaque token is sent to our server which
            validates it before granting access. Your actual identity data never
            reaches the browser.
          </p>
        </div>

        <a href="/" class="back-link">&larr; Back to home</a>
      </div>
    </main>

    <footer class="site-footer">
      <p>
        Open source under
        <a href="https://github.com/eudi-verify/eudi-verify">Apache-2.0</a>.
        Designed for EU-sovereign deployment.
      </p>
    </footer>
  </div>
</template>
