/**
 * Content Templates System
 * Pre-built templates for common lesson types to improve generation speed and quality
 */

export interface ContentTemplate {
  id: string
  name: string
  description: string
  lessonType: 'quiz' | 'one-pager' | 'explanation' | 'rich-content'
  category: string
  template: string
  variables: string[]
  qualityScore: number
  usageCount: number
}

export interface TemplateMatch {
  template: ContentTemplate
  matchScore: number
  variables: Record<string, string>
  confidence: number
}

/**
 * Content template library
 */
export class ContentTemplateLibrary {
  private templates: Map<string, ContentTemplate> = new Map()
  
  constructor() {
    this.initializeTemplates()
  }
  
  /**
   * Find the best matching template for a given outline
   */
  findBestTemplate(outline: string, lessonType: string): TemplateMatch | null {
    const candidates = Array.from(this.templates.values())
      .filter(t => t.lessonType === lessonType)
      .map(template => ({
        template,
        matchScore: this.calculateMatchScore(outline, template),
        variables: this.extractVariables(outline, template),
        confidence: 0
      }))
      .filter(match => match.matchScore > 0.3)
      .sort((a, b) => b.matchScore - a.matchScore)
    
    if (candidates.length === 0) return null
    
    const bestMatch = candidates[0]
    bestMatch.confidence = Math.min(bestMatch.matchScore * 1.5, 1.0)
    
    return bestMatch
  }
  
  /**
   * Generate content using a template
   */
  generateFromTemplate(template: ContentTemplate, variables: Record<string, string>): string {
    let content = template.template
    
    // Replace variables in the template
    template.variables.forEach(variable => {
      const value = variables[variable] || `[${variable}]`
      content = content.replace(new RegExp(`\\[${variable}\\]`, 'g'), value)
    })
    
    // Update usage count
    template.usageCount++
    
    return content
  }
  
