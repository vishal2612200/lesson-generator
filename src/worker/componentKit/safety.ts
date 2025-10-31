// Static safety checks to prevent side effects and unsafe APIs in generated TSX
// Uses AST-based analysis for accurate detection

import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

export type SafetyIssue = {
  rule: string;
  message: string;
  lineHint?: string;
};

export function checkSafety(tsxSource: string): SafetyIssue[] {
  const issues: SafetyIssue[] = [];

  try {
    const ast = parse(tsxSource, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      CallExpression(path: NodePath<t.CallExpression>) {
        if (t.isIdentifier(path.node.callee)) {
          const name = path.node.callee.name;

          if (name === 'fetch') {
            issues.push({
              rule: 'network-fetch',
              message: 'Network calls are not allowed',
              lineHint: getLineHint(path),
            });
          } else if (name === 'eval') {
            issues.push({
              rule: 'eval',
              message: 'eval is forbidden',
              lineHint: getLineHint(path),
            });
          } else if (['setTimeout', 'setInterval', 'setImmediate'].includes(name)) {
            issues.push({
              rule: 'timers',
              message: 'Timers are not allowed',
              lineHint: getLineHint(path),
            });
          }
        } else if (t.isMemberExpression(path.node.callee)) {
          // Check for localStorage.getItem, sessionStorage.setItem, etc.
          const obj = path.node.callee.object;
          if (t.isIdentifier(obj)) {
            if (['localStorage', 'sessionStorage'].includes(obj.name)) {
              issues.push({
                rule: 'global-side-effects',
                message: 'Storage side effects are not allowed',
                lineHint: getLineHint(path),
              });
            }
          }
        }
      },

      MemberExpression(path: NodePath<t.MemberExpression>) {
        if (t.isIdentifier(path.node.object)) {
          const objName = path.node.object.name;
          if (objName === 'document' || objName === 'window') {
            issues.push({
              rule: objName === 'document' ? 'document-access' : 'window-access',
              message: objName === 'document'
                ? 'Direct DOM access is not allowed'
                : 'Window access is not allowed',
              lineHint: getLineHint(path),
            });
          }
        }
      },
    });
  } catch (e) {
    // Fallback to regex if AST parsing fails
    return checkSafetyRegex(tsxSource);
  }

  return issues;
}

function getLineHint(path: NodePath<any>): string {
  const loc = path.node.loc;
  if (loc) {
    return `Line ${loc.start.line}`;
  }
  return '';
}

function checkSafetyRegex(tsxSource: string): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const lines = tsxSource.split(/\r?\n/);
  const forbiddenPatterns: { rule: string; pattern: RegExp; message: string }[] = [
    { rule: "network-fetch", pattern: /\bfetch\s*\(/, message: "Network calls are not allowed" },
    { rule: "timers", pattern: /\bset(Time|Interval|Timeout)\s*\(/, message: "Timers are not allowed" },
    { rule: "eval", pattern: /\beval\s*\(/, message: "eval is forbidden" },
    { rule: "document-access", pattern: /\bdocument\b/, message: "Direct DOM access is not allowed" },
    { rule: "window-access", pattern: /\bwindow\b/, message: "Window access is not allowed" },
    { rule: "global-side-effects", pattern: /\b(localStorage|sessionStorage)\b/, message: "Storage side effects are not allowed" },
  ];

  for (const { rule, pattern, message } of forbiddenPatterns) {
    for (const line of lines) {
      if (pattern.test(line)) {
        issues.push({ rule, message, lineHint: line.trim().slice(0, 200) });
        break;
      }
    }
  }
  return issues;
}



