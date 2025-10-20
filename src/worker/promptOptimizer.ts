/**
 * Prompt Optimization System
 * Analyzes generation patterns and optimizes prompts for better success rates
 */

export interface GenerationPattern {
  topic: string
  lessonType: 'quiz' | 'one-pager' | 'explanation' | 'rich-content'
  successRate: number
  averageAttempts: number
  commonErrors: string[]
  qualityScore: number
  tokenUsage: number
}

export interface PromptOptimization {
  originalPrompt: string
  optimizedPrompt: string
  improvements: string[]
  expectedImpact: {
    successRate: number
    qualityScore: number
    tokenEfficiency: number
  }
}

/**
 * Analyze generation patterns from traces to identify optimization opportunities
 */
export function analyzeGenerationPatterns(traces: any[]): GenerationPattern[] {
  const patterns = new Map<string, GenerationPattern>()
  
  traces.forEach(trace => {
    const topic = extractTopicFromPrompt(trace.prompt)
    const lessonType = determineLessonTypeFromPrompt(trace.prompt)
    const key = `${topic}-${lessonType}`
    
    if (!patterns.has(key)) {
      patterns.set(key, {
        topic,
        lessonType,
        successRate: 0,
        averageAttempts: 0,
        commonErrors: [],
        qualityScore: 0,
        tokenUsage: 0
      })
    }
    
    const pattern = patterns.get(key)!
    pattern.averageAttempts += trace.attempt_number
    pattern.qualityScore += trace.validation?.score || 0
    pattern.tokenUsage += trace.tokens?.total_tokens || 0
    
    if (!trace.compilation.success) {
      pattern.commonErrors.push(...(trace.compilation.tsc_errors || []))
    }
  })
  
  // Calculate averages and success rates
  patterns.forEach((pattern, key) => {
    const topicTraces = traces.filter(t => 
      extractTopicFromPrompt(t.prompt) === pattern.topic &&
      determineLessonTypeFromPrompt(t.prompt) === pattern.lessonType
    )
    
    pattern.successRate = topicTraces.filter(t => t.compilation.success).length / topicTraces.length
    pattern.averageAttempts = pattern.averageAttempts / topicTraces.length
    pattern.qualityScore = pattern.qualityScore / topicTraces.length
    pattern.tokenUsage = pattern.tokenUsage / topicTraces.length
    
    // Get most common errors
    const errorCounts = new Map<string, number>()
    pattern.commonErrors.forEach(error => {
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
    })
    pattern.commonErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error]) => error)
  })
  
  return Array.from(patterns.values())
}

/**
 * Generate optimized prompts based on analysis
 */
export function optimizePrompts(patterns: GenerationPattern[]): PromptOptimization[] {
  const optimizations: PromptOptimization[] = []
  
  patterns.forEach(pattern => {
    if (pattern.successRate < 0.9 || pattern.qualityScore < 0.8) {
      const optimization = generateOptimization(pattern)
      optimizations.push(optimization)
    }
  })
  
  return optimizations
}

function generateOptimization(pattern: GenerationPattern): PromptOptimization {
  const improvements: string[] = []
  let optimizedPrompt = getBasePrompt(pattern.lessonType)
  
  // Add topic-specific optimizations
  if (pattern.topic.includes('math') || pattern.topic.includes('division') || pattern.topic.includes('multiplication')) {
    optimizedPrompt += getMathSpecificOptimizations()
    improvements.push('Added math-specific examples and step-by-step guidance')
  }
  
  if (pattern.topic.includes('science') || pattern.topic.includes('photosynthesis') || pattern.topic.includes('biology')) {
    optimizedPrompt += getScienceSpecificOptimizations()
    improvements.push('Added science-specific terminology and process explanations')
  }
  
  if (pattern.topic.includes('geography') || pattern.topic.includes('florida') || pattern.topic.includes('world')) {
    optimizedPrompt += getGeographySpecificOptimizations()
    improvements.push('Added geography-specific facts and location-based examples')
  }
  
  // Add error-specific fixes
  if (pattern.commonErrors.some(error => error.includes('Cannot find name'))) {
    optimizedPrompt += getTypeScriptErrorFixes()
    improvements.push('Enhanced TypeScript interface definitions and examples')
  }
  
  if (pattern.commonErrors.some(error => error.includes('placeholder') || error.includes('generic'))) {
    optimizedPrompt += getContentQualityFixes()
    improvements.push('Strengthened content quality requirements and examples')
  }
  
  // Add quality improvements
  if (pattern.qualityScore < 0.8) {
    optimizedPrompt += getQualityImprovements()
    improvements.push('Enhanced educational quality requirements and validation')
  }
  
  return {
    originalPrompt: getBasePrompt(pattern.lessonType),
    optimizedPrompt,
    improvements,
    expectedImpact: {
      successRate: Math.min(0.98, pattern.successRate + 0.1),
      qualityScore: Math.min(0.95, pattern.qualityScore + 0.15),
      tokenEfficiency: Math.max(0.8, 1 - (pattern.tokenUsage / 1000) * 0.1)
    }
  }
}

function getBasePrompt(lessonType: string): string {
  switch (lessonType) {
    case 'quiz':
      return 'You are an expert educational content designer creating high-quality quiz content...'
    case 'one-pager':
      return 'You are an expert educational content designer creating comprehensive one-page guides...'
    case 'explanation':
      return 'You are an expert educational content designer creating detailed explanations...'
    case 'rich-content':
      return 'You are an expert educational content designer creating engaging, interactive lessons...'
    default:
      return 'You are an expert educational content designer...'
  }
}

