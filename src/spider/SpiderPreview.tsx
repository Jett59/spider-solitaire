import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PerspectiveCamera } from 'three'
import { Spider } from './Spider'
import { SilkTitle } from './SilkTitle'
import { Web } from '../web/Web'
import type { SpiderActivity, SpiderAnimation, SpiderTemperament } from './spiderAgent'
import spiderIcon from '../assets/spider.svg'
import './SpiderPreview.css'

function CameraControls({ radius, reset }: { radius: number; reset: number }) {
  const { camera, gl, size, invalidate } = useThree()
  useEffect(() => {
    const perspective = camera as PerspectiveCamera
    const availableHeight = Math.max(size.height * 0.6, size.height - 210)
    const distance = radius * 1.05 / Math.tan(perspective.fov * Math.PI / 360) / Math.min(availableHeight / size.height, (size.width - 32) / size.height)
    // A closer, oblique view reveals the legs standing above the silk.
    const viewDistance = distance * (size.width < 600 ? 0.92 : 0.76)
    const yaw = -Math.PI / 6
    const pitch = -Math.PI / 18
    const targetX = radius * 0.1
    const targetY = radius * 0.24
    camera.position.set(
      targetX + Math.sin(yaw) * Math.cos(pitch) * viewDistance,
      targetY + Math.sin(pitch) * viewDistance,
      Math.cos(yaw) * Math.cos(pitch) * viewDistance,
    )
    camera.lookAt(targetX, targetY, 0)
    const orbit = new OrbitControls(camera, gl.domElement)
    orbit.target.set(targetX, targetY, 0)
    orbit.enablePan = false
    orbit.minDistance = radius * 1.8
    orbit.maxDistance = distance * 1.5
    orbit.update()
    orbit.addEventListener('change', () => invalidate())
    invalidate()
    return () => orbit.dispose()
  }, [camera, gl, size.width, size.height, radius, reset, invalidate])
  return null
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="scene-fallback">
      <img src={spiderIcon} alt="Purple spider on its web" />
      <p>The 3D web needs WebGL 2. Try a browser with hardware acceleration enabled.</p>
    </div> : this.props.children
  }
}

export default function SpiderPreview() {
  const [colour, setColour] = useState('#a477ed')
  const [mood, setMood] = useState<SpiderTemperament>('Curious')
  const [animation, setAnimation] = useState<SpiderAnimation>('Auto')
  const [radius, setRadius] = useState(5)
  const [spokes, setSpokes] = useState(18)
  const [rings, setRings] = useState(10)
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [visible, setVisible] = useState(true)
  const [activity, setActivity] = useState<SpiderActivity>('Resting')
  const [reset, setReset] = useState(0)
  const host = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motion = () => setPaused(preference.matches)
    const visibility = () => setVisible(!document.hidden)
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(host.current!)
    preference.addEventListener('change', motion)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', motion)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  const stopped = paused || !visible || !onScreen

  return <section className="spider-preview" aria-label="Spider and living web">
    <div className="spider-stage" ref={host}>
      <SceneBoundary>
        <Canvas camera={{ fov: 38, position: [0, 0, 18] }} dpr={[1, 1.5]}
          frameloop={stopped ? 'demand' : 'always'}
          aria-label="Interactive spider maintaining a large silk web">
          <color attach="background" args={['#19172d']} />
          <hemisphereLight args={['#e4daff', '#29203f', 2.5]} />
          <directionalLight position={[-3, 4, 5]} color="#fff1dc" intensity={4} />
          <directionalLight position={[3, 2, -3]} color="#987bff" intensity={3} />
          <CameraControls radius={radius} reset={reset} />
          <Web tattered radius={radius} spokes={spokes} rings={rings} paused={stopped}>
            <Spider colour={colour} mood={mood} animation={animation} paused={stopped} onActivityChange={setActivity} />
          </Web>
        </Canvas>
      </SceneBoundary>
      <span className="spider-status">{paused ? 'Taking a break' : activity}</span>
    </div>
    <SilkTitle />
    <p className="scene-guidance">Drag to explore · Pinch or scroll to zoom</p>
    <details className="spider-settings">
      <summary>Spider &amp; web <span aria-hidden="true">✧</span></summary>
    <div className="settings-content">
    <div className="spider-actions" aria-label="Spider animations">
      {(['Auto', 'Walk', 'Idle', 'Wave', 'Celebrate'] as const).map(next =>
        <button key={next} aria-pressed={animation === next} onClick={() => setAnimation(next)}>{next === 'Auto' ? 'Tend the web' : next}</button>)}
      <button aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Play' : 'Pause'}</button>
    </div>
      <div className="spider-settings-grid">
        <label>Spider colour <input aria-label="Spider colour" type="color" value={colour} onChange={event => setColour(event.target.value)} /></label>
        <label>Mood <select aria-label="Mood" value={mood} onChange={event => setMood(event.target.value as SpiderTemperament)}>
          <option>Curious</option><option>Calm</option><option>Grumpy</option>
        </select></label>
        <label>Web size <output>{radius}</output><input aria-label="Web size" type="range" min="3" max="8" step=".5" value={radius} onChange={event => setRadius(Number(event.target.value))} /></label>
        <label>Radial threads <output>{spokes}</output><input aria-label="Radial threads" type="range" min="8" max="32" value={spokes} onChange={event => setSpokes(Number(event.target.value))} /></label>
        <label>Silk rings <output>{rings}</output><input aria-label="Silk rings" type="range" min="4" max="16" value={rings} onChange={event => setRings(Number(event.target.value))} /></label>
      </div>
      <div className="spider-actions">
        <button onClick={() => setReset(reset + 1)}>Reset view</button>
      </div>
      </div>
    </details>
  </section>
}
