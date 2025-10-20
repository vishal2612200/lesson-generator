/**
 * Content Quality Validator
 * Validates generated lesson content for educational quality, completeness, and accuracy
 */

export interface ContentValidationResult {
  valid: boolean
  score: number // 0-1 scale
  issues: string[]
  suggestions: string[]
  metrics: {
    questionCount?: number
    sectionCount?: number
    wordCount?: number
    hasExamples?: boolean
    hasExplanations?: boolean
    alignmentScore?: number
  }
}

export function validateLessonContent(lessonData: any, outline?: string): ContentValidationResult {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 1.0

  // Basic structure validation
  if (!lessonData.title || lessonData.title.length < 5) {
    issues.push('Title is too short or missing')
    score -= 0.2
  }

  if (!lessonData.type || !['quiz', 'one-pager', 'explanation', 'rich-content'].includes(lessonData.type)) {
    issues.push('Invalid or missing lesson type')
    score -= 0.3
  }

  if (!lessonData.content) {
    issues.push('Missing lesson content')
    score -= 0.5
    return { valid: false, score: 0, issues, suggestions, metrics: {} }
  }

  const metrics: any = {}

  // Validate based on lesson type
  if (lessonData.type === 'quiz') {
    const quizValidation = validateQuizContent(lessonData.content)
    issues.push(...quizValidation.issues)
    suggestions.push(...quizValidation.suggestions)
    score -= quizValidation.scoreDeduction
    metrics.questionCount = quizValidation.questionCount
  } else if (lessonData.type === 'one-pager' || lessonData.type === 'explanation') {
    const sectionValidation = validateSectionContent(lessonData.content)
    issues.push(...sectionValidation.issues)
    suggestions.push(...sectionValidation.suggestions)
    score -= sectionValidation.scoreDeduction
    metrics.sectionCount = sectionValidation.sectionCount
    metrics.wordCount = sectionValidation.wordCount
  } else if (lessonData.type === 'rich-content') {
    const richValidation = validateRichContent(lessonData.content)
    issues.push(...richValidation.issues)
    suggestions.push(...richValidation.suggestions)
    score -= richValidation.scoreDeduction
    metrics.blockCount = richValidation.blockCount
  }

  // General quality checks
  const qualityCheck = validateGeneralQuality(lessonData)
  issues.push(...qualityCheck.issues)
  suggestions.push(...qualityCheck.suggestions)
  score -= qualityCheck.scoreDeduction

  // Outline alignment check (keywords must appear somewhere)
  if (outline) {
    const lowerOutline = outline.toLowerCase()
    const keywords = Array.from(new Set(
      lowerOutline
        .replace(/[\"'.,()\-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4)
    )).slice(0, 10)
    const contentString = JSON.stringify(lessonData).toLowerCase()
    const matched = keywords.filter(k => contentString.includes(k))
    const alignmentScore = keywords.length ? matched.length / keywords.length : 1
    metrics.alignmentScore = Number(alignmentScore.toFixed(2))
    if (alignmentScore < 0.4) {
      issues.push('Content appears weakly aligned to the outline (low keyword overlap)')
      suggestions.push('Incorporate more outline-specific terms, examples, or constraints')
      score -= 0.15
    } else if (alignmentScore < 0.7) {
      suggestions.push('Increase outline-specific details and vocabulary to improve alignment')
      score -= 0.05
    }
  }

  return {
    valid: issues.length === 0 && score >= 0.7,
    score: Math.max(0, score),
    issues,
    suggestions,
    metrics
  }
}

function validateQuizContent(content: any): { issues: string[], suggestions: string[], scoreDeduction: number, questionCount: number } {
  const issues: string[] = []
  const suggestions: string[] = []
  let scoreDeduction = 0

  if (!content.questions || !Array.isArray(content.questions)) {
    issues.push('Quiz content must have a questions array')
    scoreDeduction += 0.4
    return { issues, suggestions, scoreDeduction, questionCount: 0 }
  }

  const questionCount = content.questions.length
  if (questionCount === 0) {
    issues.push('Quiz must have at least one question')
    scoreDeduction += 0.3
  } else if (questionCount < 3) {
    suggestions.push('Consider adding more questions for better assessment')
    scoreDeduction += 0.1
  }

  // Validate each question
  content.questions.forEach((question: any, index: number) => {
    if (!question.q || question.q.length < 10) {
      issues.push(`Question ${index + 1}: Question text is too short or missing`)
      scoreDeduction += 0.1
    }

    if (!question.options || !Array.isArray(question.options) || question.options.length !== 4) {
      issues.push(`Question ${index + 1}: Must have exactly 4 options`)
      scoreDeduction += 0.1
    }

    if (typeof question.answerIndex !== 'number' || question.answerIndex < 0 || question.answerIndex > 3) {
      issues.push(`Question ${index + 1}: Invalid answerIndex (must be 0-3)`)
      scoreDeduction += 0.1
    }

    // Check for quality question content
    if (question.q && question.q.length < 20) {
      suggestions.push(`Question ${index + 1}: Consider making the question more detailed`)
    }

    // Check for good distractors
    if (question.options && question.options.length === 4) {
      const hasEmptyOptions = question.options.some((opt: string) => !opt || opt.trim().length === 0)
      if (hasEmptyOptions) {
        issues.push(`Question ${index + 1}: All options must have content`)
        scoreDeduction += 0.1
      }
    }
  })

  return { issues, suggestions, scoreDeduction, questionCount }
}

function validateSectionContent(content: any): { issues: string[], suggestions: string[], scoreDeduction: number, sectionCount: number, wordCount: number } {
  const issues: string[] = []
  const suggestions: string[] = []
  let scoreDeduction = 0

  if (!content.sections || !Array.isArray(content.sections)) {
    issues.push('Content must have a sections array')
    scoreDeduction += 0.4
    return { issues, suggestions, scoreDeduction, sectionCount: 0, wordCount: 0 }
  }

  const sectionCount = content.sections.length
  if (sectionCount === 0) {
    issues.push('Content must have at least one section')
    scoreDeduction += 0.3
  } else if (sectionCount < 3) {
    suggestions.push('Consider adding more sections for comprehensive coverage')
    scoreDeduction += 0.1
  }

  let totalWordCount = 0

  // Validate each section
  content.sections.forEach((section: any, index: number) => {
    if (!section.heading || section.heading.length < 3) {
      issues.push(`Section ${index + 1}: Heading is too short or missing`)
      scoreDeduction += 0.1
    }

    if (!section.text || section.text.length < 50) {
      issues.push(`Section ${index + 1}: Text content is too short (minimum 50 characters)`)
      scoreDeduction += 0.1
    } else {
      const wordCount = section.text.split(/\s+/).length
      totalWordCount += wordCount
      
      if (wordCount < 20) {
        suggestions.push(`Section ${index + 1}: Consider expanding the content`)
      }
    }

    // Check for educational quality indicators
    if (section.text) {
      const hasExamples = /example|for instance|such as|like/i.test(section.text)
      const hasExplanations = /because|therefore|this means|in other words/i.test(section.text)
      
      if (!hasExamples && !hasExplanations) {
        suggestions.push(`Section ${index + 1}: Consider adding examples or explanations`)
      }
    }
  })

  if (totalWordCount < 100) {
    suggestions.push('Consider expanding the overall content for better educational value')
    scoreDeduction += 0.1
  }

  return { issues, suggestions, scoreDeduction, sectionCount, wordCount: totalWordCount }
}

function validateRichContent(content: any): { issues: string[], suggestions: string[], scoreDeduction: number, blockCount: number } {
  const issues: string[] = []
  const suggestions: string[] = []
  let scoreDeduction = 0

  if (!content.blocks || !Array.isArray(content.blocks)) {
    issues.push('Rich content must have a blocks array')
    scoreDeduction += 0.4
    return { issues, suggestions, scoreDeduction, blockCount: 0 }
  }

  const blockCount = content.blocks.length
  if (blockCount === 0) {
    issues.push('Rich content must have at least one block')
    scoreDeduction += 0.3
  } else if (blockCount < 3) {
    suggestions.push('Consider adding more blocks for richer content')
    scoreDeduction += 0.1
  }

  // Validate block types and content
  const blockTypes = new Set()
  content.blocks.forEach((block: any, index: number) => {
    if (!block.type) {
      issues.push(`Block ${index + 1}: Missing block type`)
      scoreDeduction += 0.1
    } else {
      blockTypes.add(block.type)
    }

    // Check for content in text blocks
    if (block.type === 'text' && (!block.content || block.content.length < 20)) {
      issues.push(`Block ${index + 1}: Text block content is too short`)
      scoreDeduction += 0.1
    }

    // Check for quiz blocks
    if (block.type === 'quiz' && (!block.questions || block.questions.length === 0)) {
      issues.push(`Block ${index + 1}: Quiz block must have questions`)
      scoreDeduction += 0.1
    }
  })

  // Check for variety
  if (blockTypes.size < 2) {
    suggestions.push('Consider using more variety in block types')
    scoreDeduction += 0.1
  }

  return { issues, suggestions, scoreDeduction, blockCount }
}

function validateGeneralQuality(lessonData: any): { issues: string[], suggestions: string[], scoreDeduction: number } {
  const issues: string[] = []
  const suggestions: string[] = []
  let scoreDeduction = 0

  // Check for placeholder content
  const hasPlaceholders = /placeholder|lorem|ipsum|example text|your content here/i.test(JSON.stringify(lessonData))
  if (hasPlaceholders) {
    issues.push('Content contains placeholder text')
    scoreDeduction += 0.2
  }

  // Check for appropriate title length
  if (lessonData.title && lessonData.title.length > 100) {
    suggestions.push('Title is quite long, consider shortening it')
  }

  // Check for description
  if (!lessonData.description || lessonData.description.length < 10) {
    suggestions.push('Consider adding a more descriptive description')
    scoreDeduction += 0.05
  }

  return { issues, suggestions, scoreDeduction }
}

/**
 * Extract lesson data from TypeScript source code
 */
export function extractLessonData(typeScriptSource: string): any {
  try {
    // Extract the lesson object from TypeScript code
    const lessonMatch = typeScriptSource.match(/const lesson\s*=\s*({[\s\S]*?});/)
    if (lessonMatch) {
      const lessonStr = lessonMatch[1]
      // Use Function constructor for safe evaluation
      const lessonObj = new Function('return ' + lessonStr)()
      return lessonObj
    }
  } catch (error) {
    console.error('Error extracting lesson data:', error)
  }
  return null
}
