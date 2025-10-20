export interface LLMResponse {
  content: string
  tokens?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

import { logger } from './logger';

/**
 * Call LLM to generate TypeScript lesson content
 * This is content-agnostic - the LLM should generate appropriate content based on the prompt
 * Includes retry logic for rate limiting
 */
export async function callLLM(
  prompt: string,
  model: string
): Promise<LLMResponse> {
  const llmTimer = logger.startTimer('llm_call');
  const apiKey = process.env.LLM_API_KEY_OR_MOCK

  logger.info('Starting LLM call', {
    operation: 'llm_call_start',
    stage: 'generation',
    metadata: {
      model,
      promptLength: prompt.length,
      maxTokens: Math.min(Number(process.env.LLM_MAX_TOKENS) || 6000, 12000),
      temperature: 0.6,
    },
  });

  if (apiKey === 'MOCK') {
    logger.warn('Using MOCK LLM - for production, set LLM_API_KEY_OR_MOCK to your OpenAI API key', {
      operation: 'mock_llm_warning',
      stage: 'generation',
    });
    const result = await mockLLMCall(prompt);
    llmTimer(true, { 
      model: 'MOCK',
      responseLength: result.content.length,
      tokens: result.tokens?.total_tokens || 0,
    });
    return result;
  }

  // Retry logic for rate limiting
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const attemptTimer = logger.startTimer(`llm_attempt_${attempt}`);
    
    try {
      logger.debug(`LLM attempt ${attempt}/${maxRetries}`, {
        operation: 'llm_attempt',
        stage: 'generation',
        metadata: {
          attempt,
          maxRetries,
          model,
        },
      });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.6,
          // Configurable completion size (defaults to 6000, capped at 12000)
          max_tokens: Math.min(Number(process.env.LLM_MAX_TOKENS) || 6000, 12000),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const result = {
          content: data.choices[0].message.content,
          tokens: {
            prompt_tokens: data.usage?.prompt_tokens,
            completion_tokens: data.usage?.completion_tokens,
            total_tokens: data.usage?.total_tokens,
          },
        };

        attemptTimer(true, {
          responseLength: result.content.length,
          tokens: result.tokens?.total_tokens || 0,
          finishReason: data.choices[0].finish_reason,
        });

        logger.info('LLM call successful', {
          operation: 'llm_success',
          stage: 'generation',
          metadata: {
            model,
            responseLength: result.content.length,
            tokens: result.tokens?.total_tokens || 0,
            promptTokens: result.tokens?.prompt_tokens || 0,
            completionTokens: result.tokens?.completion_tokens || 0,
            finishReason: data.choices[0].finish_reason,
            attempt,
          },
        });

        llmTimer(true, {
          model,
          responseLength: result.content.length,
          tokens: result.tokens?.total_tokens || 0,
          attempts: attempt,
        });

        return result;
      }

      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        // Exponential backoff with jitter (base 5s)
        const base = 5000
        const exp = Math.pow(3, attempt - 1)
        const jitter = Math.floor(Math.random() * 1500)
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : base * exp + jitter
        
        logger.warn('LLM rate limited, retrying with backoff', {
          operation: 'llm_rate_limited',
          stage: 'generation',
          errorType: 'RateLimitError',
          errorCode: 'RATE_LIMITED',
          metadata: {
            attempt,
            maxRetries,
            waitTimeMs: waitTime,
            retryAfter: retryAfter,
            status: response.status,
          },
        });
        
        attemptTimer(false, {
          error: 'rate_limited',
          waitTime,
          attempt,
        });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime))
          continue
        }
      }

      // Other errors
      const errorMessage = `LLM API error: ${response.status} ${response.statusText}`;
      logger.error('LLM API error', {
        operation: 'llm_api_error',
        stage: 'generation',
        errorType: 'APIError',
        errorCode: 'LLM_API_ERROR',
        metadata: {
          status: response.status,
          statusText: response.statusText,
          attempt,
          maxRetries,
        },
      });

      attemptTimer(false, {
        error: errorMessage,
        status: response.status,
        attempt,
      });

      throw new Error(errorMessage);
    } catch (error) {
      lastError = error as Error;
      const isRateError = /rate/i.test((error as any).message || '');
      
      logger.error('LLM call failed', {
        operation: 'llm_call_failed',
        stage: 'generation',
        errorType: 'LLMCallError',
        errorCode: 'LLM_CALL_FAILED',
        metadata: {
          attempt,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
          isRateError,
        },
      });

      attemptTimer(false, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
        isRateError,
      });

      if (attempt < maxRetries && isRateError) {
        const base = 5000
        const exp = Math.pow(3, attempt - 1)
        const jitter = Math.floor(Math.random() * 1500)
        const waitTime = base * exp + jitter
        
        logger.info('Retrying LLM call after rate error', {
          operation: 'llm_retry',
          stage: 'generation',
          metadata: {
            attempt,
            maxRetries,
            waitTimeMs: waitTime,
            error: error instanceof Error ? error.message : String(error),
          },
        });
        
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      if (attempt === maxRetries) {
        break
      }
    }
  }

  logger.error('LLM call failed after all retries', {
    operation: 'llm_final_failure',
    stage: 'generation',
    errorType: 'LLMFinalFailure',
    errorCode: 'LLM_FINAL_FAILURE',
    metadata: {
      maxRetries,
      finalError: lastError?.message || 'Unknown error',
    },
  });

  llmTimer(false, {
    maxRetries,
    finalError: lastError?.message || 'Unknown error',
  });

  throw lastError || new Error('LLM API call failed after retries')
}

