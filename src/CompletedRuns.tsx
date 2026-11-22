import { lazy, Suspense, useState, useLayoutEffect, type CSSProperties } from 'react'
import { cardName, type Card } from './gameRules'
import { spiderHomes, threatenedHomes } from './spider/spiderHomes'
import { columnLocations, homeLocations } from './spider/homeLayout'
import type { SpiderTemperament } from './spider/spiderAgent'
import CardView from './Card'

const SpiderHomeScene = lazy(() => import('./spider/SpiderHomeScene'))

export default function CompletedRuns({ runs, stacks, hiddenResidents = [], escaped = false, cardsGone = false }: { runs: (Card[] | undefined)[], stacks: Card[][], hiddenResidents?: number[], escaped?: boolean, cardsGone?: boolean }) {
  const [moods, setMoods] = useState<SpiderTemperament[]>(() => spiderHomes.map(home => home.mood === 'calm' ? 'Calm' : home.mood === 'grumpy' ? 'Grumpy' : 'Curious'))
  const [threats, setThreats] = useState<{ index: number; panic: boolean }[]>([])
  useLayoutEffect(() => {
    const update = () => {
      const homes = homeLocations()
      const occupied = spiderHomes.map((_, index) => index).filter(index => !runs[index] && !hiddenResidents.includes(index))
      const next = threatenedHomes(stacks, columnLocations(), homes, occupied)
      setThreats(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
    }
    update()
    const observer = new ResizeObserver(update)
    document.querySelectorAll('.card-stack, [data-home-index]').forEach(element => observer.observe(element))
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => { observer.disconnect(); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
  }, [stacks, runs, hiddenResidents])
  return <section className="completed-runs" aria-label="Eight completed stack slots">
    <div className="completed-runs__heading"><h2>Spider homes</h2><span>{runs.filter(Boolean).length} / 8 complete</span></div>
    <div className="completed-runs__slots">
      {spiderHomes.map((spider, index) => {
        const threat = threats.find(threat => threat.index === index)
        const nervous = !!threat
        const filled = !!runs[index]
        const state = filled ? 'fled' : escaped ? 'celebrating' : nervous ? threat.panic ? 'panicking' : 'nervous' : moods[index].toLowerCase()
        return <div key={spider.name} data-home-index={index}
          className={`completion-slot completion-slot--${spider.mood} ${filled ? 'completion-slot--filled' : nervous ? `completion-slot--nervous${threat.panic ? ' completion-slot--panic' : ''}` : 'completion-slot--settled'}`}
          style={{ '--spider-colour': spider.colour } as CSSProperties}
          role="group" aria-label={`${spider.name}’s web, slot ${index + 1}. ${filled ? `Completed ${cardName(runs[index]![12])} to Ace; ${spider.name} has fled.` : escaped ? `${spider.name} has left the web to celebrate.` : nervous ? `${spider.name} is ${state}: a nearby stack is close to completion.` : `${moods[index]} spider, resting, exploring and tending the silk.`}`}>
          {!filled && !escaped && <div className="completion-slot__habitat">
            <Suspense fallback={<span className="home-scene-fallback">Spinning silk…</span>}>
              <SpiderHomeScene mood={moods[index]} onMoodChange={() => setMoods(current => current.map((mood, slot) => slot === index ? mood === 'Calm' ? 'Curious' : mood === 'Curious' ? 'Grumpy' : 'Calm' : mood))} index={index} alarm={nervous ? threat.panic ? 2 : 1 : 0} filled={filled} hidden={filled || hiddenResidents.includes(index)} />
            </Suspense>
          </div>}
          {filled && !cardsGone && <div className="completion-slot__run"><CardView card={runs[index]![12]} /><span className="completion-slot__badge">K → A ✓</span></div>}
          <div className="completion-slot__caption" aria-hidden="true"><span>{spider.name}</span><small>{state}</small></div>
        </div>
      })}
    </div>
  </section>
}
