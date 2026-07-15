import { VerificationType, type VerificationResult } from "@openeudi/core";
import type {
  SessionStatus,
  VerificationRequest,
  VerifiedClaims,
} from "../types.js";

export interface CoreTypeMapping {
  type: VerificationType;
}

export function requestToCoreType(
  request: VerificationRequest,
): CoreTypeMapping {
  const wantsAge = request.age_over_18 === true || request.age_over_21 === true;
  const wantsCountry = request.nationality === true;

  if (wantsAge && wantsCountry) {
    return { type: VerificationType.BOTH };
  }
  if (wantsAge) {
    return { type: VerificationType.AGE };
  }
  if (wantsCountry) {
    return { type: VerificationType.COUNTRY };
  }
  // ponytail: core 0.8.0 only supports age+country; unsupported-only requests default to AGE
  return { type: VerificationType.AGE };
}

export interface CoreResultMapping {
  success: boolean;
  claims?: VerifiedClaims;
  error?: string;
  status: SessionStatus;
}

export function coreResultToClaims(
  result: VerificationResult,
  request: VerificationRequest,
): CoreResultMapping {
  if (!result.verified) {
    return {
      success: false,
      error: result.rejectionReason ?? "Verification rejected",
      status: "rejected",
    };
  }

  const claims: VerifiedClaims = {};

  if (request.age_over_18 === true && result.ageVerified !== undefined) {
    claims.age_over_18 = result.ageVerified;
  }
  // age_over_21, given_name, family_name, birth_date: not in @openeudi/core 0.8.0 — omitted
  if (request.nationality === true && result.country) {
    claims.nationality = result.country;
  }

  return {
    success: true,
    claims,
    status: "verified",
  };
}
