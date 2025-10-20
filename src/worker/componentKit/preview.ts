import * as React from "react";

export type PreviewResult = {
  success: boolean;
  html?: string;
  error?: string;
};

// Given a compiled component module (default export), SSR-render to string.
export async function renderPreview(loadedModule: unknown, props: Record<string, unknown> = {}): Promise<PreviewResult> {
  try {
    if (!loadedModule || typeof loadedModule !== "object" || !("default" in (loadedModule as any))) {
      return { success: false, error: "Module has no default export" };
    }
    const Component = (loadedModule as any).default as any;
    const element = (React as any).createElement(Component, props);
    // Lazy-load react-dom/server to avoid Next.js static import guard in route handlers
    const rds = await import("react-dom/server");
    const html = rds.renderToString(element as any);
    return { success: true, html };
  } catch (err: any) {
    return { success: false, error: String(err?.message ?? err) };
  }
}


