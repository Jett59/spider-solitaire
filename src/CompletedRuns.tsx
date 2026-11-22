import { lazy, Suspense, type CSSProperties } from 'react'
import { cardName, type Card } from './gameRules'
import { spiderHomes, threatenedHome } from './spider/spiderHomes'
import CardView from './Card'

const SpiderHomeScene = lazy(() => import('./spider/SpiderHomeScene'))

export default function CompletedRuns({ runs, stacks }: { runs: Card[][], stacks: Card[][] }) {
  const threat = threatenedHome(stacks, runs.length)
  return <section className="completed-runs" aria-label="Eight completed stack slots">
    <div className="completed-runs__heading"><h2>Spider homes</h2><span>{runs.length} / 8 complete</span></div>
    <div className="completed-runs__slots">
      {spiderHomes.map((spider, index) => {
        const nervous = threat?.index === index
        const filled = !!runs[index]
        const state = filled ? 'fled' : nervous ? threat.panic ? 'panicking' : 'nervous' : spider.mood
        return <div key={spider.name}
          className={`completion-slot completion-slot--${spider.mood} ${filled ? 'completion-slot--filled' : nervous ? `completion-slot--nervous${threat.panic ? ' completion-slot--panic' : ''}` : 'completion-slot--settled'}`}
          style={{ '--spider-colour': spider.colour } as CSSProperties}
          role="img" aria-label={`${spider.name}’s web, slot ${index + 1}. ${filled ? `Completed ${cardName(runs[index][12])} to Ace; ${spider.name} has fled.` : nervous ? `${spider.name} is ${state}: this web receives the next completed stack.` : `${spider.mood} spider, resting, exploring and tending the silk.`}`}>
          <div className="completion-slot__habitat">
            <Suspense fallback={<span className="home-scene-fallback">Spinning silk…</span>}>
              <SpiderHomeScene index={index} alarm={nervous ? threat.panic ? 2 : 1 : 0} filled={filled} />
            </Suspense>
          </div>
          {filled && <div className="completion-slot__run"><CardView card={runs[index][12]} /><span className="completion-slot__badge">K → A ✓</span></div>}
          <div className="completion-slot__caption" aria-hidden="true"><span>{spider.name}</span><small>{state}</small></div>
        </div>
      })}
    </div>
  </section>
}
