/**
 * Enhanced Error Handling and User Feedback System
 * Provides clear, actionable error messages and recovery suggestions
 */

export interface ErrorContext {
  lessonId: string
  attemptNumber: number
  errorType: 'compilation' | 'validation' | 'generation' | 'timeout' | 'security'
  errorDetails: any
  userOutline: string
  lessonType: string
}

export interface UserFriendlyError {
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestions: string[]
  canRetry: boolean
  estimatedFixTime: string
  technicalDetails?: string
}

/**
 * Convert technical errors into user-friendly messages
 */
export function createUserFriendlyError(context: ErrorContext): UserFriendlyError {
  switch (context.errorType) {
    case 'compilation':
      return handleCompilationError(context)
    case 'validation':
      return handleValidationError(context)
    case 'generation':
      return handleGenerationError(context)
    case 'timeout':
      return handleTimeoutError(context)
    case 'security':
      return handleSecurityError(context)
    default:
      return createGenericError(context)
  }
}

function handleCompilationError(context: ErrorContext): UserFriendlyError {
  const errors = context.errorDetails.tsc_errors || []
  const hasTypeErrors = errors.some((e: string) => e.includes('Cannot find name') || e.includes('Type'))
  const hasSyntaxErrors = errors.some((e: string) => e.includes('syntax') || e.includes('unexpected'))
  
  if (hasTypeErrors) {
    return {
      title: 'Content Structure Issue',
      message: 'The lesson content needs some adjustments to work properly. This usually happens when the content structure doesn\'t match our expected format.',
      severity: 'medium',
      suggestions: [
        'Try rephrasing your lesson outline to be more specific',
        'Break down complex topics into simpler parts',
        'Use clear, direct language in your outline'
      ],
      canRetry: true,
      estimatedFixTime: '1-2 minutes',
      technicalDetails: `TypeScript errors: ${errors.slice(0, 3).join('; ')}`
    }
  }
  
  if (hasSyntaxErrors) {
    return {
      title: 'Content Format Issue',
      message: 'There\'s a formatting problem with the generated content. This is usually a temporary issue that can be resolved quickly.',
      severity: 'low',
      suggestions: [
        'Try generating the lesson again',
        'Simplify your lesson outline slightly',
        'Check that your outline is clear and well-formed'
      ],
      canRetry: true,
      estimatedFixTime: '30 seconds',
      technicalDetails: `Syntax errors: ${errors.slice(0, 2).join('; ')}`
    }
  }
  
  return {
    title: 'Content Generation Issue',
    message: 'We encountered a technical issue while creating your lesson. This is usually resolved by trying again.',
    severity: 'medium',
    suggestions: [
      'Try generating the lesson again',
      'Consider breaking your topic into smaller parts',
      'Contact support if the issue persists'
    ],
    canRetry: true,
    estimatedFixTime: '1-2 minutes',
    technicalDetails: `Compilation errors: ${errors.slice(0, 3).join('; ')}`
  }
}

function handleValidationError(context: ErrorContext): UserFriendlyError {
  const validation = context.errorDetails.validation
  const score = validation?.score || 0
  const issues = validation?.issues || []
  
  if (score < 0.5) {
    return {
      title: 'Content Quality Needs Improvement',
      message: 'The generated lesson doesn\'t meet our quality standards yet. We\'re working to improve it automatically.',
      severity: 'medium',
      suggestions: [
        'Try being more specific in your lesson outline',
        'Include more details about what you want to teach',
        'Consider breaking complex topics into smaller lessons'
      ],
      canRetry: true,
      estimatedFixTime: '2-3 minutes',
      technicalDetails: `Quality score: ${(score * 100).toFixed(1)}%. Issues: ${issues.slice(0, 2).join('; ')}`
    }
  }
  
  if (issues.some((issue: string) => issue.includes('placeholder') || issue.includes('generic'))) {
    return {
      title: 'Content Needs More Specificity',
      message: 'The lesson content is too generic. We\'re generating more specific, detailed content for your topic.',
      severity: 'low',
      suggestions: [
        'Your outline is good - we\'re just making it more specific',
        'Try adding more details to your outline for even better results',
        'Consider including specific examples or applications'
      ],
      canRetry: true,
      estimatedFixTime: '1-2 minutes',
      technicalDetails: `Generic content detected. Quality score: ${(score * 100).toFixed(1)}%`
    }
  }
  
  return {
    title: 'Refining Lesson Content',
    message: 'We\'re improving the lesson content to make it more educational and engaging.',
    severity: 'low',
    suggestions: [
      'This is normal - we\'re making your lesson even better',
      'The final version will be more comprehensive',
      'Consider adding more context to your outline for best results'
    ],
    canRetry: true,
    estimatedFixTime: '1-2 minutes',
    technicalDetails: `Quality improvements needed. Score: ${(score * 100).toFixed(1)}%`
  }
}

