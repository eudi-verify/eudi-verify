/**
 * @eudi-verify/react - React wrapper for <eudi-verify> custom element
 *
 * Provides idiomatic React props and callbacks that map to the
 * underlying custom element's attributes and events.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ForwardedRef,
} from "react";
import type { EudiVerifyElement } from "@eudi-verify/embed";
import type { EudiVerifyProps, EudiVerifyRef } from "./types.js";

/**
 * EudiVerify component - React wrapper for EUDI Wallet verification.
 *
 * @example
 * ```tsx
 * import { EudiVerify } from '@eudi-verify/react';
 *
 * function AgeGate() {
 *   return (
 *     <EudiVerify
 *       apiUrl="/api/eudi"
 *       request={{ age_over_18: true }}
 *       onVerified={({ token, claims }) => {
 *         // POST token to your backend
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export const EudiVerify = forwardRef<EudiVerifyRef, EudiVerifyProps>(
  function EudiVerify(
    {
      apiUrl,
      request,
      autoStart,
      className,
      style,
      onVerified,
      onRejected,
      onExpired,
      onError,
      onStateChange,
    },
    ref: ForwardedRef<EudiVerifyRef>,
  ) {
    const elementRef = useRef<EudiVerifyElement>(null);

    // Sync attributes to the custom element
    useEffect(() => {
      const el = elementRef.current;
      if (!el) return;

      el.apiUrl = apiUrl;
      el.request =
        typeof request === "string" ? request : JSON.stringify(request);
      if (autoStart !== undefined) {
        el.autoStart = autoStart;
      }
    }, [apiUrl, request, autoStart]);

    // Wire event listeners
    useEffect(() => {
      const el = elementRef.current;
      if (!el || !onVerified) return;

      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<{
          token: string;
          claims: Record<string, unknown>;
        }>;
        onVerified(customEvent.detail);
      };

      el.addEventListener("verified", handler);
      return () => el.removeEventListener("verified", handler);
    }, [onVerified]);

    useEffect(() => {
      const el = elementRef.current;
      if (!el || !onRejected) return;

      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<{ error?: string }>;
        onRejected(customEvent.detail);
      };

      el.addEventListener("rejected", handler);
      return () => el.removeEventListener("rejected", handler);
    }, [onRejected]);

    useEffect(() => {
      const el = elementRef.current;
      if (!el || !onExpired) return;

      const handler = () => onExpired();

      el.addEventListener("expired", handler);
      return () => el.removeEventListener("expired", handler);
    }, [onExpired]);

    useEffect(() => {
      const el = elementRef.current;
      if (!el || !onError) return;

      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<{ error: string }>;
        onError(customEvent.detail);
      };

      el.addEventListener("error", handler);
      return () => el.removeEventListener("error", handler);
    }, [onError]);

    useEffect(() => {
      const el = elementRef.current;
      if (!el || !onStateChange) return;

      const handler = (e: Event) => {
        const customEvent = e as CustomEvent<{ state: any }>;
        onStateChange(customEvent.detail);
      };

      el.addEventListener("state-change", handler);
      return () => el.removeEventListener("state-change", handler);
    }, [onStateChange]);

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        start: () => elementRef.current?.start(),
        cancel: () => elementRef.current?.cancel(),
        reset: () => elementRef.current?.reset(),
        get state() {
          return elementRef.current?.state ?? null;
        },
        get element() {
          return elementRef.current;
        },
      }),
      [],
    );

    return <eudi-verify ref={elementRef} className={className} style={style} />;
  },
);

// Type augmentation for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "eudi-verify": React.DetailedHTMLProps<
        React.HTMLAttributes<EudiVerifyElement>,
        EudiVerifyElement
      >;
    }
  }
}
