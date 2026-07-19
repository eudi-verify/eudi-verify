/**
 * @eudi-verify/server - OpenID4VP Mappers
 *
 * Translates between the product's boolean claim-ask (`VerificationRequest`)
 * and the wire-level DCQL query / VerifyResult shapes from `@openeudi/openid4vp`.
 */

import type { DcqlQuery, VerifyResult } from "@openeudi/openid4vp";
import type {
  VerificationRequest,
  VerifiedClaims,
  TrustLevel,
} from "../types.js";
import type { CallbackResult } from "../engine.js";

/**
 * mDOC docType for the EUDI Age Verification (AV) attestation. Not covered
 * by `HAIP_DOCTYPE_NAMESPACES` in `@openeudi/openid4vp` (only mDL + PID) —
 * DCQL is built directly for this doctype instead of via `buildHaipQuery`.
 */
export const AV_DOCTYPE = "eu.europa.ec.av.1";

/** Maps product claim keys to the AV mdoc namespace claim they request. */
const CLAIM_TO_MDOC_PATH: Record<string, string> = {
  age_over_18: "age_over_18",
  age_over_21: "age_over_21",
  nationality: "nationality",
};

/**
 * Build the DCQL query for the requested boolean claims against the AV
 * mdoc doctype. Only claims with a known mdoc path mapping are included —
 * unsupported claims (e.g. `given_name`) are silently dropped from the wire
 * query today; callers should not request claims this engine can't serve.
 */
export function buildAvDcqlQuery(request: VerificationRequest): DcqlQuery {
  const requestedClaims = Object.keys(request).filter(
    (k) => request[k] === true && CLAIM_TO_MDOC_PATH[k],
  );

  const claims = requestedClaims.map((claim) => ({
    path: [AV_DOCTYPE, CLAIM_TO_MDOC_PATH[claim]],
  }));

  return {
    credentials: [
      {
        id: "av",
        format: "mso_mdoc",
        meta: { doctype_value: AV_DOCTYPE },
        claims,
      },
    ],
  };
}

/** Claim keys requested (used for engine session bookkeeping). */
export function requestedClaimKeys(request: VerificationRequest): string[] {
  return Object.keys(request).filter(
    (k) => request[k] === true && CLAIM_TO_MDOC_PATH[k],
  );
}

/**
 * Map an `@openeudi/openid4vp` `VerifyResult` to the server's `CallbackResult`.
 *
 * Prefer `parsed.error` over a DCQL unmatched reason when the parser already
 * failed closed (e.g. missing `mdocSessionTranscript`) — otherwise a
 * doctype-less failure return gets mis-reported as `dcql_doctype_mismatch`.
 *
 * `matches[].extractedClaims` is keyed by the last DCQL claim-path segment
 * (see `@openeudi/dcql`'s `matchQuery`), which for `buildAvDcqlQuery` is
 * exactly the product claim key (`age_over_18`, etc.) — no remapping needed.
 */
export function verifyResultToClaims(
  result: VerifyResult,
  trustLevel: TrustLevel,
): CallbackResult {
  if (!result.valid || !result.match.satisfied) {
    const parserError = result.parsed?.error;
    const unmatched = result.match.unmatched[0];
    return {
      success: false,
      status: "rejected",
      error:
        parserError ??
        (unmatched ? `dcql_${unmatched.reason}` : "presentation_invalid"),
    };
  }

  const claims: VerifiedClaims = {};
  for (const match of result.match.matches) {
    for (const [key, value] of Object.entries(match.extractedClaims)) {
      claims[key] = value;
    }
  }

  return {
    success: true,
    status: "verified",
    claims,
    trustLevel,
  };
}
