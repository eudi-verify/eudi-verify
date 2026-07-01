export function inspectLink(
  url: string,
  label?: string,
  options?: {
    method?: string;
    body?: string | object;
    encoding?: "form";
  },
): string;

export function wireInspectLog(container: HTMLElement | null): void;
