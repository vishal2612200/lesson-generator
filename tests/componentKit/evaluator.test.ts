import { describe, expect, it } from "@jest/globals";
import { evaluateSSRHtml } from "../../src/worker/componentKit/evaluator";

describe("Evaluator", () => {
  it("scores friendly, accessible HTML higher", () => {
    const html = `
<div class="p-4 text-gray-900">
  <h1 class="text-2xl font-bold">Let's learn fractions</h1>
  <p>It's fun to try new problems!</p>
  <p class="text-lg">Bigger text for readability.</p>
  </div>`;
    const res = evaluateSSRHtml(html, {
      gradeBand: "3-5",
      readingLevel: "basic",
      languageTone: "friendly",
      cognitiveLoad: "low",
      accessibility: { minFontSizePx: 16, highContrast: true, captionsPreferred: false }
    });
    expect(res.score).toBeGreaterThan(0.7);
  });
});



