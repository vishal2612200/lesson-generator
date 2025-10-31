import { callLLM } from "../llm";
import { ComponentPlan, ComponentPlanSchema, PedagogyProfile, ComponentArtifact, ComponentMetaSchema } from "./schemas";

/**
 * Extract JSON from LLM response using multiple strategies with progressive fallbacks
 */
function extractJsonFromResponse(content: string): string | null {
  // Strategy 1: Try parsing entire response as JSON
  try {
    const parsed = JSON.parse(content.trim());
    return JSON.stringify(parsed);
  } catch {}

  // Strategy 2: Find JSON code blocks (similar to extractTypeScriptFromResponse)
  const fence = '```';
  let start = -1;
  let best: { s: number; e: number } | null = null;
  
  for (let i = 0; i < content.length - 2; i++) {
    if (content.slice(i, i + 3) === fence) {
      if (start === -1) {
        start = i + 3;
      } else {
        const end = i;
        if (!best || end - start > best.e - best.s) {
          best = { s: start, e: end };
        }
        start = -1;
      }
    }
  }
  
  if (best) {
    let block = content.slice(best.s, best.e);
    // Strip optional language header on first line (json|typescript|tsx|ts)
    const langHeaders = ['json', 'typescript', 'tsx', 'ts'];
    for (const lang of langHeaders) {
      if (block.startsWith(`${lang}\n`)) {
        block = block.slice(lang.length + 1);
        break;
      }
    }
    try {
      const parsed = JSON.parse(block.trim());
      return JSON.stringify(parsed);
    } catch {}
  }

  // Strategy 3: Find JSON object boundaries by tracking brace counts
  let braceCount = 0;
  start = -1;
  const chars = content.split('');
  
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '{') {
      if (start === -1) start = i;
      braceCount++;
    } else if (chars[i] === '}') {
      braceCount--;
      if (braceCount === 0 && start !== -1) {
        try {
          const jsonStr = content.slice(start, i + 1);
          const parsed = JSON.parse(jsonStr);
          return JSON.stringify(parsed);
        } catch {}
        start = -1;
      }
    }
  }
  
  // Strategy 4: Fallback to regex (last resort)
  const match = content.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      return JSON.stringify(parsed);
    } catch {}
  }
  
  return null;
}

export type PlannerAgentInput = {
  topic: string;
  pedagogy: PedagogyProfile;
  lessonId?: string;
};

export async function plannerAgent(input: PlannerAgentInput): Promise<ComponentPlan> {
  const prompt = `You are an expert educational content designer. Analyze the user's request and create the RIGHT type of content.

TOPIC: "${input.topic}"
AUDIENCE: ${input.pedagogy.gradeBand} grade students
READING LEVEL: ${input.pedagogy.readingLevel}

=== STEP 1: IDENTIFY THE INTENT ===
Look for keywords in the topic to determine what the user wants:

IF topic contains: "test", "quiz", "assessment", "practice problems", "questions"
→ CREATE: Interactive quiz/test with questions, answer choices, scoring, feedback

IF topic contains: "explain", "understand", "what is", "how does", "introduction to"
→ CREATE: Educational explanation with examples, diagrams, step-by-step walkthrough

IF topic contains: "practice", "learn", "tutorial", "guide", "step-by-step"
→ CREATE: Interactive practice tool with hands-on exercises and immediate feedback

IF topic contains: "example", "demonstration", "show", "visualize"
→ CREATE: Interactive demonstration with visual examples

=== STEP 2: PLAN COMPONENTS ===
For "${input.topic}", plan 1-3 components that match the identified intent.

Each component should:
1. MATCH THE USER'S REQUEST (test → quiz, explain → explanation, practice → exercises)
2. Include appropriate interactive elements
3. Use visual aids relevant to the content type
4. Provide concrete examples
5. Give immediate feedback on user actions

=== EXAMPLES ===

For "A test on counting numbers":
- {"name": "CountingQuiz", "learningObjective": "Multiple choice quiz testing counting from 1-10 with scoring"}

For "Explain how photosynthesis works":
- {"name": "PhotosynthesisExplainer", "learningObjective": "Interactive diagram showing step-by-step photosynthesis process"}

For "Practice multiplication tables":
- {"name": "MultiplicationPractice", "learningObjective": "Random multiplication problems with instant feedback and score tracking"}

For "Understanding fractions":
- {"name": "FractionVisualizer", "learningObjective": "Interactive visual representation of fractions with examples"}

=== OUTPUT ===
Return ONLY valid JSON with this structure:
{
  "topic": "${input.topic}",
  "items": [
    {"name": "DescriptiveComponentName", "learningObjective": "Specific learning goal that matches user intent"}
  ]
}`;
  const model = process.env.MODEL_NAME || 'gpt-4o-mini';
  const resp = await callLLM(prompt, model);
  
  // Insert trace for planner agent
  if (input.lessonId) {
    try {
      const { supabaseAdmin } = await import('../../lib/supabase/server');
      const { error: traceError } = await (supabaseAdmin.from('traces') as any).insert({
        lesson_id: input.lessonId,
        attempt_number: 1,
        prompt,
        model,
        response: resp.content,
        tokens: resp.tokens,
        validation: {
          passed: true,
          errors: [],
        },
        compilation: {
          success: true,
          tsc_errors: [],
        },
      });
      
      if (traceError) {
        console.error('[PlannerAgent]  Failed to insert trace:', traceError);
      } else {
        console.log('[PlannerAgent]  Trace inserted successfully for lesson:', input.lessonId);
      }
    } catch (traceErr) {
      console.error('[PlannerAgent]  Exception inserting trace:', traceErr);
    }
  }
  
  // Extract JSON using multi-strategy approach
  const raw = extractJsonFromResponse(resp.content) ?? `{"topic":"${input.topic}","items":[{"name":"IntroCard","learningObjective":"Introduce core idea"}]}`;
  const plan = ComponentPlanSchema.safeParse({
    topic: input.topic,
    pedagogy: input.pedagogy,
    ...(JSON.parse(raw) as any)
  });
  if (!plan.success) {
    return {
      topic: input.topic,
      pedagogy: input.pedagogy,
      items: [ { name: "IntroCard", learningObjective: "Introduce the core idea simply" } ]
    };
  }
  return plan.data;
}

