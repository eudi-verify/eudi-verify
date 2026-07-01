export interface VerifierAuditEntry {
  time: string;
  message: string;
  html: boolean;
}

export function clearVerifierAudit(): void;
export function readVerifierAudit(): VerifierAuditEntry[];
export function pushVerifierAudit(
  message: string,
  html?: boolean,
): VerifierAuditEntry;
export function appendVerifierAuditLi(
  container: HTMLElement,
  logCard: HTMLElement | null,
  message: string,
  html?: boolean,
): void;
export function restoreVerifierAudit(
  container: HTMLElement,
  logCard: HTMLElement | null,
): void;
