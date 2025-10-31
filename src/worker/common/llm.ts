export interface LLMResponse {
  content: string
  tokens?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

import { logger } from './logger';
import OpenAI from 'openai'

/**
 * Call LLM to generate TypeScript lesson content
 * This is content-agnostic - the LLM should generate appropriate content based on the prompt
 * Includes retry logic for rate limiting
 */
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type PromptInput = string | { system?: string; user: string } | ChatMessage[]

export async function callLLM(
  prompt: PromptInput,
  model: string
): Promise<LLMResponse> {
  const llmTimer = logger.startTimer('llm_call');
  const apiKey = process.env.LLM_API_KEY_OR_MOCK

  const promptLength = typeof prompt === 'string'
    ? prompt.length
    : Array.isArray(prompt)
      ? prompt.reduce((n, m) => n + m.content.length, 0)
      : (prompt.system?.length || 0) + prompt.user.length

  logger.info('Starting LLM call', {
    operation: 'llm_call_start',
    stage: 'generation',
    metadata: {
      model,
      promptLength,
      maxTokens: Math.min(Number(process.env.LLM_MAX_TOKENS) || 6000, 12000),
      temperature: 0.6,
    },
  });

  if (apiKey === 'MOCK') {
    logger.warn('Using MOCK LLM - for production, set LLM_API_KEY_OR_MOCK to your OpenAI API key', {
      operation: 'mock_llm_warning',
      stage: 'generation',
    });
    const mockText = typeof prompt === 'string'
      ? prompt
      : Array.isArray(prompt)
        ? prompt.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
        : `${prompt.system ? `SYSTEM: ${prompt.system}\n\n` : ''}USER: ${prompt.user}`
    const result = await mockLLMCall(mockText);
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
  class EmptyLLMResponseError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'EmptyLLMResponseError'
    }
  }

  const openai = new OpenAI({ apiKey })

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

      const messages: ChatMessage[] = Array.isArray(prompt)
        ? prompt
        : typeof prompt === 'string'
          ? [{ role: 'user', content: prompt }]
          : [
              ...(prompt.system ? [{ role: 'system', content: prompt.system }] as ChatMessage[] : []),
              { role: 'user', content: prompt.user },
            ]

      const data = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.6,
        max_tokens: Math.min(Number(process.env.LLM_MAX_TOKENS) || 6000, 12000),
      })

      const result = {
        content: data.choices[0]?.message?.content?.trim() || '',
        tokens: {
          prompt_tokens: (data as any).usage?.prompt_tokens,
          completion_tokens: (data as any).usage?.completion_tokens,
          total_tokens: (data as any).usage?.total_tokens,
        },
      };

      if (!result.content) {
        const errorMessage = 'LLM returned empty content';
        logger.error(errorMessage, {
          operation: 'llm_empty_content',
          stage: 'generation',
          errorType: 'EmptyLLMResponseError',
          errorCode: 'LLM_EMPTY_CONTENT',
          metadata: { attempt, model },
        })
        attemptTimer(false, { error: 'empty_content', attempt })
        throw new EmptyLLMResponseError(errorMessage)
      }

      attemptTimer(true, {
        responseLength: result.content.length,
        tokens: result.tokens?.total_tokens || 0,
        finishReason: data.choices[0]?.finish_reason,
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
          finishReason: data.choices[0]?.finish_reason,
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
  const words = lower.split(/\s+/);
  
  // Type detection using keyword sets
  const QUIZ_KEYWORDS = new Set(['quiz', 'test', 'questions', 'question', 'mcq']);
  const ONEPAGER_KEYWORDS = new Set(['one-pager', 'onepager', 'summary', 'summaries']);
  const RICH_CONTENT_KEYWORDS = new Set(['rich', 'content', 'interactive', 'interactivity', 'blocks', 'block']);
  
  let type: OutlineAnalysis['type'] = 'explanation'
  if (words.some(w => QUIZ_KEYWORDS.has(w))) type = 'quiz'
  else if (words.some(w => ONEPAGER_KEYWORDS.has(w))) type = 'one-pager'
  else if (words.some(w => RICH_CONTENT_KEYWORDS.has(w))) type = 'rich-content'

  // Audience detection using keyword sets and phrase matching
  const ELEMENTARY_KEYWORDS = new Set(['kids', 'children', 'elementary']);
  const MIDDLE_KEYWORDS = new Set(['middle', 'school']);
  const HIGH_KEYWORDS = new Set(['high', 'school']);
  
  let audience: OutlineAnalysis['audience'] = 'general'
  const outlineLower = outline.toLowerCase();
  
  // Check for grade numbers first
  const gradePhrase = outlineLower.includes('grade') ? outlineLower : '';
  if (gradePhrase) {
    // Find "grade" followed by a number
    const gradeIndex = gradePhrase.indexOf('grade');
    if (gradeIndex !== -1) {
      let numStr = '';
      let i = gradeIndex + 5; // Start after "grade"
      while (i < gradePhrase.length && (gradePhrase[i] >= '0' && gradePhrase[i] <= '9' || gradePhrase[i] === ' ')) {
        if (gradePhrase[i] >= '0' && gradePhrase[i] <= '9') {
          numStr += gradePhrase[i];
        }
        i++;
      }
      const gradeNum = parseInt(numStr);
      if (gradeNum >= 1 && gradeNum <= 5) {
        audience = 'elementary';
      } else if (gradeNum >= 6 && gradeNum <= 8) {
        audience = 'middle';
      } else if (gradeNum >= 9 && gradeNum <= 12) {
        audience = 'high';
      }
    }
  }
  
  // If no grade number found, check keywords and phrases
  if (audience === 'general') {
    if (outlineLower.includes('kids') || outlineLower.includes('children') || outlineLower.includes('elementary') || 
        words.some(w => ELEMENTARY_KEYWORDS.has(w))) {
      audience = 'elementary';
    } else if (outlineLower.includes('middle school') || words.some(w => MIDDLE_KEYWORDS.has(w))) {
      audience = 'middle';
    } else if (outlineLower.includes('high school') || words.some(w => HIGH_KEYWORDS.has(w))) {
      audience = 'high';
    }
  }

  // Style detection using keyword sets and phrases
  const STEPS_KEYWORDS = new Set(['step', 'steps', 'procedure', 'algorithm', 'process']);
  const WORKED_EXAMPLE_KEYWORDS = new Set(['worked', 'example', 'walkthrough', 'solve', 'solution']);
  const STORY_KEYWORDS = new Set(['story', 'stories', 'imagine', 'scenario', 'scenarios']);
  const COMPARE_KEYWORDS = new Set(['compare', 'contrast', 'versus', 'vs']);
  const INQUIRY_KEYWORDS = new Set(['why', 'investigate', 'explore', 'inquiry', 'question']);
  
  let style: OutlineAnalysis['style'] = 'clear-explain'
  // Create phrase for phrase matching (remove non-word chars)
  let outlinePhrase = '';
  for (const char of outlineLower) {
    if ((char >= 'a' && char <= 'z') || char === ' ') {
      outlinePhrase += char;
    } else {
      outlinePhrase += ' ';
    }
  }
  if (words.some(w => STEPS_KEYWORDS.has(w)) || outlinePhrase.includes('step by step')) style = 'steps'
  if (words.some(w => WORKED_EXAMPLE_KEYWORDS.has(w)) || outlinePhrase.includes('worked example')) style = 'worked-example'
  if (words.some(w => STORY_KEYWORDS.has(w))) style = 'story'
  if (words.some(w => COMPARE_KEYWORDS.has(w))) style = 'compare-contrast'
  if (words.some(w => INQUIRY_KEYWORDS.has(w))) style = 'inquiry'

  // Extract key terms (simple approach)
  const outlineWordsForTerms = outline.split(/\s+/).filter(w => w.length > 2)
  const commonWords = new Set(['a', 'an', 'the', 'is', 'of', 'on', 'and', 'how', 'to', 'with', 'for', 'what', 'why', 'where', 'when', 'lesson', 'quiz', 'explanation', 'guide', 'about'])
  const keyTerms: string[] = []
  outlineWordsForTerms.forEach(word => {
    // Remove non-alphabetic characters
    let cleaned = '';
    for (const char of word.toLowerCase()) {
      if (char >= 'a' && char <= 'z') {
        cleaned += char;
      }
    }
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

  // Length hints - extract numbers with keyword matching
  let questions: number | undefined;
  let sections: number | undefined;
  
  const outlineLowerForLength = outline.toLowerCase();
  const wordsForLength = outlineLowerForLength.split(/\s+/);
  
  for (let i = 0; i < wordsForLength.length - 1; i++) {
    const num = parseInt(wordsForLength[i]);
    if (!isNaN(num)) {
      const nextWord = wordsForLength[i + 1];
      const nextNextWord = i + 2 < wordsForLength.length ? wordsForLength[i + 2] : '';
      if (nextWord.includes('question') || nextWord.includes('quiz') || nextWord.includes('mcq') || 
          (nextWord === 'q' && nextNextWord) || nextNextWord.includes('question')) {
        questions = num;
      } else if (nextWord.includes('section') || nextWord.includes('step') || nextWord.includes('part')) {
        sections = num;
      }
    }
  }
  
  const length = { questions, sections };

  // Tone detection using keyword sets
  const FORMAL_KEYWORDS = new Set(['formal', 'academic', 'advanced']);
  const FRIENDLY_KEYWORDS = new Set(['friendly', 'fun', 'easy']);
  
  let tone: OutlineAnalysis['tone'] = 'encouraging'
  if (words.some(w => FORMAL_KEYWORDS.has(w))) tone = 'formal'
  else if (words.some(w => FRIENDLY_KEYWORDS.has(w))) tone = 'friendly'

  return { type, audience, style, keyTerms, objectives, length, tone }
}
