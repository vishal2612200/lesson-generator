/**
 * Advanced Content Quality Scoring System
 * Provides comprehensive quality assessment and scoring for generated lessons
 */

import { Lesson } from '@domains/lesson/domain/lesson'

export interface QualityScore {
  overall: number
  breakdown: {
    educationalValue: number
    contentAccuracy: number
    engagement: number
    clarity: number
    completeness: number
    ageAppropriateness: number
  }
  metrics: {
    wordCount: number
    sectionCount: number
    questionCount?: number
    exampleCount: number
    visualElementCount: number
  }
  feedback: {
    strengths: string[]
    improvements: string[]
    suggestions: string[]
  }
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'
}

export interface QualityBenchmark {
  category: string
  weight: number
  criteria: Array<{
    metric: string
    threshold: number
    points: number
  }>
}

/**
 * Advanced quality scoring system
 */
export class QualityScorer {
  private benchmarks: QualityBenchmark[] = []
  
  constructor() {
    this.initializeBenchmarks()
  }
  
  /**
   * Score lesson content comprehensively
   */
  scoreLesson(lesson: Lesson): QualityScore {
    const breakdown = this.calculateBreakdown(lesson)
    const metrics = this.calculateMetrics(lesson)
    const feedback = this.generateFeedback(lesson, breakdown, metrics)
    const overall = this.calculateOverallScore(breakdown)
    const grade = this.calculateGrade(overall)
    
    return {
      overall,
      breakdown,
      metrics,
      feedback,
      grade
    }
  }
  
  /**
   * Compare lesson against benchmarks
   */
  compareToBenchmarks(score: QualityScore, lessonType: string): {
    meetsBenchmarks: boolean
    benchmarkScore: number
    gaps: string[]
    recommendations: string[]
  } {
    const benchmark = this.benchmarks.find(b => b.category === lessonType)
    if (!benchmark) {
      return {
        meetsBenchmarks: false,
        benchmarkScore: 0,
        gaps: ['No benchmark available for this lesson type'],
        recommendations: ['Create benchmark for this lesson type']
      }
    }
    
    let benchmarkScore = 0
    const gaps: string[] = []
    const recommendations: string[] = []
    
    benchmark.criteria.forEach(criterion => {
      const actualValue = this.getMetricValue(score, criterion.metric)
      if (actualValue >= criterion.threshold) {
        benchmarkScore += criterion.points
      } else {
        gaps.push(`${criterion.metric}: ${actualValue}/${criterion.threshold}`)
        recommendations.push(`Improve ${criterion.metric} to meet benchmark`)
      }
    })
    
    return {
      meetsBenchmarks: benchmarkScore >= benchmark.criteria.reduce((sum, c) => sum + c.points, 0) * 0.8,
      benchmarkScore,
      gaps,
      recommendations
    }
  }
  
  private calculateBreakdown(lesson: Lesson): QualityScore['breakdown'] {
    return {
      educationalValue: this.scoreEducationalValue(lesson),
      contentAccuracy: this.scoreContentAccuracy(lesson),
      engagement: this.scoreEngagement(lesson),
      clarity: this.scoreClarity(lesson),
      completeness: this.scoreCompleteness(lesson),
      ageAppropriateness: this.scoreAgeAppropriateness(lesson)
    }
  }
  
  private calculateMetrics(lesson: Lesson): QualityScore['metrics'] {
    const content = lesson.content
    let wordCount = 0
    let sectionCount = 0
    let questionCount = 0
    let exampleCount = 0
    let visualElementCount = 0
    
    if (lesson.type === 'quiz' && content.questions) {
      questionCount = content.questions.length
      wordCount = content.questions.reduce((sum: number, q: any) => sum + q.q.split(' ').length, 0)
      exampleCount = content.questions.filter((q: any) => q.q.toLowerCase().includes('example')).length
    } else if ((lesson.type === 'one-pager' || lesson.type === 'explanation') && content.sections) {
      sectionCount = content.sections.length
      wordCount = content.sections.reduce((sum: number, s: any) => sum + s.text.split(' ').length, 0)
      exampleCount = content.sections.filter((s: any) => s.text.toLowerCase().includes('example')).length
    } else if (lesson.type === 'rich-content' && content.blocks) {
      sectionCount = content.blocks.length
      wordCount = content.blocks.reduce((sum: number, b: any) => {
        if (b.type === 'text') return sum + b.content.split(' ').length
        return sum
      }, 0)
      exampleCount = content.blocks.filter((b: any) => 
        b.type === 'text' && b.content.toLowerCase().includes('example')
      ).length
      visualElementCount = content.blocks.filter((b: any) => 
        ['image', 'svg', 'video'].includes(b.type)
      ).length
    }
    
    return {
      wordCount,
      sectionCount,
      questionCount: lesson.type === 'quiz' ? questionCount : undefined,
      exampleCount,
      visualElementCount
    }
  }
  
