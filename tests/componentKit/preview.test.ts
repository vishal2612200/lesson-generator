import { describe, expect, it } from "@jest/globals";
import { renderPreview } from "../../src/worker/componentKit/preview";

describe("renderPreview", () => {
  it("renders a simple default export component to HTML", async () => {
    const React = require('react');
    const mod = {
      default: () => React.createElement('div', { className: 'p-2 text-gray-900' }, React.createElement('span', null, 'Hi'))
    } as any;
    const res = await renderPreview(mod, {});
    expect(res.success).toBe(true);
    expect(res?.html).toContain("Hi");
  });
});


