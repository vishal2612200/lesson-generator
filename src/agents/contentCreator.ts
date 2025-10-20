import { Agent, AgentOutput } from './base'
import { LessonPlan } from './planner'

export interface LessonContent {
  title: string
  description: string
  type: 'quiz' | 'one-pager' | 'explanation'
  content: any
  designDecisions?: {
    questionChoice?: string[]
    distractorStrategy?: string[]
    difficultyProgression?: string
  }
}

export interface ContentCreatorInput {
  plan: LessonPlan
  originalOutline: string
}

/**
 * Content Creator Agent - Subject Matter Expert
 * 
 * Generates actual educational content based on the lesson plan.
 * This agent focuses on creating engaging, accurate, and pedagogically
 * sound content that meets the objectives defined in the plan.
 */
export class ContentCreatorAgent extends Agent<ContentCreatorInput, LessonContent> {
  constructor() {
    super(
      'content_creator',
      'Subject Matter Expert',
      `You are a master educator and subject matter expert with deep knowledge across multiple domains.

Your role is to:
1. Generate engaging and accurate educational content
2. Follow the lesson plan precisely
3. Ensure pedagogical quality and effectiveness
4. Create content that achieves the stated learning objectives
5. Make learning memorable and enjoyable

You must think step-by-step and explain your content design decisions.
Always use the THINKING/ACTION format in your responses.

For quizzes:
- Create questions that test understanding, not just recall
- Use plausible distractors (wrong answers) based on common misconceptions
- Progress from easier to harder questions
- Write clear, unambiguous questions
- Ensure exactly one correct answer

For explanations:
- Start with fundamentals and build complexity
- Use examples and analogies
- Break down complex concepts
- Connect to real-world applications

For one-pagers:
- Organize information logically
- Use clear headings and structure
- Balance detail with conciseness
- Include key takeaways`
    )
  }
  
  async execute(input: ContentCreatorInput): Promise<AgentOutput<LessonContent>> {
    const startTime = Date.now()
    
    try {
      const result = await this.thinkAndAct(
        'Generate high-quality lesson content based on the plan',
        {
          plan: input.plan,
          originalOutline: input.originalOutline,
          requirements: [
            `Create ${input.plan.lessonType} content`,
            `Achieve these learning objectives: ${input.plan.learningObjectives.join(', ')}`,
            `Target audience: ${input.plan.targetAudience}`,
            `Difficulty: ${input.plan.difficulty}`,
            `Quality requirements: ${input.plan.qualityRequirements.join(', ')}`
          ]
        }
      )
      
      const content = this.parseContent(result.action, input.plan)
      
      // Validate content
      if (!this.validateContent(content, input.plan)) {
        throw new Error('Generated content does not meet plan requirements')
      }
      
      return {
        success: true,
        data: content,
        reasoning: result.thinking,
        metadata: {
          agent: this.name,
          timestamp: new Date(),
          durationMs: Date.now() - startTime
        }
      }
    } catch (error) {
      console.error('Content Creator agent error:', error)
      throw error
    }
  }
  
  private parseContent(contentText: string, plan: LessonPlan): LessonContent {
    // Try to extract JSON from the response
    const jsonContent = this.extractJSON<LessonContent>(contentText)
    
    if (jsonContent && this.validateContent(jsonContent, plan)) {
      return jsonContent
    }
    
    // Fallback: extract content from text based on lesson type
    return this.extractContentFromText(contentText, plan)
  }
  
  private extractContentFromText(text: string, plan: LessonPlan): LessonContent {
    if (plan.lessonType === 'quiz') {
      return this.extractQuizContent(text, plan)
    }
    
    // For other types, create a simple structure
    return {
      title: this.extractTitle(text) || 'Generated Lesson',
      description: this.extractDescription(text) || '',
      type: plan.lessonType,
      content: { text }
    }
  }
  
  private extractQuizContent(text: string, plan: LessonPlan): LessonContent {
    const questions: any[] = []
    
    // Try to extract questions
    const questionMatches = text.matchAll(/(?:Question|Q)\s*(\d+):?\s*(.*?)(?=(?:Question|Q)\s*\d+:|$)/gis)
    
    for (const match of questionMatches) {
      const questionText = match[2].trim()
      
      // Extract options
      const optionMatches = questionText.matchAll(/(?:^|\n)\s*(?:[A-D][\).]|\d[\).])\s*([^\n]+)/g)
      const options: string[] = []
      
      for (const optMatch of optionMatches) {
        options.push(optMatch[1].trim())
      }
      
      // Try to find answer
      const answerMatch = questionText.match(/(?:answer|correct):\s*([A-D]|\d)/i)
      let answerIndex = 0
      if (answerMatch) {
        const answerLetter = answerMatch[1].toUpperCase()
        if (answerLetter >= 'A' && answerLetter <= 'D') {
          answerIndex = answerLetter.charCodeAt(0) - 'A'.charCodeAt(0)
        } else {
          answerIndex = parseInt(answerLetter) - 1
        }
      }
      
      // Extract just the question text (before options)
      const questionOnly = questionText.split(/(?:^|\n)\s*(?:[A-D][\).]|\d[\).])/).shift()?.trim() || questionText
      
      if (options.length >= 4) {
        questions.push({
          q: questionOnly,
          options: options.slice(0, 4),
          answerIndex: Math.max(0, Math.min(answerIndex, 3))
        })
      }
    }
    
    // If we didn't extract enough questions, create placeholder structure
    const estimatedQuestions = plan.structure.estimatedQuestions || 5
    while (questions.length < Math.min(estimatedQuestions, 3)) {
      questions.push({
        q: `Question ${questions.length + 1} about ${plan.structure.keyTopics[0] || 'the topic'}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answerIndex: 0
      })
    }
    
    return {
      title: this.extractTitle(text) || 'Quiz',
      description: this.extractDescription(text) || '',
      type: 'quiz',
      content: {
        questions: questions.slice(0, estimatedQuestions)
      }
    }
  }
  
  private extractTitle(text: string): string | null {
    const titleMatch = text.match(/(?:title|lesson):\s*([^\n]+)/i)
    return titleMatch?.[1]?.trim() || null
  }
  
  private extractDescription(text: string): string | null {
    const descMatch = text.match(/(?:description|summary):\s*([^\n]+)/i)
    return descMatch?.[1]?.trim() || null
  }
  
  private validateContent(content: any, plan: LessonPlan): boolean {
    if (!content || typeof content !== 'object') return false
    
    // Basic structure validation
    if (!content.title || !content.type || !content.content) return false
    
    // Type-specific validation
    if (plan.lessonType === 'quiz') {
      if (!Array.isArray(content.content?.questions)) return false
      if (content.content.questions.length < 3) return false
      
      // Validate question structure
      return content.content.questions.every((q: any) =>
        q.q &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.answerIndex === 'number' &&
        q.answerIndex >= 0 &&
        q.answerIndex <= 3
      )
    }
    
    return true
  }
}

