import { describe, expect, it } from "@jest/globals";
import { checkSafety } from "../../src/worker/componentKit/safety";

describe("SafetyGuard", () => {
  it("flags forbidden APIs", () => {
    const src = `
export default function Component(){
  fetch('/x');
  return <div/>;
}
`;
    const issues = checkSafety(src);
    expect(issues.find(i => i.rule === 'network-fetch')).toBeTruthy();
  });

  it("passes safe TSX", () => {
    const src = `
export default function Component(){
  return <div className="p-4">Hi</div>;
}
`;
    const issues = checkSafety(src);
    expect(issues.length).toBe(0);
  });
});



