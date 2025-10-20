/**
 * Content Enhancement Pipeline
 * Automatically improves lesson content quality through multiple enhancement stages
 */

import { callLLM } from './llm'
import { ENHANCED_PRIMARY_PROMPT, QUALITY_ENHANCEMENT_PROMPT, getSubjectSpecificPrompt } from './enhancedPrompts'
import { AdvancedQualityScorer } from './advancedQualityScorer'

export interface EnhancementStage {
  name: string
  description: string
  weight: number
  enabled: boolean
}

export interface EnhancementResult {
  originalCode: string
  enhancedCode: string
  qualityImprovement: number
  stagesApplied: string[]
  metrics: {
    before: any
    after: any
  }
  recommendations: string[]
}

export class ContentEnhancer {
  private qualityScorer = new AdvancedQualityScorer()
  
  private enhancementStages: EnhancementStage[] = [
    {
      name: 'Educational Excellence',
      description: 'Improve pedagogical soundness and learning effectiveness',
      weight: 0.4,
      enabled: true
    },
    {
      name: 'Engagement Boost',
      description: 'Enhance interactivity and user engagement',
      weight: 0.25,
      enabled: true
    },
    {
      name: 'Visual Polish',
      description: 'Improve visual design and user experience',
      weight: 0.2,
      enabled: true
    },
    {
      name: 'Technical Optimization',
      description: 'Optimize code quality and performance',
      weight: 0.15,
      enabled: true
    }
  ]

  async enhanceContent(
    originalCode: string, 
    topic: string, 
    targetAge: string = '3-5'
  ): Promise<EnhancementResult> {
    console.log('[ContentEnhancer] Starting content enhancement...')
    
    // Initial quality assessment
    const initialQuality = await this.qualityScorer.scoreComponent(originalCode, topic, targetAge)
    console.log('[ContentEnhancer] Initial quality score:', initialQuality.overallScore)
    
    let enhancedCode = originalCode
    const stagesApplied: string[] = []
    const recommendations: string[] = []
    
    // Apply enhancement stages
    for (const stage of this.enhancementStages) {
      if (!stage.enabled) continue
      
      console.log(`[ContentEnhancer] Applying stage: ${stage.name}`)
      
      try {
        const stageResult = await this.applyEnhancementStage(
          enhancedCode, 
          topic, 
          targetAge, 
          stage
        )
        
        if (stageResult.improved) {
          enhancedCode = stageResult.code
          stagesApplied.push(stage.name)
          recommendations.push(...stageResult.recommendations)
          console.log(`[ContentEnhancer] ✅ ${stage.name} applied successfully`)
        } else {
          console.log(`[ContentEnhancer] ⏭️ ${stage.name} skipped (no improvement needed)`)
        }
      } catch (error) {
        console.error(`[ContentEnhancer] ❌ Error in ${stage.name}:`, error)
      }
    }
    
    // Final quality assessment
    const finalQuality = await this.qualityScorer.scoreComponent(enhancedCode, topic, targetAge)
    const qualityImprovement = finalQuality.overallScore - initialQuality.overallScore
    
    console.log('[ContentEnhancer] Enhancement complete:', {
      initialScore: initialQuality.overallScore,
      finalScore: finalQuality.overallScore,
      improvement: qualityImprovement,
      stagesApplied: stagesApplied.length
    })
    
    return {
      originalCode,
      enhancedCode,
      qualityImprovement,
      stagesApplied,
      metrics: {
        before: initialQuality,
        after: finalQuality
      },
      recommendations
    }
  }

  private async applyEnhancementStage(
    code: string, 
    topic: string, 
    targetAge: string, 
    stage: EnhancementStage
  ): Promise<{
    improved: boolean
    code: string
    recommendations: string[]
  }> {
    const recommendations: string[] = []
    
    switch (stage.name) {
      case 'Educational Excellence':
        return await this.enhanceEducationalExcellence(code, topic, targetAge)
      
      case 'Engagement Boost':
        return await this.enhanceEngagement(code, topic, targetAge)
      
      case 'Visual Polish':
        return await this.enhanceVisualDesign(code, topic, targetAge)
      
      case 'Technical Optimization':
        return await this.enhanceTechnicalQuality(code, topic, targetAge)
      
      default:
        return { improved: false, code, recommendations }
    }
  }