function getMathSpecificOptimizations(): string {
  return `

MATH-SPECIFIC REQUIREMENTS:
- Always include step-by-step worked examples
- Use clear mathematical notation and formatting
- Provide multiple solution methods when applicable
- Include common mistake patterns and how to avoid them
- Connect abstract concepts to concrete visual representations
- Use real-world applications (cooking, construction, finance, etc.)

EXAMPLE FORMAT:
- Show the problem clearly
- Break down each step with explanations
- Highlight key concepts and formulas
- Provide practice problems with solutions
- Include visual aids (diagrams, charts, number lines)`
}

function getScienceSpecificOptimizations(): string {
  return `

SCIENCE-SPECIFIC REQUIREMENTS:
- Use accurate scientific terminology and definitions
- Include process explanations with cause-and-effect relationships
- Provide real-world examples and applications
- Connect to everyday experiences and observations
- Include safety considerations where applicable
- Use visual diagrams to illustrate complex processes

EXAMPLE FORMAT:
- Define key scientific terms clearly
- Explain the process step-by-step
- Show how it relates to daily life
- Include interesting facts and applications
- Provide visual representations of concepts`
}

function getGeographySpecificOptimizations(): string {
  return `

GEOGRAPHY-SPECIFIC REQUIREMENTS:
- Include accurate geographical facts and statistics
- Connect locations to cultural, economic, and environmental factors
- Use maps, coordinates, and spatial relationships
- Include climate, population, and natural resource information
- Connect to historical events and current events
- Use comparative analysis between different locations

EXAMPLE FORMAT:
- Provide accurate location information
- Include key geographical features
- Connect to human activities and culture
- Use maps and visual representations
- Include interesting facts and comparisons`
}

function getTypeScriptErrorFixes(): string {
  return `

TYPESCRIPT REQUIREMENTS:
- ALWAYS include the complete interface definition at the top
- Use proper TypeScript syntax and types
- Ensure all variables are properly typed
- Use consistent naming conventions
- Include proper export statements
- Test your code structure before finalizing

CRITICAL: The lesson object MUST match the interface exactly:
export interface Lesson {
  id?: string;
  title: string;
  description?: string;
  type: 'quiz' | 'one-pager' | 'explanation' | 'rich-content';
  content: any;
}`
}

function getContentQualityFixes(): string {
  return `

CONTENT QUALITY REQUIREMENTS:
- NO placeholder text, generic examples, or "lorem ipsum"
- Create specific, detailed content for the exact topic requested
- Use real facts, examples, and applications
- Include substantial, meaningful content (minimum word counts)
- Provide educational value beyond basic information
- Use engaging, age-appropriate language

FORBIDDEN PHRASES:
- "This is a fundamental concept..."
- "Understanding [topic] involves..."
- "The main principles include..."
- "Regular practice is essential..."
- Any generic or placeholder language`
}

function getQualityImprovements(): string {
  return `

EDUCATIONAL EXCELLENCE REQUIREMENTS:
- Create content that teaches, not just informs
- Use pedagogical best practices (scaffolding, examples, practice)
- Include multiple learning modalities (visual, textual, interactive)
- Provide clear learning objectives and outcomes
- Use age-appropriate complexity and vocabulary
- Include assessment and reinforcement opportunities

QUALITY INDICATORS:
- Specific, detailed examples
- Clear explanations with reasoning
- Progressive complexity building
- Real-world connections and applications
- Interactive elements and engagement
- Comprehensive coverage of the topic`
}

function extractTopicFromPrompt(prompt: string): string {
  const outlineMatch = prompt.match(/USER'S OUTLINE:\s*(.+?)(?:\n|$)/i)
  if (outlineMatch) {
    return outlineMatch[1].toLowerCase()
  }
  return 'unknown'
}

function determineLessonTypeFromPrompt(prompt: string): 'quiz' | 'one-pager' | 'explanation' | 'rich-content' {
  if (prompt.includes('quiz')) return 'quiz'
  if (prompt.includes('one-pager')) return 'one-pager'
  if (prompt.includes('explanation')) return 'explanation'
  if (prompt.includes('rich-content') || prompt.includes('block-based')) return 'rich-content'
  return 'explanation' // Default to explanation instead of unknown
}

/**
 * Generate topic-specific prompt templates
 */
export function generateTopicSpecificPrompts(): Map<string, string> {
  const templates = new Map<string, string>()
  
  // Math topics
  templates.set('math', getMathSpecificOptimizations())
  templates.set('division', getMathSpecificOptimizations())
  templates.set('multiplication', getMathSpecificOptimizations())
  templates.set('algebra', getMathSpecificOptimizations())
  templates.set('geometry', getMathSpecificOptimizations())
  
  // Science topics
  templates.set('science', getScienceSpecificOptimizations())
  templates.set('photosynthesis', getScienceSpecificOptimizations())
  templates.set('biology', getScienceSpecificOptimizations())
  templates.set('chemistry', getScienceSpecificOptimizations())
  templates.set('physics', getScienceSpecificOptimizations())
  
  // Geography topics
  templates.set('geography', getGeographySpecificOptimizations())
  templates.set('florida', getGeographySpecificOptimizations())
  templates.set('world', getGeographySpecificOptimizations())
  templates.set('countries', getGeographySpecificOptimizations())
  templates.set('states', getGeographySpecificOptimizations())
  
  return templates
}

/**
 * Apply optimizations to the generation system
 */
export function applyPromptOptimizations(optimizations: PromptOptimization[]): void {
  // This would integrate with the actual prompt system
  // For now, we'll log the optimizations
  console.log('Applied prompt optimizations:', optimizations.length)
  optimizations.forEach(opt => {
    console.log(`Optimization for ${opt.improvements.join(', ')}`)
    console.log(`Expected impact: ${opt.expectedImpact.successRate * 100}% success rate`)
  })
}
