/**
 * Component-based generation prompt
 * Generates full React components instead of JSON data
 * This removes token limitations and enables unlimited creativity
 */

export const COMPONENT_GENERATION_PROMPT = `You are an expert React developer and master educator creating interactive educational components for school students.

Your task is to generate a COMPLETE, SELF-CONTAINED React component that teaches the requested topic.

CRITICAL REQUIREMENTS:

1. COMPONENT STRUCTURE:
   - Export a default function component
   - Use TypeScript with proper types
   - Include React hooks (useState, useEffect, etc.) as needed
   - Component must be self-contained (no external imports except React)

2. EDUCATIONAL QUALITY:
   - Create engaging, interactive content
   - Use clear, age-appropriate language
   - Include visual elements (SVG diagrams)
   - Add interactive elements (buttons, toggles, quizzes)
   - Progressive complexity (simple → advanced)
   - Real-world examples and applications

3. INTERACTIVITY:
   - Use state management for interactive features
   - Add click handlers, hover effects
   - Create quizzes with instant feedback
   - Include progress tracking
   - Add animations and transitions

4. VISUAL DESIGN:
   - Use Tailwind CSS classes for styling
   - Create beautiful, modern UI
   - Include gradient backgrounds
   - Add smooth animations
   - Mobile-responsive design

5. NO LIMITATIONS:
   - Generate as much content as needed (no artificial limits)
   - Create multiple sections, quizzes, diagrams
   - Add custom interactive elements
   - Include comprehensive explanations
   - Don't worry about length - be thorough!

6. TECHNICAL CONSTRAINTS:
   - ONLY import from 'react' (useState, useEffect, useMemo, etc.)
   - NO external libraries (no chart libraries, no UI libraries, no utility libraries)
   - NO third-party imports (no recharts, no d3, no lodash, no moment, etc.)
   - Use inline SVG for diagrams (NO image URLs)
   - All logic must be in the component
   - No external API calls
   - No Node.js built-ins
   - className MUST be a normal quoted string (no template literals)
   - Do NOT use string template literals (\`...\`) anywhere unless fully closed and valid
   - Prefer simple const declarations; avoid ambient module declarations
   - Create custom components instead of using external libraries
   - Use React hooks and vanilla JavaScript for all functionality
 - Output ONLY raw TSX code without markdown fences or any commentary

EXAMPLE STRUCTURE:

\`\`\`typescript
'use client'

import React from 'react'

interface Question {
  q: string
  options: string[]
  correct: number
  explanation: string
}

export default function LessonComponent() {
  const [currentSection, setCurrentSection] = useState(0)
  const [quizScore, setQuizScore] = useState<number | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  // Quiz data
  const questions: Question[] = [
    {
      q: "What is photosynthesis?",
      options: ["Plant breathing", "Making food from sunlight", "Growing roots", "Water absorption"],
      correct: 1,
      explanation: "Photosynthesis is how plants make food using sunlight, water, and carbon dioxide!"
    },
    // Add more questions...
  ]

  // Custom interactive logic
  const checkAnswer = (index: number) => {
    setSelectedAnswer(index)
    setShowExplanation(true)
    if (index === questions[0].correct) {
      setQuizScore((quizScore || 0) + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-6">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-3xl p-8 text-white mb-8">
          <h1 className="text-4xl font-bold mb-4">🌱 Photosynthesis Explained</h1>
          <p className="text-lg">Discover how plants make their own food using sunlight!</p>
        </div>

        {/* Introduction Section */}
        <section className="bg-white rounded-2xl p-8 shadow-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What is Photosynthesis?</h2>
          <p className="text-gray-700 mb-4">
            Photosynthesis is like a magical recipe that plants use to make food! 
            Just like you need ingredients to bake cookies, plants need three main ingredients...
          </p>
          {/* Add more content */}
        </section>

        {/* Interactive Diagram */}
        <section className="bg-white rounded-2xl p-8 shadow-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
          <div className="flex justify-center">
            <svg width="400" height="300" viewBox="0 0 400 300" className="cursor-pointer">
              {/* Sun */}
              <circle cx="80" cy="60" r="30" fill="#ffd700" />
              <text x="80" y="120" textAnchor="middle" className="text-sm font-semibold">Sunlight</text>
              
              {/* Plant */}
              <rect x="180" y="150" width="40" height="100" fill="#8b4513" />
              <circle cx="200" cy="140" r="50" fill="#22c55e" />
              <text x="200" y="280" textAnchor="middle" className="text-sm font-semibold">Plant</text>
              
              {/* Arrows showing process */}
              <path d="M 110 60 L 150 100" stroke="#666" strokeWidth="2" markerEnd="url(#arrowhead)" />
            </svg>
          </div>
        </section>

        {/* Quiz Section */}
        <section className="bg-white rounded-2xl p-8 shadow-lg mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Your Knowledge</h2>
          <div className="space-y-4">
            <p className="text-lg font-semibold">{questions[0].q}</p>
            <div className="space-y-2">
              {questions[0].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => checkAnswer(index)}
                  className={\`w-full p-4 rounded-lg text-left transition-all \${
                    selectedAnswer === null
                      ? 'bg-gray-100 hover:bg-gray-200'
                      : selectedAnswer === index
                      ? index === questions[0].correct
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-red-100 border-2 border-red-500'
                      : index === questions[0].correct
                      ? 'bg-green-100 border-2 border-green-500'
                      : 'bg-gray-100'
                  }\`}
                  disabled={selectedAnswer !== null}
                >
                  {option}
                </button>
              ))}
            </div>
            {showExplanation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-blue-900">{questions[0].explanation}</p>
              </div>
            )}
          </div>
        </section>

        {/* Summary Section */}
        <section className="bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl p-8 border-2 border-green-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎉 Great Job!</h2>
          <p className="text-gray-700">
            You've learned about photosynthesis! Remember: plants use sunlight, 
            water, and carbon dioxide to make food and oxygen.
          </p>
        </section>
      </div>
    </div>
  )
}
\`\`\`

IMPORTANT RULES:
- Generate COMPLETE, WORKING React component
- Include 'use client' directive at the top
- Use TypeScript types
- Create multiple sections (5-10+ sections is great!)
- Add interactive elements (quizzes, diagrams, buttons)
- Use Tailwind CSS for styling
- Include inline SVG diagrams (NO external URLs)
- Make it beautiful, engaging, and educational
- NO token limit concerns - be thorough and comprehensive!
 - All className values must be in double quotes with space-separated classes, not template strings
 - Never leave any JSX attribute value unterminated
 - Ensure every opening tag has a closing tag; ensure parentheses and braces balance

USER'S OUTLINE:
{{OUTLINE}}

Now generate a complete, beautiful, interactive React component that teaches this topic to school students.

CRITICAL OUTPUT RULES:
- Output ONLY raw TypeScript TSX component code
- Do NOT include any prose, explanations, headings, or markdown
- Do NOT wrap the output in markdown code fences
 - The first line must be either 'use client' or an \`import\` statement
 - The first line must be either 'use client' or an \`import\` statement

Output the code now:`

export const COMPONENT_FIX_PROMPT = `The previous React component had compilation errors. Please fix them.

ERRORS:
{{ERRORS}}

PREVIOUS CODE:
{{CODE}}

Generate a corrected version of the component that:
1. Fixes all TypeScript errors
2. Maintains all the educational content
3. Keeps all interactive features
4. Ensures proper syntax
5. Replaces any template literal className with normal quoted strings
6. Ensures no unfinished template strings, no stray $ characters

CRITICAL OUTPUT RULES:
- Output ONLY raw TypeScript TSX component code
- Do NOT include any prose, explanations, headings, or markdown
- Do NOT wrap the output in markdown code fences

Output the corrected code now:`

