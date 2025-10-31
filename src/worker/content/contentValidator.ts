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

  // Outline alignment check (generic, domain-agnostic)
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

    // Check for educational quality indicators using keyword sets
    if (section.text) {
      const textLower = section.text.toLowerCase();
      const exampleKeywords = new Set(['example', 'examples', 'instance', 'such', 'as', 'like']);
      const explanationKeywords = new Set(['because', 'therefore', 'means', 'words', 'explain', 'explanation']);
      const words = textLower.split(/\s+/);
      
      const hasExamples = words.some((w: string) => exampleKeywords.has(w)) || 
                          textLower.includes('for instance') || 
                          textLower.includes('such as');
      const hasExplanations = words.some((w: string) => explanationKeywords.has(w)) || 
                              textLower.includes('this means') || 
                              textLower.includes('in other words');
      
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

  // Check for placeholder content using keyword set
  const placeholderKeywords = new Set(['placeholder', 'lorem', 'ipsum', 'example', 'text', 'your', 'content', 'here']);
  const lessonDataStr = JSON.stringify(lessonData).toLowerCase();
  const words = lessonDataStr.split(/\s+/);
  
  // Remove non-word characters manually
  let hasPlaceholders = false;
  for (const word of words) {
    let cleaned = '';
    for (const char of word) {
      if ((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char === '_') {
        cleaned += char;
      }
    }
    if (placeholderKeywords.has(cleaned)) {
      hasPlaceholders = true;
      break;
    }
  }
  
  hasPlaceholders = hasPlaceholders || 
    lessonDataStr.includes('example text') || 
    lessonDataStr.includes('your content here');
  
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

// --- SVG Alignment Validation ---
export interface SvgValidationResult {
  valid: boolean
  issues: string[]
  score: number // 0-1
  signals: {
    hasSvg: boolean
    hasViewBox: boolean
    hasTitleDesc: boolean
    hasAria: boolean
    labelCount: number
    hasRelationshipArrow: boolean
    hasEntityGroups: boolean
    hasLegend: boolean
    hasMappingComment: boolean
  }
}

export function validateSvgAlignment(typeScriptSource: string, outline?: string): SvgValidationResult {
  const src = typeScriptSource
  const issues: string[] = []

  const hasSvg = /<svg\b[\s\S]*?>[\s\S]*?<\/svg>/i.test(src)
  if (!hasSvg) {
    return { valid: false, issues: ['No inline <svg> found'], score: 0, signals: {
      hasSvg: false, hasViewBox: false, hasTitleDesc: false, hasAria: false,
      labelCount: 0, hasRelationshipArrow: false, hasEntityGroups: false,
      hasLegend: false, hasMappingComment: false
    }}
  }

  const viewBoxMatch = src.match(/<svg[^>]*\bviewBox=\"([\d\.\s]+)\"[^>]*>/i)
  const hasViewBox = !!viewBoxMatch
  if (!hasViewBox) issues.push('SVG missing viewBox')
  let vb = { minX: 0, minY: 0, width: 0, height: 0 }
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number)
    if (parts.length === 4 && parts.every(n => !Number.isNaN(n))) {
      vb = { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] }
    }
  }

  const hasPreserve = /<svg[^>]*\bpreserveAspectRatio=\"xMidYMid meet\"/i.test(src)
  if (!hasPreserve) issues.push('SVG should set preserveAspectRatio="xMidYMid meet"')

  const hasTitle = /<title>[^<]+<\/title>/i.test(src)
  const hasDesc = /<desc>[^<]*<\/desc>/i.test(src)
  const hasTitleDesc = hasTitle && hasDesc
  if (!hasTitleDesc) issues.push('SVG missing <title> or <desc>')

  const hasAria = /<svg[^>]*\baria-labelledby=\"[^\"]+\"/i.test(src)
  if (!hasAria) issues.push('SVG missing aria-labelledby')

  const textMatches = Array.from(src.matchAll(/<text([^>]*)>([^<]*)<\/text>/gi))
  const labelCount = textMatches.length
  if (labelCount < 2) issues.push('Insufficient labeled marks (<text>)')

  // Geometric bounds check for <text x y>
  if (hasViewBox && vb.width > 0 && vb.height > 0) {
    const margin = 16
    const [minX, minY, maxX, maxY] = [vb.minX + margin, vb.minY + margin, vb.minX + vb.width - margin, vb.minY + vb.height - margin]
    const outOfBounds: string[] = []
    textMatches.forEach((m) => {
      const attr = m[1] || ''
      const xMatch = attr.match(/\bx=\"([\d\.\-]+)\"/i)
      const yMatch = attr.match(/\by=\"([\d\.\-]+)\"/i)
      const x = xMatch ? Number(xMatch[1]) : NaN
      const y = yMatch ? Number(yMatch[1]) : NaN
      if (!Number.isNaN(x) && !Number.isNaN(y)) {
        if (x < minX || x > maxX || y < minY || y > maxY) {
          outOfBounds.push(`${m[2]?.trim()?.slice(0,20) || 'label'}@(${x},${y})`)
        }
      }
    })
    if (outOfBounds.length > 0) {
      issues.push(`Labels outside viewBox bounds (with margin): ${outOfBounds.slice(0,3).join('; ')}${outOfBounds.length>3?'…':''}`)
    }
  }

  // Label length heuristic
  const tooLong = textMatches.filter(m => (m[2] || '').trim().length > 18).length
  if (tooLong > 0) {
    issues.push('Some labels exceed 18 characters; consider truncation with …')
  }

  const hasRelationshipArrow = /<path[^>]*markerEnd=|<marker[^>]*id=\"arrow|d=\"M [^\"]+ L /i.test(src)
  if (!hasRelationshipArrow) issues.push('No relationship arrow/flow indicated')

  const hasEntityGroups = /<g[^>]*data-entity=\"[^\"]+\"/i.test(src)
  if (!hasEntityGroups) issues.push('No <g data-entity> grouping present')

  const hasLegend = /Legend|<g[^>]*data-legend=|<rect[^>]*className=\"[^\"]*legend/i.test(src)

  const hasMappingComment = /entity\s*:\s*\".*?\"\s*→|->|=>\s*(rect|circle|path|g|#|\.)/i.test(src)
  if (!hasMappingComment) issues.push('Missing mapping comment for entities → SVG elements')

  // Outline grounding heuristic: require at least one outline keyword to appear near SVG labels
  let outlineOk = true
  if (outline) {
    const outlineWords = Array.from(new Set(outline.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 4))).slice(0, 6)
    const texts = (src.match(/<text[^>]*>([^<]+)<\/text>/gi) || []).join(' ').toLowerCase()
    const matched = outlineWords.filter(w => texts.includes(w))
    outlineOk = outlineWords.length === 0 || matched.length >= Math.max(1, Math.floor(outlineWords.length * 0.3))
    if (!outlineOk) issues.push('SVG labels appear weakly aligned to outline keywords')
  }

  // Score aggregate
  let score = 1.0
  const deductions = [
    hasViewBox ? 0 : 0.15,
    hasTitleDesc ? 0 : 0.15,
    hasAria ? 0 : 0.1,
    labelCount >= 2 ? 0 : 0.15,
    hasRelationshipArrow ? 0 : 0.15,
    hasEntityGroups ? 0 : 0.15,
    outlineOk ? 0 : 0.1,
    hasPreserve ? 0 : 0.05,
  ]
  score = Math.max(0, 1.0 - deductions.reduce((a, b) => a + b, 0))

  return {
    valid: issues.length === 0 || score >= 0.7,
    issues,
    score,
    signals: {
      hasSvg,
      hasViewBox,
      hasTitleDesc,
      hasAria,
      labelCount,
      hasRelationshipArrow,
      hasEntityGroups,
      hasLegend,
      hasMappingComment
    }
  }
}

// --- Style Heuristics ---
export function validateStyleHeuristics(typeScriptSource: string): { signals: Record<string, number | boolean>, issues: string[] } {
  const src = typeScriptSource
  const issues: string[] = []
  const signals: Record<string, number | boolean> = {}

  // Spacing rhythm: count p-4/6/8 and gap-4/6/8
  const spacingMatches = (src.match(/\b(p|px|py|pt|pb|pl|pr|gap)-(4|6|8)\b/g) || []).length
  signals.spacing_rhythm = spacingMatches
  if (spacingMatches < 3) issues.push('Low usage of 4/6/8 spacing rhythm')

  // Depth: shadow or ring usage
  const hasShadow = /\bshadow(?!-\[)/.test(src)
  const hasRing = /\bring-1\b/.test(src)
  signals.has_shadow = hasShadow
  signals.has_ring = hasRing
  if (!hasShadow && !hasRing) issues.push('No elevation styles (shadow or ring) detected')

  // Radius: rounded-xl/2xl
  const hasRounded = /\brounded-(xl|2xl)\b/.test(src)
  signals.has_large_radius = hasRounded
  if (!hasRounded) issues.push('No large radius (rounded-xl/2xl) found for cards')

  // Responsive container
  const hasResponsiveContainer = /\bmax-w-(xl|2xl|3xl|4xl)\b/.test(src) && /\bmx-auto\b/.test(src)
  signals.has_responsive_container = hasResponsiveContainer
  if (!hasResponsiveContainer) issues.push('No responsive container (max-w-*/mx-auto)')

  // Arbitrary values (avoid)
  const arbitrary = (src.match(/\[[^\]]+\]/g) || []).length
  signals.arbitrary_class_count = arbitrary
  if (arbitrary > 2) issues.push('Excessive arbitrary utility values; prefer tokens')

  // Rainbow palette (too many distinct hues)
  const hues = ['red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose']
  const usedHues = new Set<string>()
  hues.forEach(h => { if (new RegExp(`\b${h}-[0-9]{2,3}\b`).test(src)) usedHues.add(h) })
  signals.distinct_hues = usedHues.size
  if (usedHues.size > 3) issues.push('Too many distinct color hues; limit to primary + accent + neutrals')

  return { signals, issues }
}
