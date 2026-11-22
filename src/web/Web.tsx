import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WebSurface } from './webSurface'
import { WebContext } from './webContext'

export interface WebProps {
  surface?: WebSurface
  radius?: number
  spokes?: number
  rings?: number
  tattered?: boolean
  colour?: string
  paused?: boolean
  children?: ReactNode
}

export function Web({ radius = 5, spokes = 18, rings = 10, colour = '#c9c1e4', tattered = false, paused = false, children, surface: suppliedSurface }: WebProps) {
  const surface = useMemo(() => suppliedSurface ?? new WebSurface({ radius, spokes, rings, tattered }), [suppliedSurface, radius, spokes, rings, tattered])
  const geometry = useMemo(() => {
    const count = surface.threads.reduce((sum, thread) => sum + (thread.points.length - 1) * 2 + 24, 0)
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage))
    result.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.max(...surface.threads.flatMap(thread => thread.points.map(point => point.length()))) + 1)
    return result
  }, [surface])
  const lines = useRef<THREE.LineSegments>(null)
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => { if (!paused) surface.tick(Math.min(delta, 0.05)) }, -2)
  useFrame(() => {
    const position = geometry.getAttribute('position') as THREE.BufferAttribute
    let index = 0
    for (const thread of surface.threads) {
      if (thread.fray && thread.coverage < 1) {
        // Two torn ends hang down and away from the web, swaying independently.
        for (const end of [0, thread.points.length - 1]) {
          const anchor = thread.points[end]
          for (let segment = 0; segment < 6; segment++) {
            for (const t of [segment / 6, (segment + 1) / 6]) {
              const sway = Math.sin(surface.time * 2.2 + end + anchor.x * 3) * 0.1 * t
              const x = anchor.x + sway + (end === 0 ? 0.12 : -0.12) * t
              const y = anchor.y - thread.fray * t * (1 - thread.coverage)
              position.setXYZ(index++, x, y, surface.height(anchor.x, anchor.y) - 0.3 * t * thread.fray)
            }
          }
        }
      }
      const visibleSegments = thread.coverage * (thread.points.length - 1)
      for (let i = 1; i < thread.points.length; i++) {
        if (i - 1 >= visibleSegments) break
        const a = thread.points[i - 1]
        const b = thread.points[i]
        const fraction = Math.min(1, visibleSegments - i + 1)
        const x = a.x + (b.x - a.x) * fraction
        const y = a.y + (b.y - a.y) * fraction
        position.setXYZ(index++, a.x, a.y, surface.height(a.x, a.y))
        position.setXYZ(index++, x, y, surface.height(x, y))
      }
    }
    position.needsUpdate = true
    geometry.setDrawRange(0, index)
  })

  return <WebContext.Provider value={surface}>
    <group name="LivingWeb">
      <lineSegments ref={lines} geometry={geometry}>
        <lineBasicMaterial color={colour} transparent opacity={0.72} />
      </lineSegments>
      {children}
    </group>
  </WebContext.Provider>
}
