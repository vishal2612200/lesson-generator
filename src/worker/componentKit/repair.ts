export type RepairContext = {
  errors: string[];
  evaluationReasons?: string[];
};

// Minimal heuristic repair: if missing React import due to jsx runtime, add pragma; if missing symbol, replace with literal.
export function attemptRepair(tsxSource: string, ctx: RepairContext): string {
  let src = tsxSource;

  // Add explicit React import if none and common JSX compile errors present
  const jsxError = ctx.errors.some(e => e.toLowerCase().includes("jsx") || e.toLowerCase().includes("cannot find name 'div'"));
  const hasReactImport = /from\s+['"]react['"]/.test(src) || /import\s+React/.test(src);
  if (jsxError && !hasReactImport) {
    src = `import React from 'react';\n` + src;
  }

  // Replace obvious missing identifiers with empty strings
  for (const err of ctx.errors) {
    const match = err.match(/Cannot find name '([A-Za-z0-9_]+)'/);
    if (match && match[1] && match[1] !== "React") {
      const name = match[1];
      // Replace within JSX expression braces
      const braceExpr = new RegExp(`{\\s*${name}\\s*}`, 'g');
      src = src.replace(braceExpr, '{""}');
      // Replace in JSX runtime form: children: name
      const childrenRuntime = new RegExp(`children:\\s*${name}(?=\\s*[,}])`, 'g');
      src = src.replace(childrenRuntime, 'children: ""');
    }
  }

  return src;
}