  /**
   * Get template statistics
   */
  getTemplateStats(): {
    totalTemplates: number
    templatesByType: Record<string, number>
    mostUsedTemplates: Array<{ name: string; usageCount: number }>
    averageQualityScore: number
  } {
    const templates = Array.from(this.templates.values())
    
    const templatesByType = templates.reduce((acc, template) => {
      acc[template.lessonType] = (acc[template.lessonType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const mostUsedTemplates = templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(t => ({ name: t.name, usageCount: t.usageCount }))
    
    const averageQualityScore = templates.reduce((sum, t) => sum + t.qualityScore, 0) / templates.length
    
    return {
      totalTemplates: templates.length,
      templatesByType,
      mostUsedTemplates,
      averageQualityScore
    }
  }
  
  private calculateMatchScore(outline: string, template: ContentTemplate): number {
    const outlineLower = outline.toLowerCase()
    let score = 0
    
    // Category matching
    if (template.category && outlineLower.includes(template.category.toLowerCase())) {
      score += 0.4
    }
    
    // Keyword matching
    const keywords = this.extractKeywords(template.name + ' ' + template.description)
    const matchingKeywords = keywords.filter(keyword => 
      outlineLower.includes(keyword.toLowerCase())
    ).length
    
    score += (matchingKeywords / keywords.length) * 0.3
    
    // Quality score influence
    score += template.qualityScore * 0.2
    
    // Usage count influence (popular templates get slight boost)
    score += Math.min(template.usageCount / 100, 0.1)
    
    return Math.min(score, 1.0)
  }
  
  private extractVariables(outline: string, template: ContentTemplate): Record<string, string> {
    const variables: Record<string, string> = {}
    
    // Extract topic from outline
    const topicMatch = outline.match(/(?:on|about|for)\s+([^,.\n]+)/i)
    if (topicMatch) {
      variables.topic = topicMatch[1].trim()
    } else {
      // Fallback: use the first few words as topic
      variables.topic = outline.split(' ').slice(0, 3).join(' ')
    }
    
    // Extract specific details based on template variables
    template.variables.forEach(variable => {
      if (variable === 'topic') return // Already handled
      
      const patterns = this.getVariablePatterns(variable)
      for (const pattern of patterns) {
        const match = outline.match(pattern)
        if (match) {
          variables[variable] = match[1] || match[0]
          break
        }
      }
    })
    
    return variables
  }
  
  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'].includes(word))
  }
  
  private getVariablePatterns(variable: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      'questionCount': [
        /(\d+)\s*question/i,
        /(\d+)\s*quiz/i,
        /(\d+)\s*item/i
      ],
      'difficulty': [
        /(easy|simple|basic)/i,
        /(medium|intermediate)/i,
        /(hard|difficult|advanced)/i
      ],
      'grade': [
        /grade\s*(\d+)/i,
        /(\d+)(?:st|nd|rd|th)\s*grade/i
      ],
      'subject': [
        /(math|mathematics)/i,
        /(science|biology|chemistry|physics)/i,
        /(history|social studies)/i,
        /(english|language arts)/i,
        /(geography)/i
      ]
    }
    
    return patterns[variable] || []
  }
  
  private initializeTemplates(): void {
    // Math Quiz Templates
    this.addTemplate({
      id: 'math-basic-quiz',
      name: 'Basic Math Quiz',
      description: 'A quiz covering basic arithmetic operations',
      lessonType: 'quiz',
      category: 'math',
      template: `export interface Lesson {
  title: string;
  description?: string;
  type: 'quiz';
  content: {
    questions: Array<{
      q: string;
      options: string[];
      answerIndex: number;
    }>;
  };
}

const lesson: Lesson = {
  title: "[topic] Quiz",
  description: "Test your knowledge of [topic] with this comprehensive quiz",
  type: "quiz",
  content: {
    questions: [
      {
        q: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        answerIndex: 1
      },
      {
        q: "What is 5 × 3?",
        options: ["12", "15", "18", "20"],
        answerIndex: 1
      },
      {
        q: "What is 10 ÷ 2?",
        options: ["3", "4", "5", "6"],
        answerIndex: 2
      },
      {
        q: "What is 7 - 3?",
        options: ["3", "4", "5", "6"],
        answerIndex: 1
      },
      {
        q: "What is 6 × 4?",
        options: ["20", "22", "24", "26"],
        answerIndex: 2
      }
    ]
  }
};

export default lesson as Lesson;`,
      variables: ['topic'],
      qualityScore: 0.9,
      usageCount: 0
    })
    
    // Science Explanation Template
    this.addTemplate({
      id: 'science-explanation',
      name: 'Science Explanation',
      description: 'A detailed explanation of scientific concepts',
      lessonType: 'explanation',
      category: 'science',
      template: `export interface Lesson {
  title: string;
  description?: string;
  type: 'explanation';
  content: {
    sections: Array<{
      heading: string;
      text: string;
    }>;
  };
}

const lesson: Lesson = {
  title: "Understanding [topic]",
  description: "A comprehensive explanation of [topic] and its importance",
  type: "explanation",
  content: {
    sections: [
      {
        heading: "What is [topic]?",
        text: "[topic] is a fundamental concept in science that helps us understand how things work. It plays a crucial role in many natural processes and has practical applications in our daily lives."
      },
      {
        heading: "How does [topic] work?",
        text: "The process of [topic] involves several key steps. First, [step1]. Then, [step2]. Finally, [step3]. This creates a cycle that continues to function as long as the necessary conditions are present."
      },
      {
        heading: "Why is [topic] important?",
        text: "[topic] is important because it [importance1]. Without [topic], [consequence1]. Additionally, [topic] helps us [benefit1] and [benefit2]."
      },
      {
        heading: "Real-world examples",
        text: "We can see [topic] in action in many places. For example, [example1]. Another example is [example2]. These examples show how [topic] affects our daily lives."
      },
      {
        heading: "Key takeaways",
        text: "To summarize, [topic] is [summary1]. It works by [summary2] and is important because [summary3]. Understanding [topic] helps us [summary4]."
      }
    ]
  }
};

export default lesson as Lesson;`,
      variables: ['topic', 'step1', 'step2', 'step3', 'importance1', 'consequence1', 'benefit1', 'benefit2', 'example1', 'example2', 'summary1', 'summary2', 'summary3', 'summary4'],
      qualityScore: 0.85,
      usageCount: 0
    })
    
    // Geography One-Pager Template
    this.addTemplate({
      id: 'geography-one-pager',
      name: 'Geography One-Pager',
      description: 'A comprehensive guide to geographical topics',
      lessonType: 'one-pager',
      category: 'geography',
      template: `export interface Lesson {
  title: string;
  description?: string;
  type: 'one-pager';
  content: {
    sections: Array<{
      heading: string;
      text: string;
    }>;
  };
}

const lesson: Lesson = {
  title: "[topic] Guide",
  description: "Everything you need to know about [topic]",
  type: "one-pager",
  content: {
    sections: [
      {
        heading: "Location and Geography",
        text: "[topic] is located in [location]. It covers an area of [area] and has a population of [population]. The region is known for its [geography1] and [geography2]."
      },
      {
        heading: "Climate and Weather",
        text: "[topic] has a [climate] climate. The average temperature is [temperature] and the region receives [precipitation] of rainfall annually. The weather patterns are influenced by [weather1] and [weather2]."
      },
      {
        heading: "Natural Resources",
        text: "The region is rich in natural resources including [resource1], [resource2], and [resource3]. These resources have shaped the economy and way of life for the people who live there."
      },
      {
        heading: "Culture and People",
        text: "The people of [topic] are known for their [culture1] and [culture2]. The main languages spoken are [language1] and [language2]. Traditional foods include [food1] and [food2]."
      },
      {
        heading: "Economy and Industry",
        text: "The economy of [topic] is based on [industry1], [industry2], and [industry3]. The region exports [export1] and [export2] to other parts of the world."
      },
      {
        heading: "Interesting Facts",
        text: "Did you know that [fact1]? Another interesting fact is that [fact2]. These unique characteristics make [topic] a fascinating place to learn about."
      }
    ]
  }
};

export default lesson as Lesson;`,
      variables: ['topic', 'location', 'area', 'population', 'geography1', 'geography2', 'climate', 'temperature', 'precipitation', 'weather1', 'weather2', 'resource1', 'resource2', 'resource3', 'culture1', 'culture2', 'language1', 'language2', 'food1', 'food2', 'industry1', 'industry2', 'industry3', 'export1', 'export2', 'fact1', 'fact2'],
      qualityScore: 0.88,
      usageCount: 0
    })
    
    // Rich Content Template
    this.addTemplate({
      id: 'interactive-lesson',
      name: 'Interactive Lesson',
      description: 'An engaging, interactive lesson with multiple content types',
      lessonType: 'rich-content',
      category: 'general',
      template: `export interface Lesson {
  title: string;
  description?: string;
  type: 'rich-content';
  content: {
    blocks: any[];
  };
}

const lesson: Lesson = {
  title: "Interactive [topic]",
  description: "An engaging, interactive lesson about [topic]",
  type: "rich-content",
  content: {
    blocks: [
      {
        type: "text",
        content: "## Welcome to [topic]\\n\\nIn this interactive lesson, you'll learn about [topic] through engaging content, examples, and activities."
      },
      {
        type: "callout",
        title: "Learning Objectives",
        content: "By the end of this lesson, you will be able to:\\n- [objective1]\\n- [objective2]\\n- [objective3]"
      },
      {
        type: "text",
        content: "## What is [topic]?\\n\\n[topic] is [definition]. It's important because [importance]."
      },
      {
        type: "svg",
        svg: "[svg_content]",
        title: "[topic] Visualization",
        description: "A visual representation to help you understand the concept"
      },
      {
        type: "text",
        content: "## How does [topic] work?\\n\\nThe process involves several steps:\\n\\n1. [step1]\\n2. [step2]\\n3. [step3]"
      },
      {
        type: "quiz",
        questions: [
          {
            q: "[question1]",
            options: ["[option1]", "[option2]", "[option3]", "[option4]"],
            answerIndex: 0
          }
        ]
      },
      {
        type: "text",
        content: "## Real-world Applications\\n\\n[topic] is used in many real-world situations:\\n\\n- [application1]\\n- [application2]\\n- [application3]"
      },
      {
        type: "callout",
        title: "Key Takeaways",
        content: "Remember:\\n- [takeaway1]\\n- [takeaway2]\\n- [takeaway3]"
      }
    ]
  }
};

export default lesson as Lesson;`,
      variables: ['topic', 'objective1', 'objective2', 'objective3', 'definition', 'importance', 'svg_content', 'step1', 'step2', 'step3', 'question1', 'option1', 'option2', 'option3', 'option4', 'application1', 'application2', 'application3', 'takeaway1', 'takeaway2', 'takeaway3'],
      qualityScore: 0.92,
      usageCount: 0
    })
    
    // Add more templates as needed...
  }
  
  private addTemplate(template: ContentTemplate): void {
    this.templates.set(template.id, template)
  }
}

/**
 * Template-based content generation
 */
export class TemplateBasedGenerator {
  private library: ContentTemplateLibrary
  
  constructor() {
    this.library = new ContentTemplateLibrary()
  }
  
  /**
   * Generate content using the best matching template
   */
  generateContent(outline: string, lessonType: string): {
    content: string
    templateUsed: string
    confidence: number
    variables: Record<string, string>
  } | null {
    const match = this.library.findBestTemplate(outline, lessonType)
    
    if (!match || match.confidence < 0.5) {
      return null
    }
    
    const content = this.library.generateFromTemplate(match.template, match.variables)
    
    return {
      content,
      templateUsed: match.template.name,
      confidence: match.confidence,
      variables: match.variables
    }
  }
  
  /**
   * Get template recommendations for an outline
   */
  getTemplateRecommendations(outline: string, lessonType: string): Array<{
    template: ContentTemplate
    matchScore: number
    reason: string
  }> {
    const candidates = Array.from(this.library['templates'].values())
      .filter(t => t.lessonType === lessonType)
      .map(template => ({
        template,
        matchScore: this.library['calculateMatchScore'](outline, template),
        reason: this.generateRecommendationReason(outline, template)
      }))
      .filter(match => match.matchScore > 0.2)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)
    
    return candidates
  }
  
  private generateRecommendationReason(outline: string, template: ContentTemplate): string {
    const outlineLower = outline.toLowerCase()
    const templateLower = template.name.toLowerCase()
    
    if (outlineLower.includes(template.category.toLowerCase())) {
      return `Matches the ${template.category} category`
    }
    
    if (templateLower.includes('basic') && outlineLower.includes('basic')) {
      return 'Suitable for basic level content'
    }
    
    if (templateLower.includes('interactive') && outlineLower.includes('interactive')) {
      return 'Perfect for interactive content'
    }
    
    return 'Good general match for your content type'
  }
}

/**
 * Template performance monitoring
 */
export function monitorTemplatePerformance(): {
  templateStats: any
  recommendations: string[]
  optimizationOpportunities: string[]
} {
  const library = new ContentTemplateLibrary()
  const stats = library.getTemplateStats()
  
  const recommendations: string[] = []
  const optimizationOpportunities: string[] = []
  
  // Analyze usage patterns
  if (stats.mostUsedTemplates.length > 0) {
    const mostUsed = stats.mostUsedTemplates[0]
    if (mostUsed.usageCount > 50) {
      recommendations.push(`Consider creating variations of the "${mostUsed.name}" template`)
    }
  }
  
  // Analyze quality scores
  if (stats.averageQualityScore < 0.8) {
    optimizationOpportunities.push('Improve overall template quality')
  }
  
  // Analyze template distribution
  const totalTemplates = stats.totalTemplates
  Object.entries(stats.templatesByType).forEach(([type, count]) => {
    const percentage = (count / totalTemplates) * 100
    if (percentage < 20) {
      optimizationOpportunities.push(`Add more ${type} templates`)
    }
  })
  
  return {
    templateStats: stats,
    recommendations,
    optimizationOpportunities
  }
}
