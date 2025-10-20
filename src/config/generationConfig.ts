/**
 * Configuration for hybrid generation approach
 * Determines when to use single-agent vs multi-agent
 */

export type QualityTier = 'basic' | 'standard' | 'premium'
export type GenerationStrategy = 'single' | 'multi'
export type EnvGenerationMode = 'auto' | 'single' | 'multi'

export interface GenerationConfig {
  defaultStrategy: GenerationStrategy
  qualityTier: QualityTier
  complexityThreshold: number // 0-100
  forceMultiAgent: boolean
  enableHybridRouting: boolean
}

export const DEFAULT_CONFIG: GenerationConfig = {
  defaultStrategy: 'single',
  qualityTier: 'standard',
  complexityThreshold: 70,
  forceMultiAgent: false,
  enableHybridRouting: true
}

/**
 * Analyze outline complexity
 * Returns score from 0-100
 */
export function analyzeComplexity(outline: string): number {
  let score = 0
  
  // Length-based complexity (longer = more complex)
  const words = outline.split(/\s+/).length
  if (words > 100) score += 20
  else if (words > 50) score += 10
  else if (words > 20) score += 5
  
  // Technical terms suggest complexity
  const technicalTerms = [
    'algorithm', 'quantum', 'molecular', 'theorem', 'calculus',
    'differential', 'integral', 'programming', 'architecture',
    'philosophy', 'epistemology', 'ontology', 'synthesis'
  ]
  const technicalCount = technicalTerms.filter(term => 
    outline.toLowerCase().includes(term)
  ).length
  score += Math.min(technicalCount * 10, 30)
  
  // Multiple topics suggest complexity
  const topicIndicators = [
    'and', 'including', 'covering', 'with', 'also',
    'furthermore', 'additionally', 'along with'
  ]
  const topicCount = topicIndicators.filter(indicator =>
    outline.toLowerCase().includes(indicator)
  ).length
  score += Math.min(topicCount * 5, 20)
  
  // Specific requirements suggest complexity
  const requirementIndicators = [
    'must', 'should', 'need', 'require', 'ensure',
    'specific', 'detailed', 'comprehensive', 'in-depth'
  ]
  const requirementCount = requirementIndicators.filter(indicator =>
    outline.toLowerCase().includes(indicator)
  ).length
  score += Math.min(requirementCount * 5, 15)
  
  // Advanced education level suggests complexity
  const advancedLevelIndicators = [
    'college', 'university', 'graduate', 'phd', 'masters',
    'advanced', 'expert', 'professional'
  ]
  const hasAdvancedLevel = advancedLevelIndicators.some(indicator =>
    outline.toLowerCase().includes(indicator)
  )
  if (hasAdvancedLevel) score += 15
  
  return Math.min(score, 100)
}

/**
 * Determine which generation strategy to use
 */
export function determineStrategy(
  outline: string,
  config: GenerationConfig = DEFAULT_CONFIG
): GenerationStrategy {
  // Force multi-agent if explicitly set
  if (config.forceMultiAgent) {
    return 'multi'
  }
  
  // If hybrid routing is disabled, use default
  if (!config.enableHybridRouting) {
    return config.defaultStrategy
  }
  
  // Premium tier always gets multi-agent
  if (config.qualityTier === 'premium') {
    return 'multi'
  }
  
  // Analyze complexity
  const complexity = analyzeComplexity(outline)
  
  // Use multi-agent for complex topics
  if (complexity >= config.complexityThreshold) {
    return 'multi'
  }
  
  // Standard tier with medium complexity gets multi-agent
  if (config.qualityTier === 'standard' && complexity >= 50) {
    return 'multi'
  }
  
  // Default to single-agent
  return 'single'
}

/**
 * Get configuration for a specific lesson
 * In production, this would check user tier, lesson type, etc.
 */
export async function getLessonConfig(
  lessonId: string
): Promise<GenerationConfig> {
  // TODO: Fetch from database based on user tier, lesson requirements, etc.
  // For now, environment variables control routing behavior

  // Primary routing mode:
  // GENERATION_STRATEGY=auto|single|multi (default: auto)
  const envMode = (process.env.GENERATION_STRATEGY as EnvGenerationMode) || 'auto'

  // Back-compat support (deprecated): DEFAULT_GENERATION_STRATEGY=single|multi
  const legacyDefault = process.env.DEFAULT_GENERATION_STRATEGY as GenerationStrategy | undefined

  // Optional hard override
  const forceMultiAgent = String(process.env.FORCE_MULTI_AGENT || '').toLowerCase() === 'true'

  // Quality tier (affects routing heuristics)
  const qualityTier = (process.env.QUALITY_TIER as QualityTier) || DEFAULT_CONFIG.qualityTier

  // Threshold tuning
  const thresholdFromEnv = Number(process.env.COMPLEXITY_THRESHOLD)
  const complexityThreshold = Number.isFinite(thresholdFromEnv) && thresholdFromEnv >= 0 && thresholdFromEnv <= 100
    ? thresholdFromEnv
    : DEFAULT_CONFIG.complexityThreshold

  // Enable/disable hybrid routing
  // If GENERATION_STRATEGY is auto → hybrid on; otherwise off
  const enableHybridRouting = envMode === 'auto'
    ? (process.env.ENABLE_HYBRID_ROUTING !== 'false') // allow explicit off
    : false

  // Default strategy when hybrid is off
  const defaultStrategy: GenerationStrategy = envMode === 'single'
    ? 'single'
    : envMode === 'multi'
    ? 'multi'
    : (legacyDefault || DEFAULT_CONFIG.defaultStrategy)

  return {
    defaultStrategy,
    qualityTier,
    complexityThreshold,
    forceMultiAgent,
    enableHybridRouting
  }
}

/**
 * Log routing decision for analytics
 */
export function logRoutingDecision(
  lessonId: string,
  outline: string,
  strategy: GenerationStrategy,
  complexity: number,
  config: GenerationConfig
): void {
  console.log('Generation routing decision:', {
    lessonId,
    strategy,
    complexity,
    qualityTier: config.qualityTier,
    threshold: config.complexityThreshold,
    reason: getRoutingReason(strategy, complexity, config)
  })
}

function getRoutingReason(
  strategy: GenerationStrategy,
  complexity: number,
  config: GenerationConfig
): string {
  if (config.forceMultiAgent) {
    return 'Forced multi-agent by configuration'
  }
  
  if (config.qualityTier === 'premium') {
    return 'Premium quality tier'
  }
  
  if (strategy === 'multi' && complexity >= config.complexityThreshold) {
    return `High complexity (${complexity} >= ${config.complexityThreshold})`
  }
  
  if (strategy === 'multi' && config.qualityTier === 'standard') {
    return 'Standard tier with medium-high complexity'
  }
  
  return 'Default routing to single-agent'
}

