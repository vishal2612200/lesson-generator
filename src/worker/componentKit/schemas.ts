import { z } from "zod";

// Pedagogy profile captures the instructional constraints for generated components
export const PedagogyProfileSchema = z.object({
  gradeBand: z.enum([
    "K-2",
    "3-5",
    "6-8",
    "9-12"
  ]),
  readingLevel: z.enum(["emergent", "basic", "intermediate", "advanced"]).default("basic"),
  languageTone: z.enum(["friendly", "neutral", "formal"]).default("friendly"),
  cognitiveLoad: z.enum(["low", "medium", "high"]).default("medium"),
  accessibility: z.object({
    minFontSizePx: z.number().int().min(12).max(24).default(16),
    highContrast: z.boolean().default(true),
    captionsPreferred: z.boolean().default(false)
  }).default({ minFontSizePx: 16, highContrast: true, captionsPreferred: false })
});

export type PedagogyProfile = z.infer<typeof PedagogyProfileSchema>;

// Component meta accompanies the authored component with props schema and learning objective
export const ComponentMetaSchema = z.object({
  name: z.string().min(1).max(80),
  learningObjective: z.string().min(1).max(500),
  interactivityLevel: z.enum(["none", "low", "medium", "high"]).default("low"),
  propsSchemaJson: z.string().min(2), // stringified zod schema or TypeBox schema JSON
  assets: z.array(z.object({
    type: z.enum(["image", "audio", "video", "svg"]),
    src: z.string().url().or(z.string().min(1)), // allow data URLs or local identifiers
    alt: z.string().optional()
  })).optional()
});

export type ComponentMeta = z.infer<typeof ComponentMetaSchema>;

// Contract notes for the generated component. We cannot type-check the TSX here, but we can
// enforce metadata and structure externally. The compile step will enforce TS/JSX constraints.
export const ComponentArtifactSchema = z.object({
  meta: ComponentMetaSchema,
  pedagogy: PedagogyProfileSchema,
  componentTsx: z.string().min(1),
});

export type ComponentArtifact = z.infer<typeof ComponentArtifactSchema>;

// Plan for components derived from a prompt. This replaces rigid block JSON planning.
export const ComponentPlanItemSchema = z.object({
  name: z.string().min(1).max(80),
  learningObjective: z.string().min(1).max(500),
  suggestedProps: z.record(z.string(), z.unknown()).optional(),
});

export const ComponentPlanSchema = z.object({
  topic: z.string().min(1),
  pedagogy: PedagogyProfileSchema,
  items: z.array(ComponentPlanItemSchema).min(1).max(12)
});

export type ComponentPlan = z.infer<typeof ComponentPlanSchema>;

// Lightweight runtime props validation contract - we exchange the schema as JSON
// and validate via zod at runtime in the renderer.
export const RuntimePropValidationRequestSchema = z.object({
  propsSchemaJson: z.string().min(2),
  props: z.record(z.string(), z.unknown())
});

export type RuntimePropValidationRequest = z.infer<typeof RuntimePropValidationRequestSchema>;



