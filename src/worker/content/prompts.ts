export const PRIMARY_PROMPT = `{{PERSONA_INTRO}}

QUALITY PRINCIPLES
- Pedagogy: clear objectives, scaffolded progression, active practice, immediate feedback
- Alignment: stay tightly aligned to the Topic; avoid unrelated examples
- Audience fit: use terminology and depth appropriate to the audience
- Clarity: concise explanations, concrete examples, explicit takeaways
- Accessibility: keyboard navigation, aria labels where relevant, sufficient contrast

SPECIFICITY WORKFLOW (perform internally; output only TSX)
1) Extract 5–10 Topic Entities (concepts, constraints, audience, verbs, contexts) from the Topic.
2) Ensure every section references ≥1 Topic Entity explicitly.
3) Include exactly 3 concrete examples tied to distinct Topic Entities; no generic fillers.
4) Self-check before output: if any section lacks a Topic Entity reference or an example is generic, fix and re-generate.

VISUAL MOTIFS (choose 1–2 to compose the page)
- Hero intro band
- Card Grid for core concepts
- Progress Banner (light emphasis)
- Callout for tips/warnings

VISUAL QUALITY RUBRIC
- Hierarchy: use clear heading sizes vs body; keep comfortable line length
- Spacing: consistent 4/6/8 cadence; use gap-* to separate groups
- Color: one primary scale + neutral; avoid rainbow palettes
- Depth: restrained shadow/ring to support grouping; not decorative
- Motion: subtle transitions (duration-200, ease-out) on interactive elements
- A11y: contrast ≥ AA; visible focus states on interactive elements

CONTENT STRUCTURE
1) Introduction: who this is for and learning goals
2) Core Concepts: 3–5 sections with examples mapped to the audience background
3) Practice: interactive checks with targeted feedback
4) Application: small project/task aligned to the Topic
5) Summary: key takeaways and next steps

INTERACTIVITY (use at least 3)
- Multiple choice with explanations
- Click-to-reveal hints
- Sequencing/drag-drop (or simulated sequencing via buttons)
- Self-assessment checkpoints
- Mini coding thought exercises (no external runtimes)

VISUAL DESIGN
DESIGN SYSTEM (apply consistently)
- Spacing: 4/6/8 rhythm; use gap-4/6/8 and p-4/6/8; avoid arbitrary values
- Color: one primary + one accent + neutrals; dark-mode friendly (avoid pure #000/#fff)
- Depth: subtle shadows (shadow, shadow-md) and rings (ring-1 ring-offset-1) for focus / grouping
- Radius: rounded-xl/2xl for cards and key elements
- Motion: transition-all duration-200 ease-out; hover/focus/active states visible; no gratuitous motion
- Layout: max-w-4xl mx-auto, responsive stacks (flex/stack on sm), comfortable line length
- Surface: soft gradients (bg-gradient-to-br from-*-50 to-*-100) sparingly
 - UI Components: use '.btn-primary', '.btn-outline' for actions; '.input'/'input-lg' for form fields; include hover/focus/disabled states

VISUAL DESIGN
- Use Tailwind classes with the above tokens; keep responsive layout and hierarchy
- Utility budget: use 12–18 utilities total; reuse classes across sections

INLINE SVG CONTRACT (diagram must encode the Topic, not decorative)
- Entity grounding: visualize 2–4 concrete Topic Entities extracted in step 1 (variables, states, actors, flows). No unlabeled generic shapes.
- Relationship mapping: represent at least 1 relationship (flow, cause→effect, before→after) using arrows or clear grouping/alignment.
- Labeling & a11y: every meaningful shape has a short <text> label; include <title> and <desc>, and aria-labelledby on <svg>.
- Legend/keys: if colors or marks carry meaning, render a simple legend explaining them.
- Accessibility & sizing: viewBox ≥ 320×200; className="w-full h-auto max-w-xl".
- Structure: group related elements with <g data-entity="…">; keep coordinates readable and consistent.
- Micro-interaction: at least one hover/click toggles a visual state that reflects a real concept (e.g., highlight a step/state).
- No externals: no external URLs or <image> tags.
- Internal mapping comment: include a short code comment mapping topic entities → SVG elements (e.g., // entity: "Queue" → rect #queue, blue).

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
   - viewBox ≥ 320×200; className="w-full h-auto max-w-xl"
   - preserveAspectRatio="xMidYMid meet" to avoid stretching and to center
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

TECHNICAL CONSTRAINTS (strict)
- React function component with TypeScript
- Only import from 'react'
- No external libraries or APIs
- No template literal className; use quoted string className
- Provide basic aria-* attributes where meaningful
- Declare all variables/constants BEFORE using them (avoid temporal dead zone errors)

TOPIC: {{OUTLINE}}

OUTPUT RULES (strict)
- Output ONLY raw TSX
- No prose or markdown outside code
- Do NOT wrap in code fences
- First line must be 'use client' or an import

VISUAL SELF-CHECK (perform internally; only output final TSX if all pass)
- Clear hierarchy present (headings vs body) and consistent spacing scale
- Primary + neutral color pairing with adequate contrast; dark-mode friendly
- At least one inline SVG meets the contract and is responsive
- At least one subtle transition and visible focus/active states
- Within the utility budget and classes are reused coherently; avoid arbitrary values
`;

export const FIX_LOOP_PROMPT = `You are a senior TypeScript/React engineer fixing a teaching component while preserving pedagogy and topic alignment.

## Error Details
{{ERRORS}}

## Original Code
{{CODE}}

## Fixing Guidelines

1. Resolve all TypeScript and JSX syntax errors
2. Keep educational content, interactivity, and feedback intact
3. Maintain quoted string className; remove template literals in className
4. Only import from 'react'; remove any other imports/usages
5. Ensure accessibility attributes remain or improve
6. Keep layout responsive and styles intact
7. If visuals are weak, upgrade to the Visual Quality Rubric
8. If no SVG is present, add one that meets the Inline SVG Contract
9. Declare all variables/constants BEFORE using them (fixes temporal dead zone errors)

## Requirements

- Output ONLY raw TypeScript TSX component code
- Do NOT include any prose or markdown
- Do NOT wrap the output in markdown code fences
- Fix all compilation errors and warnings
- Preserve educational intent and topic alignment
- Keep the component functional and responsive
- Ensure proper React patterns and hooks usage

## Visual Quality Rubric (enforce during fixes)
- Hierarchy, spacing cadence (4/6/8), primary+neutral color pairing, restrained depth, subtle motion, AA contrast, focus states

## Inline SVG Contract (if SVG exists or is added)
- viewBox (≥ 320×200), <title>/<desc>, aria-labelledby, grouped layers, labeled marks, responsive sizing (w-full h-auto max-w-xl), no external URLs

- Ensure the SVG encodes the lesson’s Topic Entities and at least one relationship; replace decorative shapes with labeled, topic-specific elements.

## Final Self-Check (perform internally; only output final TSX)
- All errors fixed; visuals match rubric; SVG meets contract; utility usage is coherent

Output the corrected code now:`;