function handleGenerationError(context: ErrorContext): UserFriendlyError {
  return {
    title: 'Content Generation Issue',
    message: 'We\'re having trouble generating content for your lesson. This might be due to the complexity or specificity of your request.',
    severity: 'high',
    suggestions: [
      'Try simplifying your lesson outline',
      'Break complex topics into smaller, more focused lessons',
      'Use more specific, direct language in your outline',
      'Consider rephrasing your request'
    ],
    canRetry: true,
    estimatedFixTime: '2-5 minutes',
    technicalDetails: `Generation failed after ${context.attemptNumber} attempts`
  }
}

function handleTimeoutError(context: ErrorContext): UserFriendlyError {
  return {
    title: 'Generation Taking Longer Than Expected',
    message: 'Your lesson is taking longer to generate than usual. This can happen with complex topics or during high usage periods.',
    severity: 'medium',
    suggestions: [
      'Please wait a bit longer - we\'re still working on it',
      'Try refreshing the page to check the latest status',
      'Consider simplifying your outline if you need faster results',
      'Contact support if it\'s been more than 10 minutes'
    ],
    canRetry: true,
    estimatedFixTime: '3-5 minutes',
    technicalDetails: `Timeout after ${context.attemptNumber} attempts`
  }
}

function handleSecurityError(context: ErrorContext): UserFriendlyError {
  return {
    title: 'Content Security Check',
    message: 'We\'re reviewing the generated content to ensure it\'s safe and appropriate. This is a normal security process.',
    severity: 'low',
    suggestions: [
      'This is a normal security check - please wait',
      'Your lesson will be available shortly',
      'Contact support if you have concerns about the content'
    ],
    canRetry: false,
    estimatedFixTime: '1-2 minutes',
    technicalDetails: 'Security scan in progress'
  }
}

function createGenericError(context: ErrorContext): UserFriendlyError {
  return {
    title: 'Unexpected Issue',
    message: 'We encountered an unexpected issue while creating your lesson. Our team has been notified.',
    severity: 'high',
    suggestions: [
      'Try generating the lesson again',
      'Contact support if the issue persists',
      'Consider trying a different lesson outline'
    ],
    canRetry: true,
    estimatedFixTime: '2-5 minutes',
    technicalDetails: `Unknown error type: ${context.errorType}`
  }
}

/**
 * Generate recovery suggestions based on error patterns
 */
export function generateRecoverySuggestions(context: ErrorContext): string[] {
  const suggestions: string[] = []
  
  // Topic-specific suggestions
  if (context.userOutline.toLowerCase().includes('quiz')) {
    suggestions.push('For quizzes, try being specific about the number of questions and difficulty level')
    suggestions.push('Example: "A 10-question quiz on basic multiplication facts"')
  }
  
  if (context.userOutline.toLowerCase().includes('explanation')) {
    suggestions.push('For explanations, try including what specific aspect you want explained')
    suggestions.push('Example: "Explain how photosynthesis works, including the light and dark reactions"')
  }
  
  if (context.userOutline.toLowerCase().includes('one-pager')) {
    suggestions.push('For one-pagers, try specifying what key points should be covered')
    suggestions.push('Example: "A one-pager on the water cycle, including evaporation, condensation, and precipitation"')
  }
  
  // Complexity-based suggestions
  if (context.userOutline.length > 200) {
    suggestions.push('Try breaking your outline into smaller, more focused topics')
    suggestions.push('Complex topics work better when split into multiple lessons')
  }
  
  if (context.userOutline.length < 20) {
    suggestions.push('Try adding more details to your lesson outline')
    suggestions.push('More specific outlines generate better, more detailed content')
  }
  
  // Common improvement suggestions
  suggestions.push('Use clear, direct language in your outline')
  suggestions.push('Include specific examples or applications when possible')
  suggestions.push('Consider the age level and complexity appropriate for your audience')
  
  return suggestions.slice(0, 5) // Limit to 5 suggestions
}