/**
 * MOCK LLM for testing/development
 * Generates simple placeholder TypeScript lessons
 * For real content, use the actual OpenAI API
 */
function mockLLMCall(prompt: string): LLMResponse {
  console.log('[MOCK LLM] Generating placeholder lesson...')
  
  // Extract outline from prompt
  const outlineMatch = prompt.match(/outline[:\s]+(.*?)(?:\n\n|$)/is)
  const outline = outlineMatch ? outlineMatch[1].trim() : 'Sample lesson'
  
  // Determine type based on keywords
  const isQuiz = /quiz|test|questions?/i.test(outline)
  const isRichContent = /interactive|rich|blocks?/i.test(outline)
  
  if (isQuiz) {
    return generateMockQuiz(outline)
  } else if (isRichContent) {
    return generateMockRichContent(outline)
  } else {
    return generateMockOnePager(outline)
  }
}

function generateMockQuiz(outline: string): LLMResponse {
  const topic = outline.replace(/^(a|an|the)\s+/i, '').replace(/\s*(quiz|test|questions?|on|about).*$/i, '').trim()
  
  return {
    content: `export interface Lesson {
  title: string;
  description?: string;
  type: 'quiz';
  content: {
    questions: Array<{
      q: string;
      options: string[];
      answerIndex: number;
      explanation?: string;
    }>;
  };
}

const lesson: Lesson = {
  title: "Quiz: ${topic}",
  description: "${outline}",
  type: "quiz",
  content: {
    questions: [
      {
        q: "What is a key concept related to ${topic}?",
        options: [
          "Concept A",
          "Concept B",
          "Concept C",
          "Concept D"
        ],
        answerIndex: 0,
        explanation: "This is a placeholder question. In production, the real LLM will generate specific questions about ${topic}."
      },
      {
        q: "Which statement about ${topic} is correct?",
        options: [
          "Statement 1",
          "Statement 2",
          "Statement 3",
          "Statement 4"
        ],
        answerIndex: 1,
        explanation: "The real LLM will provide accurate, educational content based on the outline."
      },
      {
        q: "How does ${topic} relate to real-world applications?",
        options: [
          "Application A",
          "Application B",
          "Application C",
          "Application D"
        ],
        answerIndex: 2,
        explanation: "Production content will be specific and educational."
      }
    ]
  }
};

export default lesson as Lesson;`,
    tokens: {
      prompt_tokens: 200,
      completion_tokens: 400,
      total_tokens: 600,
    },
  }
}

function generateMockOnePager(outline: string): LLMResponse {
  const topic = outline.replace(/^(a|an|the)\s+/i, '').replace(/\s*(on|about|guide|explanation).*$/i, '').trim()
  
  return {
    content: `export interface Lesson {
  title: string;
  description?: string;
  type: 'one-pager' | 'explanation';
  content: {
    sections: Array<{
      heading: string;
      text: string;
    }>;
  };
}

const lesson: Lesson = {
  title: "${topic}",
  description: "${outline}",
  type: "explanation",
  content: {
    sections: [
      {
        heading: "Introduction",
        text: "This is a placeholder lesson about ${topic}. In production with a real LLM (OpenAI API), this will contain specific, accurate educational content based on the outline you provided."
      },
      {
        heading: "Key Concepts",
        text: "The real LLM will generate detailed explanations of the main concepts related to ${topic}, tailored for student learning."
      },
      {
        heading: "Examples and Applications",
        text: "Real examples and practical applications will be generated by the LLM based on the subject matter."
      },
      {
        heading: "Summary",
        text: "A comprehensive summary will wrap up the key points about ${topic}."
      }
    ]
  }
};

export default lesson as Lesson;`,
    tokens: {
      prompt_tokens: 200,
      completion_tokens: 500,
      total_tokens: 700,
    },
  }
}

