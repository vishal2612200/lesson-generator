import { callLLM } from './llm'
import { PRIMARY_PROMPT } from './prompts'
import { LessonPlan } from '@/agents/planner'

/**
 * Create an enhanced prompt for React component generation based on multi-agent plan
 */
export function createReactComponentPrompt(plan: LessonPlan, originalOutline: string): string {
  const planDetails = `
MULTI-AGENT PLANNING RESULTS:
- Lesson Type: ${plan.lessonType}
- Target Audience: ${plan.targetAudience}
- Difficulty Level: ${plan.difficulty}
- Learning Objectives: ${plan.learningObjectives.join(', ')}
- Pedagogical Approach: ${plan.pedagogicalApproach}
- Quality Requirements: ${plan.qualityRequirements.join(', ')}

ORIGINAL REQUEST: ${originalOutline}

Create a React component that implements this plan with:
- Interactive elements appropriate for ${plan.lessonType}
- Content suitable for ${plan.targetAudience}
- Difficulty level: ${plan.difficulty}
- Achieve these learning objectives: ${plan.learningObjectives.join(', ')}
- Follow this pedagogical approach: ${plan.pedagogicalApproach}
- Meet these quality requirements: ${plan.qualityRequirements.join(', ')}
`

  return planDetails
}

/**
 * Generate a React component using the enhanced prompt from multi-agent planning
 */
export async function generateReactComponentFromPlan(enhancedOutline: string, plan: LessonPlan): Promise<string> {
  // Use the PRIMARY_PROMPT but with the enhanced outline
  const prompt = PRIMARY_PROMPT.replace('{{OUTLINE}}', enhancedOutline)
  
  const model = process.env.MODEL_NAME || 'gpt-4o'
  const llmResponse = await callLLM(prompt, model)
  
  // Extract TypeScript code from the response
  const typeScriptSource = extractTypeScriptCode(llmResponse.content)
  
  // Validate component for external imports
  const validation = validateComponent(typeScriptSource)
  if (!validation.isValid) {
    throw new Error(`Component uses external imports: ${validation.errors.join(', ')}`)
  }
  
  // Sanitize the component
  const sanitizedSource = sanitizeComponent(typeScriptSource)
  
  return sanitizedSource
}

/**
 * Extract TypeScript code from LLM response
 */
function extractTypeScriptCode(response: string): string {
  // Extract fenced code blocks with proper regex
  const codeBlockRegex = /```(?:typescript|tsx|ts)?\n([\s\S]*?)\n```/g
  const matches = Array.from(response.matchAll(codeBlockRegex))
  
  if (matches.length > 0) {
    // Get the last (most likely to be complete) code block
    const lastMatch = matches[matches.length - 1]
    return lastMatch[1].trim()
  }
  
  // Fallback: return raw content
  return response.trim()
}

/**
 * Validate that component doesn't use external imports
 */
function validateComponent(source: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check for external imports
  const externalImports = source.match(/import\s+.*?from\s+['"](?!react)[^'"]*['"]/g)
  if (externalImports) {
    errors.push(`External imports detected: ${externalImports.join(', ')}`)
  }
  
  // Check for require statements
  const requireStatements = source.match(/require\s*\([^)]*\)/g)
  if (requireStatements) {
    errors.push(`Require statements detected: ${requireStatements.join(', ')}`)
  }
  
  // Check for dynamic imports
  const dynamicImports = source.match(/import\s*\([^)]*\)/g)
  if (dynamicImports) {
    errors.push(`Dynamic imports detected: ${dynamicImports.join(', ')}`)
  }
  
  // Check for common external library usage patterns
  const externalLibraryPatterns = [
    /recharts/i,
    /d3/i,
    /lodash/i,
    /moment/i,
    /dayjs/i,
    /chart\.js/i,
    /framer-motion/i,
    /styled-components/i,
    /emotion/i,
    /antd/i,
    /mui/i,
    /chakra/i
  ]
  
  for (const pattern of externalLibraryPatterns) {
    if (pattern.test(source)) {
      errors.push(`External library usage detected: ${pattern.source}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize generated component to avoid common TSX pitfalls
 */
function sanitizeComponent(source: string): string {
  let out = source
  
  // Remove markdown fences if any leaked
  out = out.replace(/```[\s\S]*?```/g, (m) => {
    const inner = m.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '')
    return inner
  })

  // Remove ALL non-React imports aggressively
  // Side-effect imports like: import 'tailwindcss/tailwind.css'
  out = out.replace(/import\s+['"][^'"]*['"];?\s*/g, (m) => {
    return /import\s+['"]react['"];?/.test(m) ? m : ''
  })
  
  // Remove external library imports (but keep React)
  out = out.replace(/import\s+.*?from\s+['"](?!react)[^'"]*['"];?\s*/g, '')
  
  // Remove any remaining import statements that might have been missed
  out = out.replace(/import\s+.*?;?\s*/g, '')
  
  // Remove any require statements
  out = out.replace(/require\s*\([^)]*\)\s*/g, '')
  
  // Remove any dynamic imports
  out = out.replace(/import\s*\([^)]*\)\s*/g, '')

  // Replace className={`...`} with className="..." when no interpolation
  out = out.replace(/className=\{`([^`$}]*)`\}/g, 'className="$1"')

  // For any className with interpolation, fall back to a safe static class
  out = out.replace(/className=\{`[\s\S]*?`\}/g, 'className="lesson-section"')

  // Replace any remaining backticks in JSX attributes with quotes
  out = out.replace(/=\s*`([^`]*?)`/g, '="$1"')

  // Strip ambient module declarations that break app TS
  out = out.replace(/declare\s+module\s+[^\n]+\n?/g, '')

  // Normalize stray $ tokens inside JSX attribute contexts
  out = out.replace(/className=\{\$[^}]*\}/g, 'className="lesson-section"')

  return out
}