/**
 * Create error recovery actions
 */
export function createErrorRecoveryActions(context: ErrorContext): Array<{
  action: string
  description: string
  automated: boolean
}> {
  const actions = []
  
  if (context.errorType === 'compilation') {
    actions.push({
      action: 'retry_with_simplified_prompt',
      description: 'Retry generation with a simplified, more focused prompt',
      automated: true
    })
    actions.push({
      action: 'adjust_content_structure',
      description: 'Modify the content structure to match expected format',
      automated: true
    })
  }
  
  if (context.errorType === 'validation') {
    actions.push({
      action: 'enhance_content_quality',
      description: 'Improve content specificity and educational value',
      automated: true
    })
    actions.push({
      action: 'add_more_examples',
      description: 'Include more specific examples and applications',
      automated: true
    })
  }
  
  if (context.errorType === 'timeout') {
    actions.push({
      action: 'increase_timeout_limit',
      description: 'Allow more time for complex content generation',
      automated: true
    })
    actions.push({
      action: 'simplify_generation_approach',
      description: 'Use a simpler generation approach for faster results',
      automated: true
    })
  }
  
  // Always include manual retry option
  actions.push({
    action: 'manual_retry',
    description: 'Allow user to manually retry the generation',
    automated: false
  })
  
  return actions
}

/**
 * Log error for analysis and improvement
 */
export function logErrorForAnalysis(context: ErrorContext, userFriendlyError: UserFriendlyError): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    lessonId: context.lessonId,
    errorType: context.errorType,
    severity: userFriendlyError.severity,
    userOutline: context.userOutline,
    lessonType: context.lessonType,
    attemptNumber: context.attemptNumber,
    errorDetails: context.errorDetails,
    userFriendlyMessage: userFriendlyError.message,
    suggestions: userFriendlyError.suggestions,
    canRetry: userFriendlyError.canRetry
  }
  
  // In a real system, this would be sent to a logging service
  console.log('Error logged for analysis:', errorLog)
}

/**
 * Get error statistics for monitoring
 */
export function getErrorStatistics(errors: Array<{ errorType: string; severity: string; timestamp: string }>): {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsBySeverity: Record<string, number>
  recentTrend: 'increasing' | 'decreasing' | 'stable'
  topErrorTypes: Array<{ type: string; count: number; percentage: number }>
} {
  const totalErrors = errors.length
  const errorsByType: Record<string, number> = {}
  const errorsBySeverity: Record<string, number> = {}
  
  errors.forEach(error => {
    errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1
    errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1
  })
  
  // Calculate recent trend (last 24 hours vs previous 24 hours)
  const now = new Date()
  const last24h = errors.filter(e => new Date(e.timestamp) > new Date(now.getTime() - 24 * 60 * 60 * 1000))
  const previous24h = errors.filter(e => {
    const timestamp = new Date(e.timestamp)
    return timestamp > new Date(now.getTime() - 48 * 60 * 60 * 1000) && 
           timestamp <= new Date(now.getTime() - 24 * 60 * 60 * 1000)
  })
  
  let recentTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (last24h.length > previous24h.length * 1.2) recentTrend = 'increasing'
  else if (last24h.length < previous24h.length * 0.8) recentTrend = 'decreasing'
  
  const topErrorTypes = Object.entries(errorsByType)
    .map(([type, count]) => ({
      type,
      count,
      percentage: (count / totalErrors) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
  return {
    totalErrors,
    errorsByType,
    errorsBySeverity,
    recentTrend,
    topErrorTypes
  }
}
