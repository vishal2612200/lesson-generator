// Simple static safety checks to prevent side effects and unsafe APIs in generated TSX

export type SafetyIssue = {
  rule: string;
  message: string;
  lineHint?: string;
};

const forbiddenSnippets: { rule: string; pattern: RegExp; message: string }[] = [
  { rule: "network-fetch", pattern: /\bfetch\s*\(/, message: "Network calls are not allowed" },
  { rule: "timers", pattern: /\bset(Time|Interval|Timeout)\s*\(/, message: "Timers are not allowed" },
  { rule: "eval", pattern: /\beval\s*\(/, message: "eval is forbidden" },
  { rule: "document-access", pattern: /\bdocument\b/, message: "Direct DOM access is not allowed" },
  { rule: "window-access", pattern: /\bwindow\b/, message: "Window access is not allowed" },
  { rule: "global-side-effects", pattern: /\b(localStorage|sessionStorage)\b/, message: "Storage side effects are not allowed" },
];

export function checkSafety(tsxSource: string): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const lines = tsxSource.split(/\r?\n/);
  for (const { rule, pattern, message } of forbiddenSnippets) {
    for (const line of lines) {
      if (pattern.test(line)) {
        issues.push({ rule, message, lineHint: line.trim().slice(0, 200) });
        break;
      }
    }
  }
  return issues;
}



