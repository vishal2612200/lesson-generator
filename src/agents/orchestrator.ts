import { PlannerAgent, LessonPlan } from './planner'
import { ContentCreatorAgent, LessonContent } from './contentCreator'
import { AgentCommunication } from './base'

export interface MultiAgentResult {
  success: boolean
  plan: LessonPlan
  content: LessonContent
  trace: AgentCommunication[]
  totalDurationMs: number
}

/**
 * Orchestrator for multi-agent lesson generation
 * 
 * Phase 1: Coordinates Planner and Content Creator agents
 * Future phases will add Critic, Refiner, Coder, and Debugger agents
 */
export class MultiAgentOrchestrator {
  private planner: PlannerAgent
  private creator: ContentCreatorAgent
  private trace: AgentCommunication[] = []
  
  constructor() {
    this.planner = new PlannerAgent()
    this.creator = new ContentCreatorAgent()
  }
  
  /**
   * Generate lesson content using multi-agent approach (Phase 1)
   */
  async generateContent(outline: string): Promise<MultiAgentResult> {
    const overallStartTime = Date.now()
    this.trace = []
    
    this.logStep('orchestrator', 'start', {
      input: { outline },
      output: { status: 'planning' },
      reasoning: 'Initiating multi-agent content generation'
    })
    
    try {
      // Step 1: Create lesson plan
      console.log('[Multi-Agent] Step 1: Planning...')
      const planResult = await this.planner.execute({ outline })
      
      this.logStep(
        this.planner['name'],
        'plan_created',
        {
          input: { outline },
          output: planResult.data,
          reasoning: planResult.reasoning
        },
        planResult.metadata.durationMs
      )
      
      if (!planResult.success) {
        throw new Error('Planning phase failed')
      }
      
      const plan = planResult.data
      console.log('[Multi-Agent] Plan created:', {
        type: plan.lessonType,
        objectives: plan.learningObjectives.length,
        difficulty: plan.difficulty
      })
      
      // Step 2: Generate content based on plan
      console.log('[Multi-Agent] Step 2: Creating content...')
      const contentResult = await this.creator.execute({
        plan,
        originalOutline: outline
      })
      
      this.logStep(
        this.creator['name'],
        'content_generated',
        {
          input: { plan, outline },
          output: contentResult.data,
          reasoning: contentResult.reasoning
        },
        contentResult.metadata.durationMs
      )
      
      if (!contentResult.success) {
        throw new Error('Content creation phase failed')
      }
      
      const content = contentResult.data
      console.log('[Multi-Agent] Content created:', {
        title: content.title,
        type: content.type,
        hasContent: !!content.content
      })
      
      // Phase 1 complete
      const totalDuration = Date.now() - overallStartTime
      
      this.logStep('orchestrator', 'complete', {
        input: {},
        output: {
          success: true,
          planComplexity: plan.learningObjectives.length,
          contentGenerated: true
        },
        reasoning: `Successfully completed Phase 1 multi-agent generation in ${totalDuration}ms`
      })
      
      console.log('[Multi-Agent] Generation complete:', {
        totalSteps: this.trace.length,
        totalDurationMs: totalDuration
      })
      
      return {
        success: true,
        plan,
        content,
        trace: this.trace,
        totalDurationMs: totalDuration
      }
      
    } catch (error) {
      console.error('[Multi-Agent] Generation failed:', error)
      
      this.logStep('orchestrator', 'error', {
        input: {},
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        reasoning: 'Multi-agent generation encountered an error'
      })
      
      throw error
    }
  }
  
  /**
   * Log a step in the agent communication trace
   */
  private logStep(
    agent: string,
    action: string,
    data: {
      input: any
      output: any
      reasoning: string
    },
    durationMs: number = 0
  ): void {
    this.trace.push({
      step: this.trace.length + 1,
      agent,
      action,
      input: data.input,
      output: data.output,
      reasoning: data.reasoning,
      timestamp: new Date(),
      durationMs
    })
  }
  
  /**
   * Get the current trace
   */
  getTrace(): AgentCommunication[] {
    return this.trace
  }
  
  /**
   * Get trace summary for logging/analytics
   */
  getTraceSummary() {
    const agentSteps = this.trace.filter(t => t.agent !== 'orchestrator')
    const totalDuration = agentSteps.reduce((sum, t) => sum + t.durationMs, 0)
    const agents = new Set(agentSteps.map(t => t.agent))
    
    return {
      totalSteps: this.trace.length,
      agentSteps: agentSteps.length,
      agents: Array.from(agents),
      totalDurationMs: totalDuration,
      averageStepDurationMs: totalDuration / Math.max(agentSteps.length, 1)
    }
  }
}

