import { describe, expect, it } from "@jest/globals";
import { attemptRepair } from "../../src/worker/componentKit/repair";

describe("Repair", () => {
  it("adds React import for jsx errors", () => {
    const src = `export default function Component(){ return (<div/>); }`;
    const fixed = attemptRepair(src, { errors: ["Cannot find name 'div'"] });
    expect(fixed.startsWith("import React from 'react';")).toBe(true);
  });
});



