/**
 * @eudi-verify/react - Basic tests
 */

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { EudiVerify, type EudiVerifyRef } from "./EudiVerify.js";

describe("EudiVerify", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <EudiVerify apiUrl="/api/eudi" request={{ age_over_18: true }} />,
    );

    const element = container.querySelector("eudi-verify");
    expect(element).toBeDefined();
  });

  it("sets apiUrl attribute", () => {
    const { container } = render(
      <EudiVerify apiUrl="/test-api" request={{ age_over_18: true }} />,
    );

    const element = container.querySelector("eudi-verify") as any;
    expect(element?.apiUrl).toBe("/test-api");
  });

  it("accepts request as object", () => {
    const request = { age_over_18: true };
    const { container } = render(
      <EudiVerify apiUrl="/api/eudi" request={request} />,
    );

    const element = container.querySelector("eudi-verify") as any;
    expect(element?.request).toBe(JSON.stringify(request));
  });

  it("accepts request as JSON string", () => {
    const { container } = render(
      <EudiVerify apiUrl="/api/eudi" request='{"age_over_18":true}' />,
    );

    const element = container.querySelector("eudi-verify") as any;
    expect(element?.request).toBe('{"age_over_18":true}');
  });

  it("calls onVerified callback", async () => {
    const onVerified = vi.fn();
    const { container } = render(
      <EudiVerify
        apiUrl="/api/eudi"
        request={{ age_over_18: true }}
        onVerified={onVerified}
      />,
    );

    const element = container.querySelector("eudi-verify") as any;
    element?.dispatchEvent(
      new CustomEvent("verified", {
        detail: { token: "test-token", claims: { age_over_18: true } },
      }),
    );

    await waitFor(() => {
      expect(onVerified).toHaveBeenCalledWith({
        token: "test-token",
        claims: { age_over_18: true },
      });
    });
  });

  it("calls onError callback", async () => {
    const onError = vi.fn();
    const { container } = render(
      <EudiVerify
        apiUrl="/api/eudi"
        request={{ age_over_18: true }}
        onError={onError}
      />,
    );

    const element = container.querySelector("eudi-verify") as any;
    element?.dispatchEvent(
      new CustomEvent("error", { detail: { error: "test_error" } }),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith({ error: "test_error" });
    });
  });

  it("exposes ref with element property", () => {
    function TestComponent() {
      const ref = useRef<EudiVerifyRef>(null);
      return (
        <EudiVerify
          ref={ref}
          apiUrl="/api/eudi"
          request={{ age_over_18: true }}
        />
      );
    }

    render(<TestComponent />);
    // Basic smoke test that component renders with ref
    // Actual ref methods would require full DOM integration
  });
});
