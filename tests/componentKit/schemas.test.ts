import { describe, expect, it } from "@jest/globals";
import { z } from "zod";
import {
  PedagogyProfileSchema,
  ComponentMetaSchema,
  ComponentArtifactSchema,
  ComponentPlanSchema
} from "../../src/worker/componentKit/schemas";

describe("componentKit schemas", () => {
  it("validates a basic pedagogy profile", () => {
    const parsed = PedagogyProfileSchema.parse({
      gradeBand: "3-5",
      readingLevel: "basic",
      languageTone: "friendly",
      cognitiveLoad: "low",
      accessibility: { minFontSizePx: 16, highContrast: true, captionsPreferred: false }
    });
    expect(parsed.gradeBand).toBe("3-5");
  });

  it("validates component meta", () => {
    const meta = ComponentMetaSchema.parse({
      name: "NumberLineIntro",
      learningObjective: "Introduce number line basics",
      interactivityLevel: "low",
      propsSchemaJson: JSON.stringify({ type: "object", properties: { title: { type: "string" } } })
    });
    expect(meta.name).toBe("NumberLineIntro");
  });

  it("validates component artifact", () => {
    const artifact = ComponentArtifactSchema.parse({
      meta: {
        name: "NumberLineIntro",
        learningObjective: "Introduce number line basics",
        interactivityLevel: "low",
        propsSchemaJson: JSON.stringify({ type: "object", properties: { title: { type: "string" } } })
      },
      pedagogy: {
        gradeBand: "6-8",
        readingLevel: "intermediate",
        languageTone: "friendly",
        cognitiveLoad: "medium",
        accessibility: { minFontSizePx: 16, highContrast: true, captionsPreferred: false }
      },
      componentTsx: "export default function Component(){ return (<div/>); }"
    });
    expect(artifact.meta.name).toBe("NumberLineIntro");
  });

  it("validates a simple plan", () => {
    const plan = ComponentPlanSchema.parse({
      topic: "Fractions",
      pedagogy: {
        gradeBand: "3-5",
        readingLevel: "basic",
        languageTone: "friendly",
        cognitiveLoad: "low",
        accessibility: { minFontSizePx: 16, highContrast: true, captionsPreferred: false }
      },
      items: [
        { name: "IntroCard", learningObjective: "Explain numerator and denominator" }
      ]
    });
    expect(plan.items.length).toBe(1);
  });
});



