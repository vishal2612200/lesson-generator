/**
 * Component-based generation prompt
 * Generates full React components instead of JSON data
 * This removes token limitations and enables unlimited creativity
 */

export const COMPONENT_GENERATION_PROMPT = `{{PERSONA_INTRO}}

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
  - Include inline SVG diagrams that encode key Topic Entities and their relationships (no decorative shapes)
  - Add interactive elements (buttons, toggles, quizzes)
   - Progressive complexity (simple → advanced)
   - Real-world examples and applications

3. INTERACTIVITY:
   - Use state management for interactive features
   - Add click handlers, hover effects
  - At least one SVG micro-interaction (hover/click) that highlights a step/state aligned to the topic
   - Create quizzes with instant feedback
   - Include progress tracking
   - Add animations and transitions

4. VISUAL DESIGN (Design System):
   - Spacing: 4/6/8 rhythm; use gap-4/6/8 and p-4/6/8; avoid arbitrary values
   - Color: one primary + one accent + neutrals; dark-mode friendly (avoid pure #000/#fff)
   - Depth: subtle shadows (shadow, shadow-md) and rings (ring-1 ring-offset-1) for focus / grouping
   - Radius: rounded-xl/2xl for cards and key elements
   - Motion: transition-all duration-200 ease-out; visible hover/focus/active states; no gratuitous motion
   - Layout: max-w-4xl mx-auto, responsive stacks; comfortable line length
   - Surface: soft gradients (bg-gradient-to-br from-*-50 to-*-100) sparingly
   - UI Components: prefer '.btn' variants ('btn-primary', 'btn-outline') and '.input'/'input-lg' utilities for consistent buttons and fields

5. NO LIMITATIONS:
   - Generate as much content as needed (no artificial limits)
   - Create multiple sections, quizzes, diagrams
   - Add custom interactive elements
   - Include comprehensive explanations
   - Don't worry about length - be thorough!

6. TECHNICAL CONSTRAINTS (STRICTLY ENFORCED - YOUR CODE WILL BE REJECTED IF YOU VIOLATE THESE):
   - ONLY import from 'react' (useState, useEffect, useMemo, etc.)
   - NO external libraries WHATSOEVER - this is automatically validated and your code will be REJECTED
   - NO third-party imports (no recharts, no d3, no lodash, no moment, no framer-motion, no styled-components)
   - NO motion components (motion.div, motion.span, etc.) - these will cause RUNTIME ERRORS
   - NO chart libraries (LineChart, BarChart, etc.) - create simple SVG visualizations instead
  - Use inline SVG with viewBox (≥ 320×200), <title>/<desc>, aria-labelledby
  - Group related elements with <g>; label all meaningful marks with <text>
  - If color/shape encodes meaning, render a minimal legend
  - Include a short code comment mapping topic entities → SVG elements
  - Declare all variables/constants BEFORE using them (avoid temporal dead zone errors)

SVG DIAGRAM GENERATOR (strict)
1) Extract 2–4 Topic Entities from the Topic (nouns/states/actors/variables). List them.
2) Pick ONE pattern:
   - Process Flow (A→B→C), 
   - Compare/Contrast (X vs Y), 
   - Part–Whole (whole with labeled parts).
3) Create a Mapping Table (comment-only, not rendered):
   // entity: "<EntityName>" -> <shape> <selector>, color <hex>
   // relationship: "<A> -> <B>" -> <path> arrow
4) Render the diagram:
   - viewBox ≥ 320×200; className="w-full h-auto max-w-xl"; preserveAspectRatio="xMidYMid meet"
   - <title>/<desc> + aria-labelledby on <svg>
   - Group by <g data-entity="...">; label every meaningful mark with <text>
   - If color/shape encodes meaning, include a minimal legend
   - One micro-interaction that highlights a concept (hover/click toggles active state)
5) Alignment checks (must pass):
   - Labels use textAnchor="middle" and dominantBaseline="middle" and contain ≥2 exact Topic words
   - At least one relationship drawn with an arrow or ordered alignment
   - No decorative shapes without labels
   - Coordinates arranged on a simple grid (x in {40,160,280,400}, y in {40,120,200}) with ≥16px outer margin
   - Keep all <text> within the viewBox with ≥16px margin; truncate labels >18 chars (append …)
6) Optional clipping for complex diagrams:
   - Use <clipPath> to constrain overflowing groups (legend or dense parts)
   - All logic must be in the component
   - No external API calls
   - No Node.js built-ins
   - className MUST be a normal quoted string (no template literals)
   - Do NOT use string template literals (\`...\`) anywhere unless fully closed and valid
   - Prefer simple const declarations; avoid ambient module declarations
   - Create custom components instead of using external libraries
   - Use React hooks and vanilla JavaScript for all functionality
   - ALL components and variables MUST be defined within the file - no undefined references
   - If you need a chart, create a simple SVG visualization using basic shapes
   - If you need animation, use CSS transitions and transforms, NOT external animation libraries
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 p-6">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-8 text-white mb-8 shadow-md ring-1 ring-white/20">
          <h1 className="text-4xl font-bold mb-2">🌱 Photosynthesis Explained</h1>
          <p className="text-base opacity-90">Discover how plants make their own food using sunlight!</p>
        </div>

        {/* Introduction Section */}
        <section className="bg-white rounded-2xl p-8 shadow mb-6 ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What is Photosynthesis?</h2>
          <p className="text-gray-700 mb-4">
            Photosynthesis is like a magical recipe that plants use to make food! 
            Just like you need ingredients to bake cookies, plants need three main ingredients...
          </p>
          {/* Add more content */}
        </section>

        {/* Interactive Diagram */}
        <section className="bg-white rounded-2xl p-8 shadow mb-6 ring-1 ring-slate-200">
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
        <section className="bg-white rounded-2xl p-8 shadow mb-6 ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Test Your Knowledge</h2>
          <div className="space-y-4">
            <p className="text-lg font-semibold">{questions[0].q}</p>
            <div className="space-y-2">
              {questions[0].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => checkAnswer(index)}
                  className="w-full p-4 rounded-xl text-left transition-all duration-200 ease-out ring-1 ring-slate-200 hover:ring-sky-300 hover:shadow-md"
                  disabled={selectedAnswer !== null}
                >
                  {option}
                </button>
              ))}
            </div>
            {showExplanation && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                <p className="text-blue-900">{questions[0].explanation}</p>
              </div>
            )}
          </div>
        </section>

        {/* Summary Section */}
        <section className="bg-gradient-to-r from-slate-100 to-sky-100 rounded-2xl p-8 ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4"> Great Job!</h2>
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
7. If an SVG is present, ensure it encodes Topic Entities and at least one relationship; replace decorative shapes with labeled, topic-specific elements
8. Declares all variables/constants BEFORE using them (fixes temporal dead zone errors like "Cannot access before initialization")

CRITICAL OUTPUT RULES:
- Output ONLY raw TypeScript TSX component code
- Do NOT include any prose, explanations, headings, or markdown
- Do NOT wrap the output in markdown code fences

Output the corrected code now:`
