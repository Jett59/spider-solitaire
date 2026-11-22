import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrthographicCamera, PCFShadowMap } from 'three'
import { Spider } from './Spider'
import { Web } from '../web/Web'
import { createHomeWebSurface } from './homeWebSurface'
import { spiderHomes } from './spiderHomes'

interface Props { index: number; alarm: 0 | 1 | 2; filled: boolean }

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

function Home({ index, alarm, filled, paused }: Props & { paused: boolean }) {
  const { size, camera, invalidate } = useThree()
  const aspect = size.height / Math.max(1, size.width)
  const surface = useMemo(() => createHomeWebSurface(index, aspect / Math.cos(CAMERA_TILT)), [index, aspect])
  const resident = spiderHomes[index]
  const mood = resident.mood === 'calm' ? 'Calm' : resident.mood === 'grumpy' ? 'Grumpy' : 'Curious'
  useEffect(() => {
    fitCamera(camera as OrthographicCamera, aspect)
    invalidate()
  }, [camera, aspect, invalidate])
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
    <Web surface={surface} paused={paused} colour={alarm ? '#dbc5a0' : '#b6acc8'}>
      <Spider colour={resident.colour} mood={mood} marking={resident.marking} size={.96}
        position={[Math.sin(index * 2.4) * .65, Math.cos(index * 1.7) * .55]}
        variation={index} paused={paused} alarm={alarm} fleeing={filled} />
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
  return <div ref={host} className="home-scene" aria-hidden="true">
    <HomeBoundary>
      <Canvas orthographic camera={{ position: [0, 0, 15], near: .1, far: 40 }} shadows={{ type: PCFShadowMap }} dpr={[1, 1.5]}
        frameloop={paused ? 'demand' : 'always'} gl={{ alpha: true, antialias: true }}>
        <Home {...props} paused={paused} />
      </Canvas>
    </HomeBoundary>
  </div>
}
