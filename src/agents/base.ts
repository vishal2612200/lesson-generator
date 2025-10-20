import { callLLM, LLMResponse } from '@/worker/llm'

/**
 * Base class for all agents in the multi-agent system
 * Provides common functionality like LLM calling and reasoning extraction
 */
export abstract class Agent<TInput = any, TOutput = any> {
  protected name: string
  protected role: string
  protected systemPrompt: string
  
  constructor(name: string, role: string, systemPrompt: string) {
    this.name = name
    this.role = role
    this.systemPrompt = systemPrompt
  }
  
  /**
   * Execute the agent's main task
   * Must be implemented by each agent
   */
  abstract execute(input: TInput): Promise<AgentOutput<TOutput>>
  
  /**
   * Call LLM with system and user prompts
   */
  protected async callLLMWithSystem(
    userPrompt: string,
    model?: string
  ): Promise<LLMResponse> {
    const fullPrompt = `${this.systemPrompt}\n\n${userPrompt}`
    return await callLLM(fullPrompt, model || process.env.MODEL_NAME || 'gpt-4')
  }
  
  /**
   * Execute a task with chain-of-thought reasoning
   * Agent explains its thinking before providing output
   */
  protected async thinkAndAct(
    task: string,
    context: Record<string, any>
  ): Promise<{ thinking: string; action: string }> {
    const prompt = this.buildThinkingPrompt(task, context)
    const response = await this.callLLMWithSystem(prompt)
    return this.parseThinkingAndAction(response.content)
  }
  
  /**
   * Build prompt that requests thinking + action format
   */
  private buildThinkingPrompt(
    task: string,
    context: Record<string, any>
  ): string {
    return `
TASK: ${task}

CONTEXT:
${JSON.stringify(context, null, 2)}

Please respond in this exact format:

THINKING:
[Your step-by-step reasoning process. Explain your analysis, considerations, and decision-making.]

ACTION:
[Your output/decision. Provide structured data or text as appropriate.]

Remember to be thorough in your thinking and clear in your action.
`
  }
  
  /**
   * Parse LLM response into thinking and action parts
   */
  private parseThinkingAndAction(
    response: string
  ): { thinking: string; action: string } {
    // Try to extract THINKING and ACTION sections
    const thinkingMatch = response.match(/THINKING:\s*([\s\S]*?)(?=ACTION:|$)/i)
    const actionMatch = response.match(/ACTION:\s*([\s\S]*?)$/i)
    
    const thinking = thinkingMatch?.[1]?.trim() || ''
    const action = actionMatch?.[1]?.trim() || response
    
    return { thinking, action }
  }
  
  /**
   * Extract JSON from text that might contain markdown or extra text
   */
  protected extractJSON<T = any>(text: string): T | null {
    try {
      // Try direct parsing first
      return JSON.parse(text)
    } catch {
      // Try to find JSON in code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1])
        } catch {
          return null
        }
      }
      
      // Try to find JSON-like structure
      const objectMatch = text.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0])
        } catch {
          return null
        }
      }
      
      return null
    }
  }
}

/**
 * Standard output format for all agents
 */
export interface AgentOutput<T = any> {
  success: boolean
  data: T
  reasoning: string
  metadata: AgentMetadata
}

export interface AgentMetadata {
  agent: string
  timestamp: Date
  durationMs: number
  tokensUsed?: number
}

/**
 * Communication log between agents
 */
export interface AgentCommunication {
  step: number
  agent: string
  action: string
  input: any
  output: any
  reasoning: string
  timestamp: Date
  durationMs: number
}

