import type { PedagogyProfile } from "./schemas";

export type Evaluation = {
  score: number; // 0..1
  reasons: string[];
};

// Simple heuristics: check tone words, sentence length, presence of headings, font-size classes
export function evaluateSSRHtml(html: string, pedagogy: PedagogyProfile): Evaluation {
  const reasons: string[] = [];
  let score = 1.0;

  // Tone keyword check (very naive)
  if (pedagogy.languageTone === "friendly") {
    const friendlyWords = ["let's", "great", "awesome", "fun", "try", "easy"];
    const found = friendlyWords.some(w => html.toLowerCase().includes(w));
    if (!found) { score -= 0.1; reasons.push("friendly tone words not detected"); }
  }

  // Accessibility: font size hints via Tailwind (text-lg or larger)
  if (pedagogy.accessibility.minFontSizePx >= 16) {
    const hasLargeText = /text-(lg|xl|2xl|3xl)/.test(html);
    if (!hasLargeText) { score -= 0.1; reasons.push("no large text classes found"); }
  }

  // Basic structure: headings and paragraphs
  if (!/<h[1-3][^>]*>/.test(html)) { score -= 0.1; reasons.push("missing headings (h1-h3)"); }
  if (!/<p[^>]*>/.test(html)) { score -= 0.05; reasons.push("missing paragraph text"); }

  if (score < 0) score = 0;
  if (score > 1) score = 1;
  return { score, reasons };
}



