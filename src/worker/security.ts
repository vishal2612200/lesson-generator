const FORBIDDEN_TOKENS = [
  'child_process',
  'fs.',
  'process.env',
  'eval(',
  'Function(',
  'require(',
  'import(',
  'fetch(',
]

export interface SecurityCheckResult {
  passed: boolean
  forbiddenTokens: string[]
}

export function scanForForbiddenTokens(code: string): SecurityCheckResult {
  const found: string[] = []

  for (const token of FORBIDDEN_TOKENS) {
    if (code.includes(token)) {
      found.push(token)
    }
  }

  return {
    passed: found.length === 0,
    forbiddenTokens: found,
  }
}

