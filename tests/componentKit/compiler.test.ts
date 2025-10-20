import { describe, expect, it } from "@jest/globals";
import { compileComponentTsx } from "../../src/worker/componentKit/compiler";

const okTsx = `
export default function Component() {
  return null as any;
}
`;

const badTsx = `
export default function Component(): JSX.Element {
  return (
    <div>
      <span>{doesNotExist}</span>
    </div>
  );
}
`;

describe("compileComponentTsx", () => {
  it("compiles valid TSX successfully", () => {
    const res = compileComponentTsx({ tsxSource: okTsx });
    expect(res.success).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.emittedFiles.length).toBeGreaterThan(0);
  });

  it("fails on invalid TSX", () => {
    const res = compileComponentTsx({ tsxSource: badTsx });
    expect(res.success).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });
});


