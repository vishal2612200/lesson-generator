type ErrorInput = unknown

export function createUserFriendlyError(error: ErrorInput): string {
  const message = error instanceof Error ? error.message : String(error)
  return message || 'An unexpected error occurred.'
}

export function generateRecoverySuggestions(error: ErrorInput): string[] {
  const base = 'Retry the operation after a few seconds.'
  return [base]
}

export function createErrorRecoveryActions(error: ErrorInput): { action: string; description: string }[] {
  return [
    { action: 'retry', description: 'Retry the last operation' },
  ]
}

export function logErrorForAnalysis(context: string, error: ErrorInput): { context: string; message: string } {
  const message = error instanceof Error ? error.message : String(error)
  return { context, message }
}

let errorCount = 0
export function getErrorStatistics() {
  return { totalErrors: errorCount }
}