  private async enhanceEducationalExcellence(
    code: string, 
    topic: string, 
    targetAge: string
  ): Promise<{ improved: boolean; code: string; recommendations: string[] }> {
    const recommendations: string[] = []
    
    // Check if educational enhancements are needed
    const hasLearningObjectives = code.includes('learning') && code.includes('objective')
    const hasAssessment = code.includes('quiz') || code.includes('test') || code.includes('check')
    const hasExamples = code.includes('example') || code.includes('demonstration')
    
    if (hasLearningObjectives && hasAssessment && hasExamples) {
      return { improved: false, code, recommendations }
    }
    
    // Apply educational enhancements
    const subjectSpecificPrompt = getSubjectSpecificPrompt(topic)
    const enhancementPrompt = `
${QUALITY_ENHANCEMENT_PROMPT.replace('{{COMPONENT}}', code)}

## EDUCATIONAL EXCELLENCE FOCUS:
- Add clear learning objectives if missing
- Include formative assessment opportunities
- Add more examples and demonstrations
- Improve pedagogical structure
- Enhance content accuracy and depth

${subjectSpecificPrompt}

## TARGET AUDIENCE: ${targetAge} grade students

Focus specifically on educational effectiveness and learning outcomes.
`

    try {
      const response = await callLLM(enhancementPrompt, 'gpt-4o')
      const enhancedCode = this.extractCodeFromResponse(response.content)
      
      if (enhancedCode && enhancedCode !== code) {
        recommendations.push('Added clear learning objectives')
        recommendations.push('Enhanced pedagogical structure')
        recommendations.push('Improved content depth and accuracy')
        return { improved: true, code: enhancedCode, recommendations }
      }
    } catch (error) {
      console.error('[ContentEnhancer] Error in educational enhancement:', error)
    }
    
    return { improved: false, code, recommendations }
  }

  private async enhanceEngagement(
    code: string, 
    topic: string, 
    targetAge: string
  ): Promise<{ improved: boolean; code: string; recommendations: string[] }> {
    const recommendations: string[] = []
    
    // Check current engagement level
    const interactiveElements = ['onClick', 'onChange', 'useState', 'button', 'input']
    const foundElements = interactiveElements.filter(element => code.includes(element)).length
    
    if (foundElements >= 4) {
      return { improved: false, code, recommendations }
    }
    
    // Apply engagement enhancements
    const enhancementPrompt = `
${QUALITY_ENHANCEMENT_PROMPT.replace('{{COMPONENT}}', code)}

## ENGAGEMENT ENHANCEMENT FOCUS:
- Add more interactive elements (buttons, inputs, toggles)
- Include progress tracking and feedback
- Add gamification elements (scores, achievements, levels)
- Improve user motivation and engagement
- Add immediate feedback mechanisms

## TARGET AUDIENCE: ${targetAge} grade students

Focus specifically on making the content more engaging and interactive.
`

    try {
      const response = await callLLM(enhancementPrompt, 'gpt-4o')
      const enhancedCode = this.extractCodeFromResponse(response.content)
      
      if (enhancedCode && enhancedCode !== code) {
        recommendations.push('Added interactive elements')
        recommendations.push('Enhanced user engagement')
        recommendations.push('Improved feedback mechanisms')
        return { improved: true, code: enhancedCode, recommendations }
      }
    } catch (error) {
      console.error('[ContentEnhancer] Error in engagement enhancement:', error)
    }
    
    return { improved: false, code, recommendations }
  }