function generateMockRichContent(outline: string): LLMResponse {
  const topic = outline.replace(/^(a|an|the)\s+/i, '').replace(/\s*(lesson|on|about).*$/i, '').trim()
  
  return {
    content: `export interface Lesson {
  title: string;
  description?: string;
  type: 'rich-content';
  content: {
    blocks: Array<any>;
  };
}

const lesson: Lesson = {
  title: "Interactive: ${topic}",
  description: "${outline}",
  type: "rich-content",
  content: {
    blocks: [
      {
        type: "text",
        content: "## ${topic}\\n\\nThis is a placeholder interactive lesson. In production, the real LLM will generate rich, varied content blocks based on your outline."
      },
      {
        type: "callout",
        variant: "info",
        title: "Note",
        content: "To see real content, configure your OpenAI API key in environment variables (LLM_API_KEY_OR_MOCK)."
      },
      {
        type: "text",
        content: "### Key Points\\n\\nThe LLM will generate specific educational content here."
      },
      {
        type: "quiz",
        questions: [
          {
            q: "Sample question about ${topic}?",
            options: ["Option A", "Option B", "Option C", "Option D"],
            answerIndex: 0,
            explanation: "Real questions will be generated based on the outline."
          }
        ]
      }
    ]
  }
};

export default lesson as Lesson;`,
    tokens: {
      prompt_tokens: 200,
      completion_tokens: 600,
      total_tokens: 800,
    },
  }
}

// Export analyzeOutline for testing purposes only
export interface OutlineAnalysis {
  type: 'quiz' | 'one-pager' | 'explanation' | 'rich-content'
  audience: 'elementary' | 'middle' | 'high' | 'general'
  style: 'inquiry' | 'worked-example' | 'story' | 'steps' | 'compare-contrast' | 'clear-explain'
  keyTerms: string[]
  objectives: string[]
  length?: {
    sections?: number
    questions?: number
  }
  tone: 'friendly' | 'formal' | 'encouraging' | 'neutral'
}

export function analyzeOutline(outline: string): OutlineAnalysis {
  const lower = outline.toLowerCase()
  
  // Type detection
  let type: OutlineAnalysis['type'] = 'explanation'
  if (/(quiz|test|questions|mcq)/i.test(lower)) type = 'quiz'
  else if (/(one-pager|onepager|summary)/i.test(lower)) type = 'one-pager'
  else if (/(rich content|interactive|blocks)/i.test(lower)) type = 'rich-content'

  // Audience detection
  let audience: OutlineAnalysis['audience'] = 'general'
  if (/(kids|children|elementary|grade [1-5])/i.test(outline)) audience = 'elementary'
  else if (/(middle school|grade (6|7|8))/i.test(outline)) audience = 'middle'
  else if (/(high school|grade (9|10|11|12))/i.test(outline)) audience = 'high'

  // Style detection
  let style: OutlineAnalysis['style'] = 'clear-explain'
  if (/(step by step|step-by-step|steps|procedure|algorithm)/i.test(outline)) style = 'steps'
  if (/(worked example|walkthrough|solve)/i.test(outline)) style = 'worked-example'
  if (/(story|imagine|scenario)/i.test(outline)) style = 'story'
  if (/(compare|contrast|vs\.|versus)/i.test(outline)) style = 'compare-contrast'
  if (/(why|investigate|explore|inquiry|question)/i.test(outline)) style = 'inquiry'

  // Extract key terms (simple approach)
  const words = outline.split(/\s+/).filter(w => w.length > 2)
  const commonWords = new Set(['a', 'an', 'the', 'is', 'of', 'on', 'and', 'how', 'to', 'with', 'for', 'what', 'why', 'where', 'when', 'lesson', 'quiz', 'explanation', 'guide', 'about'])
  const keyTerms: string[] = []
  words.forEach(word => {
    const cleaned = word.toLowerCase().replace(/[^a-z]/g, '')
    if (cleaned && !commonWords.has(cleaned)) {
      keyTerms.push(cleaned)
    }
  })

  // Extract objectives
  const objectives: string[] = []
  const objectiveVerbs = ['understand', 'explain', 'identify', 'describe', 'learn', 'master', 'solve', 'compare', 'contrast']
  objectiveVerbs.forEach(verb => {
    if (lower.includes(verb) && keyTerms.length > 0) {
      objectives.push(`Students will be able to ${verb} ${keyTerms[0]}`)
    }
  })
  if (objectives.length === 0 && keyTerms.length > 0) {
    objectives.push(`Students will be able to understand ${keyTerms[0]}`)
  }

  // Length hints
  const qMatch = outline.match(/(\d+)\s*(question|q\b|mcq|quiz)/i)
  const sMatch = outline.match(/(\d+)\s*(sections?|steps?|parts?)/i)
  const length = {
    questions: qMatch ? parseInt(qMatch[1]) : undefined,
    sections: sMatch ? parseInt(sMatch[1]) : undefined,
  }

  // Tone
  let tone: OutlineAnalysis['tone'] = 'encouraging'
  if (/(formal|academic|advanced)/i.test(outline)) tone = 'formal'
  else if (/(friendly|fun|easy)/i.test(outline)) tone = 'friendly'

  return { type, audience, style, keyTerms, objectives, length, tone }
}
