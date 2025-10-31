import { validateSvgAlignment } from '../../src/worker/content/contentValidator'

describe('validateSvgAlignment', () => {
  const outline = 'Topic: Queue processing with enqueue and dequeue operations'

  it('flags missing svg', () => {
    const code = "export default function C(){ return (<div/>)}"
    const res = validateSvgAlignment(code, outline)
    expect(res.valid).toBe(false)
    expect(res.issues.some(i => i.toLowerCase().includes('no inline <svg>'))).toBe(true)
  })

  it('accepts reasonably aligned svg', () => {
    const code = `
      export default function C(){
        return (
          <svg viewBox="0 0 400 240" aria-labelledby="t d"><title id="t">Queue</title><desc id="d">Queue operations</desc>
            {/* entity: "Queue" → rect #queue, blue; entity: "Operation" → group .op */}
            <g data-entity="Queue"><rect id="queue" x="20" y="60" width="200" height="40" fill="#3b82f6"/></g>
            <g data-entity="Operation" className="op"><text x="30" y="85">enqueue</text></g>
            <path d="M 120 80 L 180 80" stroke="#111" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="22" y="120">dequeue</text>
          </svg>
        )
      }
    `
    const res = validateSvgAlignment(code, outline)
    expect(res.valid).toBe(true)
    expect(res.signals.hasViewBox).toBe(true)
    expect(res.signals.hasAria).toBe(true)
    expect(res.signals.labelCount).toBeGreaterThanOrEqual(2)
  })
})