  private async enhanceVisualDesign(
    code: string, 
    topic: string, 
    targetAge: string
  ): Promise<{ improved: boolean; code: string; recommendations: string[] }> {
    const recommendations: string[] = []
    
    // Check current visual design
    const visualElements = ['gradient', 'rounded', 'shadow', 'color', 'svg', 'icon']
    const foundElements = visualElements.filter(element => code.includes(element)).length
    
    if (foundElements >= 4) {
      return { improved: false, code, recommendations }
    }
    
    // Apply visual enhancements
    const enhancementPrompt = `
${QUALITY_ENHANCEMENT_PROMPT.replace('{{COMPONENT}}', code)}

## VISUAL DESIGN ENHANCEMENT FOCUS:
- Improve color scheme and visual hierarchy
- Add more visual elements (icons, diagrams, illustrations)
- Enhance typography and spacing
- Improve mobile responsiveness
- Add smooth animations and transitions

## TARGET AUDIENCE: ${targetAge} grade students

Focus specifically on visual appeal and user experience.
`

    try {
      const response = await callLLM(enhancementPrompt, 'gpt-4o')
      const enhancedCode = this.extractCodeFromResponse(response.content)
      
      if (enhancedCode && enhancedCode !== code) {
        recommendations.push('Enhanced visual design')
        recommendations.push('Improved color scheme and typography')
        recommendations.push('Added visual elements and animations')
        return { improved: true, code: enhancedCode, recommendations }
      }
    } catch (error) {
      console.error('[ContentEnhancer] Error in visual enhancement:', error)
    }
    
    return { improved: false, code, recommendations }
  }

  private async enhanceTechnicalQuality(
    code: string, 
    topic: string, 
    targetAge: string
  ): Promise<{ improved: boolean; code: string; recommendations: string[] }> {
    const recommendations: string[] = []
    
    // Check current technical quality
    const technicalElements = ['interface', 'type', 'useCallback', 'useMemo', 'error', 'catch']
    const foundElements = technicalElements.filter(element => code.includes(element)).length
    
    if (foundElements >= 3) {
      return { improved: false, code, recommendations }
    }
    
    // Apply technical enhancements
    const enhancementPrompt = `
${QUALITY_ENHANCEMENT_PROMPT.replace('{{COMPONENT}}', code)}

## TECHNICAL QUALITY ENHANCEMENT FOCUS:
- Improve TypeScript types and interfaces
- Add proper error handling and loading states
- Optimize performance with useCallback/useMemo
- Enhance accessibility features
- Improve code structure and maintainability

## TARGET AUDIENCE: ${targetAge} grade students

Focus specifically on technical excellence and code quality.
`

    try {
      const response = await callLLM(enhancementPrompt, 'gpt-4o')
      const enhancedCode = this.extractCodeFromResponse(response.content)
      
      if (enhancedCode && enhancedCode !== code) {
        recommendations.push('Improved TypeScript types')
        recommendations.push('Enhanced error handling')
        recommendations.push('Optimized performance')
        return { improved: true, code: enhancedCode, recommendations }
      }
    } catch (error) {
      console.error('[ContentEnhancer] Error in technical enhancement:', error)
    }
    
    return { improved: false, code, recommendations }
  }

  private extractCodeFromResponse(response: string): string {
    // Try to extract code from various formats
    const codeBlockRegex = /```(?:typescript|tsx|ts)?\n([\s\S]*?)\n```/
    const match = response.match(codeBlockRegex)
    
    if (match) {
      return match[1].trim()
    }
    
    // If no code blocks, look for 'use client' or import statements
    const lines = response.split('\n')
    const startIndex = lines.findIndex(line => 
      line.includes("'use client'") || 
      line.includes('import ') ||
      line.includes('const ') ||
      line.includes('function ')
    )
    
    if (startIndex !== -1) {
      return lines.slice(startIndex).join('\n').trim()
    }
    
    return response.trim()
  }

  // Configuration methods
  enableStage(stageName: string): void {
    const stage = this.enhancementStages.find(s => s.name === stageName)
    if (stage) {
      stage.enabled = true
    }
  }

  disableStage(stageName: string): void {
    const stage = this.enhancementStages.find(s => s.name === stageName)
    if (stage) {
      stage.enabled = false
    }
  }

  updateStageWeight(stageName: string, weight: number): void {
    const stage = this.enhancementStages.find(s => s.name === stageName)
    if (stage) {
      stage.weight = weight
    }
  }

  getEnhancementStages(): EnhancementStage[] {
    return [...this.enhancementStages]
  }
}
