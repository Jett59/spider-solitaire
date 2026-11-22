import type { CSSProperties } from 'react'
import { cardName, longestRun, type Card } from './gameRules'
import CardView from './Card'

function SlotSpider({ nervous }: { nervous: boolean }) {
  return <svg viewBox="0 0 160 130" aria-hidden="true" className="slot-spider">
    <g fill="none" stroke="#a477ed" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" className="slot-spider__legs">
      <path d="M58 55 34 35 25 17M55 66 25 55 12 38M55 78 24 85 10 104M62 88 43 108 40 122M102 55 126 35 135 17M105 66 135 55 148 38M105 78 136 85 150 104M98 88 117 108 120 122" />
    </g>
    <ellipse cx="80" cy="53" rx="33" ry="37" fill="#a477ed" stroke="#302044" strokeWidth="3" />
    <path d="M59 40Q62 26 76 24" stroke="#d8baff" strokeWidth="5" strokeLinecap="round" fill="none" />
    <ellipse cx="80" cy="79" rx="28" ry="25" fill="#7950b9" />
    <g fill="#fff9e9"><ellipse cx="69" cy="73" rx="9" ry={nervous ? 13 : 10} /><ellipse cx="91" cy="73" rx="9" ry={nervous ? 13 : 10} /></g>
    <g fill="#19172d"><ellipse cx={nervous ? 66 : 71} cy="75" rx="4" ry="6" /><ellipse cx={nervous ? 88 : 89} cy="75" rx="4" ry="6" /></g>
    <path d={nervous ? 'M73 96Q80 86 87 96' : 'M71 90Q80 101 89 90'} fill="none" stroke="#241533" strokeWidth="3" strokeLinecap="round" />
  </svg>
}
export default function CompletedRuns({ runs, stacks }: { runs: Card[][], stacks: Card[][] }) {
  const progress = longestRun(stacks)
  const nervous = progress >= 9
  return <section className="completed-runs" aria-label="Eight completed stack slots">
    <div className="completed-runs__heading"><h2>Spider homes</h2><span>{runs.length} / 8 complete</span></div>
    <div className="completed-runs__slots">
      {Array.from({ length: 8 }, (_, index) => <div key={index}
        className={`completion-slot ${runs[index] ? 'completion-slot--filled' : nervous ? 'completion-slot--nervous' : 'completion-slot--happy'}`}
        style={{ '--spider-delay': `${index * -0.23}s`, '--jitter-speed': `${Math.max(0.08, (14 - progress) * 0.045)}s` } as CSSProperties}
        role="img" aria-label={`Slot ${index + 1}: ${runs[index] ? `completed ${cardName(runs[index][12])} to Ace; spider has fled` : nervous ? 'nervous spider' : 'happy spider'}`}>
        <div className="completion-slot__resident"><SlotSpider nervous={nervous} /></div>
        {runs[index] && <div className="completion-slot__run"><CardView card={runs[index][12]} /><span className="completion-slot__badge">K → A ✓</span></div>}
        <span className="completion-slot__number" aria-hidden="true">{index + 1}</span>
      </div>)}
    </div>
  </section>
}