export type AuthorAgentInput = {
  name: string;
  learningObjective: string;
  topic: string;
  pedagogy: PedagogyProfile;
  lessonId?: string;
  attemptNumber?: number; // Unique attempt_number for this component
  componentIndex?: number; // Index of this component in the plan
};

import { getSelectedPersona, getPersonaIntro } from '../content/persona'

export async function authorAgent(input: AuthorAgentInput): Promise<ComponentArtifact> {
  const prompt = `${getPersonaIntro(getSelectedPersona())}

=== LESSON DETAILS ===
MAIN TOPIC: "${input.topic}"
COMPONENT FOCUS: "${input.learningObjective}"
AUDIENCE: ${input.pedagogy.gradeBand} grade level
READING LEVEL: ${input.pedagogy.readingLevel}

=== REQUIREMENTS ===
Your component MUST include:

1. INTERACTIVITY (choose at least 2):
   - Clickable buttons that change state
   - Toggle switches to show/hide content
   - Input fields for practice
   - Click counters or trackers
   - Step-by-step reveals
   - Hover effects with information
   - Color changes on interaction
   - Multiple examples users can cycle through

2. VISUAL ELEMENTS (choose at least 2):
   - SVG graphics or icons (use inline SVG, NOT external URLs)
   - Color-coded sections
   - Number/quantity visualizations
   - Diagrams or charts
   - Progress indicators
   - Visual comparisons
   - Animated state changes (CSS only)

3. EDUCATIONAL CONTENT:
   - Clear explanations in simple language
   - 2-3 concrete examples directly related to "${input.topic}"
   - Step-by-step breakdown
   - Practice or exploration opportunity
   - Visual representation of concepts

4. REACT STATE MANAGEMENT:
   - Use useState for interactive features
   - Track user progress or clicks
   - Show/hide content based on user actions
   - Update visual feedback on interaction

=== CONTENT TYPE GUIDANCE ===

IF this is a TEST/QUIZ (topic contains "test", "quiz", "assessment"):
- Create 3-5 multiple choice questions with options array
- CRITICAL: Ensure visual elements (SVG, images, counts) EXACTLY match the correct answer
- For counting questions: SVG circles/objects count MUST equal the correct answer number
- Store correct answer as a VALUE in the data structure
- Compare user selection VALUE with correct answer VALUE (not indices)
- Track score accurately (e.g., "3/5 correct")
- Show immediate feedback (✓ correct with green, ✗ incorrect with red)
- Include "Check Answer" button that validates the selected answer
- Include "Next Question" button to progress through quiz
- Display final results with score and encouraging message based on performance
- Example structure:
  questions = [
    { question: "How many stars?", correctAnswer: 5, options: [3, 5, 7], visual: <5 SVG stars> }
  ]
  // When checking: selectedValue === question.correctAnswer

IF this is an EXPLANATION (topic contains "explain", "understand", "what is"):
- Break concept into 2-3 clear steps
- Use diagrams, charts, or visual representations
- Include toggle buttons to reveal more details
- Show before/after or cause/effect comparisons
- Use color coding to highlight key concepts

IF this is PRACTICE (topic contains "practice", "learn", "tutorial"):
- Generate random practice problems
- Provide input fields for answers
- Give instant feedback on correctness
- Track progress (problems completed, accuracy)
- Include "Try Another" or "New Problem" button

IF this is a DEMONSTRATION (topic contains "example", "show", "visualize"):
- Create interactive visual examples
- Allow users to manipulate variables
- Show real-time results of changes
- Include multiple example scenarios to cycle through

=== QUALITY REQUIREMENTS ===
1. CORRECTNESS: Double-check all answers, calculations, and logic
   - If showing 5 stars visually, the answer must be 5
   - If checking correctness, compare actual values not array indices
   - Math problems: verify calculations are correct
   - Ensure all examples and explanations are factually accurate

2. CLARITY: Use clear, simple language appropriate for ${input.pedagogy.gradeBand} students
   - Avoid jargon unless explained
   - Use specific numbers and concrete examples
   - Break complex ideas into simple steps

3. ENGAGEMENT: Make it interactive and fun
   - Use colors to highlight important information
   - Provide encouraging feedback
   - Show progress and achievement
   - Make success feel rewarding

=== SVG DIAGRAM REQUIREMENTS ===
- Ground the diagram in 2–4 Topic Entities (from MAIN TOPIC / learning objective).
- Show at least one relationship (flow, dependency, cause→effect) using arrows or positioning.
- Label all meaningful shapes; include <title>/<desc>, aria-labelledby on the <svg>.
- If visual encodings (color/shape) carry meaning, include a minimal legend.
- Add a short code comment mapping entities → SVG elements (IDs/classes).
- Include one micro-interaction that reveals, focuses, or toggles a conceptually meaningful state.

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

=== CONSTRAINTS ===
- NO fetch, setTimeout, setInterval, or async operations
- NO document/window/DOM access (no document.title, window.alert, etc.)
- NO external URLs or image sources
- Use ONLY Tailwind CSS classes for styling
- Use inline SVG for any graphics with viewBox ≥ 320×200, <title>/<desc>, aria-labelledby; group with <g>; label marks with <text>; no external URLs/images
- Font size minimum: ${input.pedagogy.accessibility.minFontSizePx}px
- MUST start with 'use client'; directive
- Declare all variables/constants BEFORE using them (avoid temporal dead zone errors)

=== OUTPUT FORMAT ===
First, output your TSX component in a fenced code block:
\`\`\`tsx
'use client';
// Your component here
\`\`\`

Second, output metadata as JSON:
\`\`\`json
{
  "name": "${input.name}",
  "learningObjective": "${input.learningObjective}",
  "interactivityLevel": "high",
  "propsSchemaJson": "{\"type\":\"object\",\"properties\":{}}"
}
\`\`\`

Make this component engaging, interactive, and truly educational for "${input.topic}"!`;
  const model = process.env.MODEL_NAME || 'gpt-4o-mini';
  const resp = await callLLM(prompt, model);
  
  // Insert trace for author agent
  if (input.lessonId) {
    try {
      const { supabaseAdmin } = await import('../../lib/supabase/server');
      const attemptNumber = input.attemptNumber ?? 2; // Fallback to 2 for backward compatibility
      
      // Store component metadata in validation field
      const validation = {
        passed: true,
        errors: [],
        component: input.componentIndex !== undefined ? {
          name: input.name,
          index: input.componentIndex,
          learningObjective: input.learningObjective,
        } : undefined,
      };
      
      const { error: traceError } = await (supabaseAdmin.from('traces') as any).insert({
        lesson_id: input.lessonId,
        attempt_number: attemptNumber,
        prompt,
        model,
        response: resp.content,
        tokens: resp.tokens,
        validation,
        compilation: {
          success: true,
          tsc_errors: [],
        },
      });
      
      if (traceError) {
        console.error('[AuthorAgent]  Failed to insert trace:', traceError);
      } else {
        console.log(`[AuthorAgent]  Trace inserted successfully for lesson: ${input.lessonId}, attempt_number: ${attemptNumber}, component: ${input.name}`);
      }
    } catch (traceErr) {
      console.error('[AuthorAgent]  Exception inserting trace:', traceErr);
    }
  }
  
  // Extract code blocks (similar to extractTypeScriptFromResponse non-regex approach)
  const fence = '```';
  const blocks: string[] = [];
  let blockStart = -1;
  
  for (let i = 0; i < resp.content.length - 2; i++) {
    if (resp.content.slice(i, i + 3) === fence) {
      if (blockStart === -1) {
        blockStart = i + 3;
      } else {
        const end = i;
        let block = resp.content.slice(blockStart, end);
        // Strip optional language header on first line
        const langHeaders = ['tsx', 'typescript', 'ts', 'json'];
        for (const lang of langHeaders) {
          if (block.startsWith(`${lang}\n`)) {
            block = block.slice(lang.length + 1);
            break;
          }
        }
        blocks.push(block.trim());
        blockStart = -1;
      }
    }
  }
  
  const componentTsx = blocks[0] || resp.content.trim();
  const metaRaw = extractJsonFromResponse(blocks[1] || blocks[blocks.length - 1] || '{}') || '{}';
  let meta: any;
  try { meta = JSON.parse(metaRaw); } catch { meta = { name: input.name, learningObjective: input.learningObjective, interactivityLevel: "low", propsSchemaJson: JSON.stringify({ type: "object", properties: {} }) }; }
  const parsedMeta = ComponentMetaSchema.safeParse(meta);
  const safeMeta = parsedMeta.success ? parsedMeta.data : { name: input.name, learningObjective: input.learningObjective, interactivityLevel: "low" as const, propsSchemaJson: JSON.stringify({ type: "object", properties: {} }) };
  return {
    meta: safeMeta,
    pedagogy: input.pedagogy,
    componentTsx
  };
}



