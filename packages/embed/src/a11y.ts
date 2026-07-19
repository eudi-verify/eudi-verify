/**
 * @eudi-verify/embed - Accessibility Utilities
 *
 * WCAG 2.1 AA compliance helpers for focus management and announcements.
 */

/**
 * Selectors for focusable elements within the widget.
 */
const FOCUSABLE_SELECTORS = [
  "button:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "a[href]",
  "input:not([disabled])",
].join(", ");

/**
 * Get all focusable elements within a container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
  );
}

/**
 * Create a focus trap within a container.
 * Returns a cleanup function to remove the trap.
 *
 * ponytail: not used for the default inline widget – trapping focus would block
 * tabbing to surrounding page content (demo links, logs). Reserved for future
 * modal/dialog embedding.
 */
export function createFocusTrap(container: HTMLElement): () => void {
  let previouslyFocused: HTMLElement | null = null;

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Tab") return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) return;

    const firstElement = focusable[0]!;
    const lastElement = focusable[focusable.length - 1]!;

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function activate(): void {
    previouslyFocused = document.activeElement as HTMLElement | null;
    container.addEventListener("keydown", handleKeyDown);

    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0]!.focus();
    }
  }

  function deactivate(): void {
    container.removeEventListener("keydown", handleKeyDown);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  }

  activate();
  return deactivate;
}

/**
 * Announce a message to screen readers via aria-live region.
 */
export function announce(
  liveRegion: HTMLElement,
  message: string,
  priority: "polite" | "assertive" = "polite",
): void {
  liveRegion.setAttribute("aria-live", priority);
  liveRegion.textContent = "";
  requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

/**
 * Clear the announcement from a live region.
 */
export function clearAnnouncement(liveRegion: HTMLElement): void {
  liveRegion.textContent = "";
}

/**
 * Messages for each verification state (for screen reader announcements).
 */
export const STATE_MESSAGES = {
  idle: "",
  loading: "Loading verification session...",
  showQR: "QR code ready. Scan with your EU Digital Identity Wallet.",
  waitingForWallet: "Waiting for wallet approval...",
  verified: "Identity verified successfully.",
  rejected: "Verification was declined.",
  expired: "Verification session expired.",
  error: "Verification error occurred.",
} as const;

/**
 * Get aria-live priority for a state change.
 * Terminal states use assertive, others use polite.
 */
export function getAnnouncementPriority(
  status: keyof typeof STATE_MESSAGES,
): "polite" | "assertive" {
  switch (status) {
    case "verified":
    case "rejected":
    case "expired":
    case "error":
      return "assertive";
    default:
      return "polite";
  }
}

/**
 * Check if reduced motion is preferred.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
