import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera, PCFShadowMap, Vector3 } from 'three'
import { Spider } from './Spider'
import { Web } from '../web/Web'
import { createHomeWebSurface } from './homeWebSurface'
import type { SpiderTemperament } from './spiderAgent'
import { spiderHomes } from './spiderHomes'

interface Props { index: number; alarm: 0 | 1 | 2; filled: boolean; hidden?: boolean; mood?: SpiderTemperament; onMoodChange?: () => void; visit?: number }

const CAMERA_TILT = Math.atan2(6, 15)
function fitCamera(camera: OrthographicCamera, aspect: number) {
  camera.left = -4
  camera.right = 4
  camera.top = 4 * aspect
  camera.bottom = -4 * aspect
  camera.position.set(0, -6, 15)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
}

function Home({ index, alarm, filled, paused, hidden, mood: chosenMood, onMoodChange, visit }: Props & { paused: boolean }) {
  const { size, camera, invalidate } = useThree()
  const aspect = size.height / Math.max(1, size.width)
  const surface = useMemo(() => createHomeWebSurface(index, aspect / Math.cos(CAMERA_TILT)), [index, aspect])
  const resident = spiderHomes[index]
  const [inspection, setInspection] = useState<{ point: Vector3; serial: number }>()
  const mood = chosenMood ?? (resident.mood === 'calm' ? 'Calm' : resident.mood === 'grumpy' ? 'Grumpy' : 'Curious')
  useEffect(() => {
    fitCamera(camera as OrthographicCamera, aspect)
    invalidate()
  }, [camera, aspect, size.width, size.height, invalidate])
  const keyboardVisit = useMemo(() => visit ? { point: new Vector3(1.5, 1.8, 0), serial: visit } : undefined, [visit])
  return <>
    <hemisphereLight args={['#eee5ff', '#21182e', 1.5]} />
    <directionalLight position={[-4, 5, 9]} intensity={3} castShadow shadow-mapSize={[256, 256]}
      shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={7} shadow-camera-bottom={-7}
      shadow-bias={-.001} shadow-normalBias={.03} />
    <directionalLight position={[4, -2, 4]} intensity={.7} color="#a6c8ff" />
    <mesh position={[0, 0, -.55]} receiveShadow>
      <planeGeometry args={[8, 8 * aspect]} />
      <shadowMaterial transparent opacity={.38} />
    </mesh>
    {!hidden && <mesh position={[0, 0, -.3]} onClick={event => {
      event.stopPropagation()
      setInspection({ point: event.point.clone(), serial: performance.now() })
    }}>
      <planeGeometry args={[8, 8 * aspect / Math.cos(CAMERA_TILT)]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>}
    <Web surface={surface} paused={paused} colour={alarm ? '#dbc5a0' : '#b6acc8'}>
      {!hidden && <Spider colour={resident.colour} mood={mood} marking={resident.marking} size={.96}
        position={[Math.sin(index * 2.4) * .65, Math.cos(index * 1.7) * .55]}
        investigate={inspection && inspection.serial > (keyboardVisit?.serial ?? 0) ? inspection : keyboardVisit} onClick={onMoodChange}
        variation={index} paused={paused} alarm={alarm} fleeing={filled} />}
    </Web>
  </>
}
class HomeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <span className="home-scene-fallback">3D unavailable</span> : this.props.children }
}
export default function SpiderHomeScene(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [visit, setVisit] = useState(0)
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let onScreen = true
    const update = () => setPaused(motion.matches || document.hidden || !onScreen)
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update() })
    observer.observe(host.current!)
    motion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); motion.removeEventListener('change', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  return <div ref={host} className="home-scene">
    {!props.hidden && <div className="home-scene__actions">
      <button type="button" onClick={props.onMoodChange} aria-label={'Change ' + spiderHomes[props.index].name + ' mood'}>Change mood</button>
      <button type="button" onClick={() => setVisit(performance.now())} aria-label={'Disturb ' + spiderHomes[props.index].name + ' web'}>Touch web</button>
    </div>}
    <HomeBoundary>
      <Canvas aria-hidden="true" orthographic camera={{ manual: true, left: -4, right: 4, top: 5.3, bottom: -5.3, position: [0, 0, 15], near: .1, far: 40 }} shadows={{ type: PCFShadowMap }} dpr={[1, 1.5]}
        frameloop={paused ? 'demand' : 'always'} gl={{ alpha: true, antialias: true }}>
        <Home {...props} visit={visit} paused={paused} />
      </Canvas>
    </HomeBoundary>
  </div>
}
