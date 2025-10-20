import { Agent, AgentOutput } from './base'

export interface LessonPlan {
  lessonType: 'quiz' | 'one-pager' | 'explanation'
  learningObjectives: string[]
  targetAudience: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  structure: {
    sections: string[]
    estimatedQuestions?: number
    keyTopics: string[]
  }
  pedagogicalApproach: string
  qualityRequirements: string[]
}

export interface PlannerInput {
  outline: string
}

/**
 * Planner Agent - Educational Architect
 * 
 * Analyzes user requirements and creates a structured lesson plan.
 * This agent focuses on understanding learning goals and designing
 * the optimal structure before any content is created.
 */
export class PlannerAgent extends Agent<PlannerInput, LessonPlan> {
  constructor() {
    super(
      'planner',
      'Educational Architect',
      `You are an expert educational architect with deep expertise in curriculum design and instructional pedagogy.

Your role is to:
1. Carefully analyze the user's learning goals and requirements
2. Determine the optimal lesson structure and format
3. Define clear, measurable learning objectives
4. Create a detailed plan that guides content creation
5. Consider the target audience's prior knowledge and needs

You must think step-by-step and explain your reasoning process.
Always use the THINKING/ACTION format in your responses.

When creating plans:
- Be specific and detailed
- Consider pedagogical best practices
- Ensure objectives are measurable
- Match difficulty to audience
- Plan for progressive complexity`
    )
  }
  
  async execute(input: PlannerInput): Promise<AgentOutput<LessonPlan>> {
    const startTime = Date.now()
    
    try {
      // Up to 2 autorepair retries on invalid plan
      const MAX_RETRIES = 2
      let attempt = 0
      let plan: LessonPlan | null = null
      let lastRaw: string | null = null
      
      while (attempt <= MAX_RETRIES) {
        const result = await this.thinkAndAct(
          attempt === 0 ? 'Create a comprehensive lesson plan' : 'Fix and complete the previous lesson plan',
          {
            userOutline: input.outline,
            requirements: [
              'Determine the best lesson type (quiz, one-pager, explanation)',
              'Define 3-5 clear learning objectives',
              'Identify target audience and difficulty level',
              'Plan the structure and key topics',
              'Specify pedagogical approach',
              'Set quality requirements for content creation'
            ],
            previousPlan: lastRaw || undefined,
            instructions: attempt === 0 ? undefined : 'The previous plan was invalid or incomplete. Output ONLY a valid JSON plan matching the required schema, with lessonType, learningObjectives (3-5), difficulty, and structure (keyTopics).'
          }
        )
        lastRaw = result.action
        const parsed = this.parsePlan(result.action)
        if (this.validatePlan(parsed)) {
          plan = parsed
          break
        }
        attempt++
      }
      
      if (!plan) {
        // Synthetic minimal fallback plan from outline
        console.warn('[Planner] Using synthetic fallback plan')
        plan = this.syntheticPlan(input.outline)
      }
      
      return {
        success: true,
        data: plan,
        reasoning: 'Plan validated after ' + (attempt + 1) + ' attempt(s)',
        metadata: {
          agent: this.name,
          timestamp: new Date(),
          durationMs: Date.now() - startTime
        }
      }
    } catch (error) {
      console.error('Planner agent error:', error)
      throw error
    }
  }
  
  private parsePlan(planText: string): LessonPlan {
    // Try to extract JSON from the response
    const jsonPlan = this.extractJSON<LessonPlan>(planText)
    
    if (jsonPlan && this.validatePlan(jsonPlan)) {
      return jsonPlan
    }
    
    // Fallback: extract plan from text
    return this.extractPlanFromText(planText)
  }
  
  private extractPlanFromText(text: string): LessonPlan {
    // Extract lesson type
    let lessonType: 'quiz' | 'one-pager' | 'explanation' = 'quiz'
    if (text.toLowerCase().includes('one-pager')) {
      lessonType = 'one-pager'
    } else if (text.toLowerCase().includes('explanation')) {
      lessonType = 'explanation'
    }
    
    // Extract objectives
    const objectivesMatch = text.match(/(?:objectives?|goals?):\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)
    const objectives = objectivesMatch?.[1]
      ?.split(/\n/)
      .filter(line => line.trim().match(/^[-•*\d]/))
      .map(line => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(obj => obj.length > 0) || []
    
    // Extract difficulty
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
    if (text.toLowerCase().includes('beginner') || text.toLowerCase().includes('basic')) {
      difficulty = 'beginner'
    } else if (text.toLowerCase().includes('advanced') || text.toLowerCase().includes('expert')) {
      difficulty = 'advanced'
    }
    
    // Extract key topics
    const topicsMatch = text.match(/(?:topics?|covers?):\s*([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)
    const keyTopics = topicsMatch?.[1]
      ?.split(/\n/)
      .filter(line => line.trim().match(/^[-•*\d]/))
      .map(line => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(topic => topic.length > 0) || []
    
    return {
      lessonType,
      learningObjectives: objectives.slice(0, 5),
      targetAudience: 'general learners',
      difficulty,
      structure: {
        sections: [],
        estimatedQuestions: lessonType === 'quiz' ? 5 : undefined,
        keyTopics: keyTopics.slice(0, 5)
      },
      pedagogicalApproach: 'Progressive complexity with clear explanations',
      qualityRequirements: [
        'Clear and unambiguous content',
        'Accurate information',
        'Engaging presentation',
        'Appropriate difficulty level'
      ]
    }
  }
  
  private validatePlan(plan: any): boolean {
    if (!plan || typeof plan !== 'object') return false
    
    return (
      plan.lessonType &&
      ['quiz', 'one-pager', 'explanation'].includes(plan.lessonType) &&
      Array.isArray(plan.learningObjectives) &&
      plan.learningObjectives.length > 0 &&
      plan.difficulty &&
      ['beginner', 'intermediate', 'advanced'].includes(plan.difficulty) &&
      plan.structure && Array.isArray(plan.structure.keyTopics)
    )
  }

  private syntheticPlan(outline: string): LessonPlan {
    // Heuristic: if outline contains quiz/test, choose quiz, else explanation
    const lower = outline.toLowerCase()
    const isQuiz = /(quiz|test|questions?)/.test(lower)
    const lessonType: 'quiz' | 'one-pager' | 'explanation' = isQuiz ? 'quiz' : 'explanation'
    const objectives = isQuiz
      ? [
          'Recall key facts from the topic',
          'Demonstrate basic understanding',
          'Identify correct answers from options'
        ]
      : [
          'Explain the core concept clearly',
          'Provide examples appropriate for students',
          'Check understanding with a brief activity'
        ]
    const keyTopics = outline.split(/[,;]| and | with /i).map(s => s.trim()).filter(Boolean).slice(0, 5)
    return {
      lessonType,
      learningObjectives: objectives,
      targetAudience: 'school students',
      difficulty: 'beginner',
      structure: {
        sections: [],
        estimatedQuestions: isQuiz ? 10 : undefined,
        keyTopics
      },
      pedagogicalApproach: isQuiz ? 'Retrieval practice with feedback' : 'Explicit instruction with guided examples',
      qualityRequirements: [
        'Age-appropriate language',
        'No placeholder URLs',
        'Interactive elements where suitable'
      ]
    }
  }
}