  private scoreEducationalValue(lesson: Lesson): number {
    let score = 0.5 // Base score
    
    // Check for learning objectives
    if (lesson.description && lesson.description.length > 20) {
      score += 0.1
    }
    
    // Check for progressive complexity
    if (lesson.type === 'quiz' && lesson.content.questions) {
      const questions = lesson.content.questions
      if (questions.length >= 5) score += 0.1
      if (questions.length >= 10) score += 0.1
      
      // Check for variety in question types
      const hasVariety = questions.some((q: any) => q.q.includes('?')) && 
                        questions.some((q: any) => q.q.includes('which')) &&
                        questions.some((q: any) => q.q.includes('what'))
      if (hasVariety) score += 0.1
    }
    
    // Check for comprehensive coverage
    if (lesson.type === 'one-pager' || lesson.type === 'explanation') {
      const sections = lesson.content.sections
      if (sections && sections.length >= 4) score += 0.1
      if (sections && sections.length >= 6) score += 0.1
      
      // Check for logical flow
      const hasIntroduction = sections.some((s: any) => 
        s.heading.toLowerCase().includes('introduction') || 
        s.heading.toLowerCase().includes('overview')
      )
      const hasConclusion = sections.some((s: any) => 
        s.heading.toLowerCase().includes('conclusion') || 
        s.heading.toLowerCase().includes('summary')
      )
      if (hasIntroduction && hasConclusion) score += 0.1
    }
    
    // Check for practical applications
    const contentString = JSON.stringify(lesson.content).toLowerCase()
    if (contentString.includes('example') || contentString.includes('practice')) {
      score += 0.1
    }
    
    return Math.min(score, 1.0)
  }
  
