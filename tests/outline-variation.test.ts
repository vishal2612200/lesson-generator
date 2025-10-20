/**
 * Test: Outline-driven variation and alignment
 * Ensures different outlines produce different lessons with aligned content
 */

import { analyzeOutline } from '../src/worker/llm'
import { validateLessonContent } from '../src/worker/contentValidator'

describe('Outline-driven Content Generation', () => {
  test('analyzeOutline extracts different types from different outlines', () => {
    const quiz = analyzeOutline('A 10 question pop quiz on Florida')
    expect(quiz.type).toBe('quiz')
    expect(quiz.length?.questions).toBe(10)
    expect(quiz.keyTerms.some(t => t.toLowerCase().includes('florida'))).toBe(true)

    const onePager = analyzeOutline('A one-pager on how to divide with long division')
    expect(['one-pager', 'explanation']).toContain(onePager.type) // Both valid
    expect(onePager.keyTerms.some(t => t.toLowerCase().includes('divide'))).toBe(true)

    const explanation = analyzeOutline('An explanation of how the Cartesian Grid works')
    expect(explanation.type).toBe('explanation')
    expect(explanation.keyTerms.some(t => t.toLowerCase().includes('cartesian'))).toBe(true)
  })

  test('analyzeOutline detects different styles', () => {
    const inquiry = analyzeOutline('Why do plants need sunlight? An inquiry-based lesson')
    expect(inquiry.style).toBe('inquiry')

    const steps = analyzeOutline('Step by step guide to solving quadratic equations')
    expect(steps.style).toBe('steps')

    const story = analyzeOutline('Imagine a world without gravity - a story about physics')
    expect(story.style).toBe('story')
  })

  test('analyzeOutline extracts audience levels', () => {
    const elementary = analyzeOutline('A lesson for grade 3 students on addition')
    expect(elementary.audience).toBe('elementary')

    const middle = analyzeOutline('Middle school lesson on algebra basics')
    expect(middle.audience).toBe('middle')

    const general = analyzeOutline('A lesson on calculus concepts')
    expect(general.audience).toBe('general')
  })

  test('validateLessonContent checks outline alignment', () => {
    const lesson = {
      title: 'Quiz on Florida',
      type: 'quiz',
      content: {
        questions: [
          {
            q: 'What is the capital of Florida?',
            options: ['Miami', 'Tallahassee', 'Orlando', 'Tampa'],
            answerIndex: 1
          },
          {
            q: 'What is Florida known as?',
            options: ['Golden State', 'Sunshine State', 'Empire State', 'Lone Star State'],
            answerIndex: 1
          },
          {
            q: 'What ocean borders Florida on the east?',
            options: ['Pacific', 'Atlantic', 'Arctic', 'Indian'],
            answerIndex: 1
          }
        ]
      }
    }

    const outline = 'A quiz on Florida geography including capital and nickname'
    const validation = validateLessonContent(lesson, outline)
    
    // Alignment score should be reasonable (>0.3) for related content
    expect(validation.metrics.alignmentScore).toBeGreaterThanOrEqual(0.3)
    expect(validation.valid).toBe(true)
  })

  test('validateLessonContent flags poor alignment', () => {
    const lesson = {
      title: 'Generic Lesson',
      type: 'one-pager',
      content: {
        sections: [
          { heading: 'Introduction', text: 'This is a generic introduction to something' },
          { heading: 'Main Content', text: 'Here is some general content that does not match the outline' }
        ]
      }
    }

    const outline = 'A detailed lesson on photosynthesis including chloroplasts and glucose production'
    const validation = validateLessonContent(lesson, outline)
    
    expect(validation.metrics.alignmentScore).toBeLessThan(0.4)
    expect(validation.issues.some(i => i.includes('align'))).toBe(true)
  })

  test('Different outlines produce different key terms', () => {
    const math = analyzeOutline('A lesson on solving quadratic equations using the quadratic formula')
    const science = analyzeOutline('How do cells divide through mitosis and meiosis?')
    const history = analyzeOutline('The causes and effects of World War II')

    expect(math.keyTerms).not.toEqual(science.keyTerms)
    expect(science.keyTerms).not.toEqual(history.keyTerms)
    expect(math.keyTerms.some(t => t.toLowerCase().includes('quadratic'))).toBe(true)
    expect(science.keyTerms.some(t => t.toLowerCase().includes('cells') || t.toLowerCase().includes('mitosis'))).toBe(true)
  })

  test('Audience detection varies content tone', () => {
    const elementary = analyzeOutline('A fun lesson for grade 3 kids on counting to 100')
    expect(elementary.audience).toBe('elementary')
    expect(elementary.tone).toBe('friendly')

    const middle = analyzeOutline('Middle school lesson on the solar system')
    expect(middle.audience).toBe('middle')

    const general = analyzeOutline('A lesson on advanced calculus')
    expect(general.audience).toBe('general')
  })
})

