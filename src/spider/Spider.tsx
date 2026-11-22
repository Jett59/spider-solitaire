import { useEffect, useId, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createSpider } from './createSpider'
import { celebration, legs, solveLeg, UPPER_LEG_LENGTH, LOWER_LEG_LENGTH } from './spiderGait'
import { SpiderAgent, type SpiderActivity, type SpiderAnimation, type SpiderTemperament } from './spiderAgent'
import { useWebSurface } from '../web/webContext'
import { disposeSpiderModel } from './disposeSpiderModel'

export interface SpiderProps {
  colour?: string
  mood?: SpiderTemperament
  animation?: SpiderAnimation
  size?: number
  position?: [number, number]
  paused?: boolean
  onActivityChange?: (activity: SpiderActivity) => void
}

export function Spider({ colour = '#a477ed', mood = 'Curious', animation = 'Auto', size = 0.42,
  position = [0, 0], paused = false, onActivityChange }: SpiderProps) {
  const surface = useWebSurface()
  const id = useId()
  const safeSize = Math.max(0.25, Math.min(size, surface.options.radius / 6))
  const [x, y] = position
  const agent = useMemo(() => new SpiderAgent(id, surface, safeSize, [x, y]), [id, surface, safeSize, x, y])
  const model = useMemo(() => createSpider({ includeWeb: false }), [])
  const body = useMemo(() => model.root.getObjectByName('Body')!, [model])
  const joints = useMemo(() => legs.map(leg => ({
    upper: model.root.getObjectByName(`${leg.name}Upper`)!,
    lower: model.root.getObjectByName(`${leg.name}Lower`)!,
  })), [model])
  const silkGeometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), [])
  const silk = useRef<THREE.LineSegments>(null)
  const activity = useRef<SpiderActivity | null>(null)
  const previousJump = useRef(0)

  useEffect(() => {
    const base = new THREE.Color(colour)
    model.root.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
        const material = object.material
        // The two purple materials are shared by all limbs and the face.
        if (!material.userData.spiderRole && material.color.getHexString() === 'a477ed') material.userData.spiderRole = 'body'
        if (!material.userData.spiderRole && object.name === 'Head') material.userData.spiderRole = 'face'
        if (material.userData.spiderRole) material.color.copy(base).multiplyScalar(material.userData.spiderRole === 'face' ? 0.7 : 1)
      }
    })
  }, [colour, model])
  useEffect(() => () => agent.dispose(), [agent])
  useEffect(() => () => { disposeSpiderModel(model.root); silkGeometry.dispose() }, [model, silkGeometry])

  useFrame(() => {
    if (!paused) agent.update(animation, mood)
    const time = surface.time
    if (activity.current !== agent.activity) {
      activity.current = agent.activity
      onActivityChange?.(agent.activity)
    }
    const jumping = animation === 'Celebrate' || agent.isCelebrating
    const jump = jumping ? celebration(agent.isCelebrating ? agent.celebrationTime : agent.animationTime) : { height: 0, tuck: 0 }
    if (!agent.isCelebrating && previousJump.current > 0 && jump.height === 0) surface.disturb(agent.position, 0.65)
    previousJump.current = jump.height
    const ground = surface.height(agent.position.x, agent.position.y)
    model.root.position.set(agent.position.x, agent.position.y, ground + 0.9 * safeSize)
    model.root.scale.setScalar(safeSize)
    body.position.set(0, 0, jump.height)
    model.root.getObjectByName('Mouth')!.scale.y = agent.isFrowning ? -1 : 1
    const eyeScale = agent.isFrowning || mood === 'Grumpy' ? 0.65 : mood === 'Calm' ? 0.83 : 1
    const blink = time % 4 > 3.75 ? 0.12 : 1
    for (const side of ['LeftEye', 'RightEye']) model.root.getObjectByName(side)!.scale.y = eyeScale * blink

    let workingLeg = -1
    let workPoint: THREE.Vector3 | undefined
    if (agent.work) {
      const pointIndex = Math.min(7, Math.floor(agent.workProgress * 8))
      workPoint = agent.work.points[agent.workKind === 'trim' ? 8 - pointIndex : pointIndex].clone()
      workPoint.z = surface.height(workPoint.x, workPoint.y) + safeSize * 0.057
      let distance = Infinity
      legs.forEach((leg, index) => {
        const hip = leg.hip.clone().multiplyScalar(safeSize).add(model.root.position)
        const d = hip.distanceToSquared(workPoint!)
        if (d < distance) { distance = d; workingLeg = index }
      })
    }
    legs.forEach((leg, index) => {
      const foot = index === workingLeg && workPoint ? workPoint.clone() : agent.footPoint(index)
      if (jumping) foot.z += (jump.height + jump.tuck) * safeSize
      if (animation === 'Wave' && index === 4) foot.z += (0.3 + Math.sin(time * 7) * 0.2) * safeSize
      if (index === workingLeg) foot.z += Math.sin(time * 16) ** 2 * 0.045
      const local = foot.sub(model.root.position).divideScalar(safeSize)
      // Sparse webs and fast turns can place a silk target just outside a leg's reach.
      // Keep rigid links valid while the next alternating step finds a closer thread.
      const hip = leg.hip.clone().add(body.position)
      const offset = local.clone().sub(hip)
      const maxReach = UPPER_LEG_LENGTH + LOWER_LEG_LENGTH - 0.001
      if (offset.length() > maxReach) local.copy(hip).add(offset.setLength(maxReach))
      if (offset.length() < 0.201) local.copy(hip).add(offset.setLength(0.201))
      const pose = solveLeg(leg, body.position, local)
      joints[index].upper.quaternion.copy(pose.upper)
      joints[index].lower.quaternion.copy(pose.lower)
    })
    if (silk.current) {
      silk.current.visible = !!workPoint
      if (workPoint) {
        const attr = silkGeometry.getAttribute('position') as THREE.BufferAttribute
        attr.setXYZ(0, agent.position.x, agent.position.y + safeSize * 0.6, model.root.position.z)
        attr.setXYZ(1, workPoint.x, workPoint.y, workPoint.z)
        attr.needsUpdate = true
        silkGeometry.computeBoundingSphere()
      }
    }
  }, -1)

  return <group name={`Spider-${id}`}>
    <primitive object={model.root} dispose={null} />
    <lineSegments ref={silk} geometry={silkGeometry}>
      <lineBasicMaterial color="#f0e4ff" />
    </lineSegments>
  </group>
}