  private scoreContentAccuracy(lesson: Lesson): number {
    let score = 0.7 // Base score assuming content is generally accurate
    
    // Check for factual content
    const contentString = JSON.stringify(lesson.content).toLowerCase()
    
    // Penalize placeholder content
    if (contentString.includes('placeholder') || 
        contentString.includes('lorem ipsum') || 
        contentString.includes('generic example')) {
      score -= 0.3
    }
    
    // Reward specific, detailed content
    if (contentString.includes('specific') || 
        contentString.includes('detailed') || 
        contentString.includes('precise')) {
      score += 0.1
    }
    
    // Check for proper terminology using keyword set
    const terminologyKeywords = new Set(['concept', 'principle', 'method', 'technique', 'process']);
    const words = contentString.split(/\s+/);
    const foundTerms = words.filter(w => {
      // Remove non-word characters by iterating
      let cleaned = '';
      for (const char of w.toLowerCase()) {
        if ((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char === '_') {
          cleaned += char;
        }
      }
      return terminologyKeywords.has(cleaned);
    });
    
    if (foundTerms.length >= 3) {
      score += 0.1
    }
    
    // Check for examples and applications
    if (contentString.includes('example') && contentString.includes('application')) {
      score += 0.1
    }
    
    return Math.min(Math.max(score, 0), 1.0)
  }
  
  private scoreEngagement(lesson: Lesson): number {
    let score = 0.5 // Base score
    
    const contentString = JSON.stringify(lesson.content).toLowerCase()
    
    // Check for interactive elements
    if (lesson.type === 'rich-content') {
      const blocks = lesson.content.blocks
      if (blocks) {
        const interactiveBlocks = blocks.filter((b: any) => 
          ['quiz', 'interactive', 'game'].includes(b.type)
        ).length
        score += Math.min(interactiveBlocks * 0.1, 0.3)
      }
    }
    
    // Check for visual elements
    if (contentString.includes('image') || contentString.includes('svg') || contentString.includes('diagram')) {
      score += 0.2
    }
    // SVG alignment heuristic (lightweight): bonus if labeled/accessible, small penalty if generic
    if (contentString.includes('svg')) {
      const hasLabels = contentString.includes('<text') || contentString.includes('label')
      const hasA11y = contentString.includes('aria-labelledby') || contentString.includes('<title>')
      const hasLegend = contentString.includes('legend')
      if (hasLabels && hasA11y) score += 0.05
      if (hasLegend) score += 0.03
      if (!hasLabels) score -= 0.05
    }
    
    // Check for engaging language
    const engagingWords = ['interesting', 'fascinating', 'amazing', 'incredible', 'wonderful', 'exciting']
    const hasEngagingLanguage = engagingWords.some(word => contentString.includes(word))
    if (hasEngagingLanguage) score += 0.1
    
    // Check for questions and prompts
    if (contentString.includes('?') || contentString.includes('think about') || contentString.includes('consider')) {
      score += 0.1
    }
    
    // Check for real-world connections
    if (contentString.includes('real world') || contentString.includes('daily life') || contentString.includes('everyday')) {
      score += 0.1
    }
    
    return Math.min(score, 1.0)
  }
  
  private scoreClarity(lesson: Lesson): number {
    let score = 0.6 // Base score
    
    // Check for clear structure
    if (lesson.title && lesson.title.length > 5 && lesson.title.length < 100) {
      score += 0.1
    }
    
    // Check for clear headings
    if (lesson.type === 'one-pager' || lesson.type === 'explanation') {
      const sections = lesson.content.sections
      if (sections) {
        const clearHeadings = sections.filter((s: any) => 
          s.heading && s.heading.length > 3 && s.heading.length < 50
        ).length
        score += (clearHeadings / sections.length) * 0.2
      }
    }
    
    // Check for clear questions
    if (lesson.type === 'quiz') {
      const questions = lesson.content.questions
      if (questions) {
        const clearQuestions = questions.filter((q: any) => 
          q.q && q.q.length > 10 && q.q.includes('?')
        ).length
        score += (clearQuestions / questions.length) * 0.2
      }
    }
    
    // Check for appropriate length
    const metrics = this.calculateMetrics(lesson)
    if (metrics.wordCount >= 200 && metrics.wordCount <= 2000) {
      score += 0.1
    }
    
    return Math.min(score, 1.0)
  }
  
  private scoreCompleteness(lesson: Lesson): number {
    let score = 0.5 // Base score
    
    // Check for minimum content requirements
    const metrics = this.calculateMetrics(lesson)
    
    if (lesson.type === 'quiz') {
      if (metrics.questionCount && metrics.questionCount >= 5) score += 0.2
      if (metrics.questionCount && metrics.questionCount >= 10) score += 0.2
      if (metrics.exampleCount && metrics.exampleCount >= 2) score += 0.1
    } else if (lesson.type === 'one-pager' || lesson.type === 'explanation') {
      if (metrics.sectionCount >= 4) score += 0.2
      if (metrics.sectionCount >= 6) score += 0.2
      if (metrics.wordCount >= 500) score += 0.1
    } else if (lesson.type === 'rich-content') {
      if (metrics.sectionCount >= 5) score += 0.2
      if (metrics.visualElementCount >= 2) score += 0.2
      if (metrics.wordCount >= 300) score += 0.1
    }
    
    // Check for comprehensive coverage
    const contentString = JSON.stringify(lesson.content).toLowerCase()
    if (contentString.includes('introduction') && contentString.includes('conclusion')) {
      score += 0.1
    }
    
    return Math.min(score, 1.0)
  }
  
  private scoreAgeAppropriateness(lesson: Lesson): number {
    let score = 0.8 // Base score assuming content is age-appropriate
    
    const contentString = JSON.stringify(lesson.content).toLowerCase()
    
    // Check for appropriate vocabulary
    const complexWords = ['sophisticated', 'intricate', 'complex', 'advanced', 'sophisticated']
    const hasComplexWords = complexWords.some(word => contentString.includes(word))
    if (hasComplexWords) score -= 0.1
    
    // Check for appropriate examples
    if (contentString.includes('child') || contentString.includes('student') || contentString.includes('learn')) {
      score += 0.1
    }
    
    // Check for appropriate length
    const metrics = this.calculateMetrics(lesson)
    if (metrics.wordCount > 3000) score -= 0.1 // Too long for younger students
    if (metrics.wordCount < 100) score -= 0.1 // Too short for meaningful content
    
    return Math.min(Math.max(score, 0), 1.0)
  }
  
  private calculateOverallScore(breakdown: QualityScore['breakdown']): number {
    const weights = {
      educationalValue: 0.25,
      contentAccuracy: 0.20,
      engagement: 0.15,
      clarity: 0.20,
      completeness: 0.15,
      ageAppropriateness: 0.05
    }
    
    return Object.entries(breakdown).reduce((sum, [key, value]) => {
      return sum + (value * weights[key as keyof typeof weights])
    }, 0)
  }
  
  private calculateGrade(overallScore: number): QualityScore['grade'] {
    if (overallScore >= 0.95) return 'A+'
    if (overallScore >= 0.90) return 'A'
    if (overallScore >= 0.85) return 'B+'
    if (overallScore >= 0.80) return 'B'
    if (overallScore >= 0.75) return 'C+'
    if (overallScore >= 0.70) return 'C'
    if (overallScore >= 0.60) return 'D'
    return 'F'
  }
  
  private generateFeedback(lesson: Lesson, breakdown: QualityScore['breakdown'], metrics: QualityScore['metrics']): QualityScore['feedback'] {
    const strengths: string[] = []
    const improvements: string[] = []
    const suggestions: string[] = []
    
    // Analyze strengths
    if (breakdown.educationalValue >= 0.8) {
      strengths.push('Strong educational value with clear learning objectives')
    }
    if (breakdown.engagement >= 0.8) {
      strengths.push('Highly engaging content with interactive elements')
    }
    if (breakdown.clarity >= 0.8) {
      strengths.push('Clear, well-structured content that is easy to follow')
    }
    if (breakdown.completeness >= 0.8) {
      strengths.push('Comprehensive coverage of the topic')
    }
    
    // Identify improvements
    if (breakdown.educationalValue < 0.7) {
      improvements.push('Enhance educational value with more learning objectives')
    }
    if (breakdown.engagement < 0.7) {
      improvements.push('Add more engaging elements and interactive content')
    }
    if (breakdown.clarity < 0.7) {
      improvements.push('Improve clarity and structure of the content')
    }
    if (breakdown.completeness < 0.7) {
      improvements.push('Add more comprehensive coverage of the topic')
    }
    
    // Generate suggestions
    if (metrics.wordCount < 200) {
      suggestions.push('Add more detailed content to reach minimum word count')
    }
    if (metrics.exampleCount < 2) {
      suggestions.push('Include more examples to illustrate key concepts')
    }
    if (lesson.type === 'quiz' && metrics.questionCount && metrics.questionCount < 8) {
      suggestions.push('Add more questions to create a comprehensive quiz')
    }
    if (lesson.type === 'one-pager' && metrics.sectionCount < 5) {
      suggestions.push('Add more sections to cover the topic thoroughly')
    }
    if (metrics.visualElementCount === 0 && lesson.type === 'rich-content') {
      suggestions.push('Include visual elements like images or diagrams')
    }
    
    return { strengths, improvements, suggestions }
  }
  
  private getMetricValue(score: QualityScore, metric: string): number {
    switch (metric) {
      case 'educationalValue': return score.breakdown.educationalValue
      case 'engagement': return score.breakdown.engagement
      case 'clarity': return score.breakdown.clarity
      case 'completeness': return score.breakdown.completeness
      case 'wordCount': return score.metrics.wordCount
      case 'sectionCount': return score.metrics.sectionCount
      case 'questionCount': return score.metrics.questionCount || 0
      case 'exampleCount': return score.metrics.exampleCount
      case 'visualElementCount': return score.metrics.visualElementCount
      default: return 0
    }
  }
  
  private initializeBenchmarks(): void {
    this.benchmarks = [
      {
        category: 'quiz',
        weight: 1.0,
        criteria: [
          { metric: 'questionCount', threshold: 5, points: 20 },
          { metric: 'clarity', threshold: 0.8, points: 20 },
          { metric: 'educationalValue', threshold: 0.8, points: 20 },
          { metric: 'completeness', threshold: 0.7, points: 20 },
          { metric: 'engagement', threshold: 0.7, points: 20 }
        ]
      },
      {
        category: 'one-pager',
        weight: 1.0,
        criteria: [
          { metric: 'sectionCount', threshold: 4, points: 20 },
          { metric: 'wordCount', threshold: 500, points: 20 },
          { metric: 'clarity', threshold: 0.8, points: 20 },
          { metric: 'completeness', threshold: 0.8, points: 20 },
          { metric: 'educationalValue', threshold: 0.8, points: 20 }
        ]
      },
      {
        category: 'explanation',
        weight: 1.0,
        criteria: [
          { metric: 'sectionCount', threshold: 4, points: 20 },
          { metric: 'wordCount', threshold: 600, points: 20 },
          { metric: 'clarity', threshold: 0.8, points: 20 },
          { metric: 'completeness', threshold: 0.8, points: 20 },
          { metric: 'educationalValue', threshold: 0.8, points: 20 }
        ]
      },
      {
        category: 'rich-content',
        weight: 1.0,
        criteria: [
          { metric: 'sectionCount', threshold: 5, points: 20 },
          { metric: 'visualElementCount', threshold: 2, points: 20 },
          { metric: 'engagement', threshold: 0.8, points: 20 },
          { metric: 'clarity', threshold: 0.8, points: 20 },
          { metric: 'completeness', threshold: 0.8, points: 20 }
        ]
      }
    ]
  }
}

/**
 * Quality improvement recommendations
 */
export function generateQualityImprovements(score: QualityScore, lessonType: string): {
  priority: 'high' | 'medium' | 'low'
  improvements: Array<{
    category: string
    description: string
    expectedImpact: number
    implementation: string
  }>
} {
  const improvements: Array<{
    category: string
    description: string
    expectedImpact: number
    implementation: string
  }> = []
  
  // High priority improvements
  if (score.breakdown.educationalValue < 0.7) {
    improvements.push({
      category: 'Educational Value',
      description: 'Add clear learning objectives and outcomes',
      expectedImpact: 0.2,
      implementation: 'Include specific learning goals in the lesson description and content'
    })
  }
  
  if (score.breakdown.clarity < 0.7) {
    improvements.push({
      category: 'Clarity',
      description: 'Improve content structure and organization',
      expectedImpact: 0.15,
      implementation: 'Use clear headings, logical flow, and concise language'
    })
  }
  
  // Medium priority improvements
  if (score.breakdown.engagement < 0.7) {
    improvements.push({
      category: 'Engagement',
      description: 'Add interactive elements and visual content',
      expectedImpact: 0.1,
      implementation: 'Include images, diagrams, examples, and interactive questions'
    })
  }
  
  if (score.breakdown.completeness < 0.7) {
    improvements.push({
      category: 'Completeness',
      description: 'Expand content coverage and depth',
      expectedImpact: 0.1,
      implementation: 'Add more sections, examples, and comprehensive explanations'
    })
  }
  
  // Low priority improvements
  if (score.breakdown.ageAppropriateness < 0.8) {
    improvements.push({
      category: 'Age Appropriateness',
      description: 'Adjust content for target age group',
      expectedImpact: 0.05,
      implementation: 'Use appropriate vocabulary and examples for the intended audience'
    })
  }
  
  const priority = improvements.length > 2 ? 'high' : improvements.length > 1 ? 'medium' : 'low'
  
  return { priority, improvements }
}
