import * as THREE from 'three'

import {
  legs, WEB_Z, UPPER_LEG_LENGTH, LOWER_LEG_LENGTH, GAIT_DURATION,
  spiderMoods, bodyPosition, footPosition, solveLeg, webBendWeight, webDeflection, type SpiderMood,
} from './spiderGait'
export { spiderMoods, type SpiderMood } from './spiderGait'

/** Named mesh pivots and standard animation clips remain portable through glTF. */
export function createSpider({ colour = '#a477ed', includeWeb = true, marking }: { colour?: string; includeWeb?: boolean; marking?: 'spots' | 'stripe' | 'chevron' } = {}) {
  const root = new THREE.Group()
  root.name = 'Spider'
  const body = new THREE.Group()
  body.name = 'Body'
  root.add(body)
  const sphere = new THREE.SphereGeometry(1, 32, 20)
  const purple = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.3 })
  const face = new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).multiplyScalar(0.7), roughness: 0.35 })
  const cream = new THREE.MeshStandardMaterial({ color: '#fff9e9', roughness: 0.28 })
  const dark = new THREE.MeshStandardMaterial({ color: '#1c122c', roughness: 0.23 })
  const silk = new THREE.MeshStandardMaterial({ color: '#b9b3d8', metalness: 0.35, roughness: 0.4 })

  function orb(parent: THREE.Object3D, material: THREE.Material, position: number[], scale: number[]) {
    const mesh = new THREE.Mesh(sphere, material)
    mesh.position.set(position[0], position[1], position[2])
    mesh.scale.set(scale[0], scale[1], scale[2])
    parent.add(mesh)
    return mesh
  }
  function strand(parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material) {
    const curve = new THREE.CatmullRomCurve3(points)
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 8, radius, 6, false), material)
    parent.add(mesh)
    return mesh
  }

  orb(body, purple, [0, 0.48, -0.12], [0.94, 1.02, 0.73])
  if (marking) {
    const markings = new THREE.MeshStandardMaterial({ color: '#d9c8ac', roughness: .65 })
    if (marking === 'spots') {
      for (const [x, y] of [[-.3, .65], [.3, .65], [0, 1]]) orb(body, markings, [x, y, .57], [.13, .14, .045])
    } else {
      const stripe = orb(body, markings, [0, .65, .6], [.12, .55, .045])
      if (marking === 'chevron') {
        stripe.scale.set(.1, .3, .045)
        stripe.rotation.z = -.7
        stripe.position.x = -.18
        const other = orb(body, markings, [.18, .65, .6], [.1, .3, .045])
        other.rotation.z = .7
      }
    }
  }
  const head = orb(body, face, [0, -0.44, 0.45], [0.72, 0.61, 0.58])
  head.name = 'Head'
  for (const side of [-1, 1]) {
    const eye = new THREE.Group()
    eye.position.set(side * 0.28, -0.34, 0.95)
    eye.name = side < 0 ? 'LeftEye' : 'RightEye'
    body.add(eye)
    orb(eye, cream, [0, 0, 0], [0.23, 0.29, 0.14])
    orb(eye, dark, [-side * 0.035, -0.025, 0.12], [0.095, 0.15, 0.065])
    orb(eye, cream, [-side * 0.035 - 0.025, 0.028, 0.174], [0.028, 0.035, 0.018])
  }
  const upperGeometry = new THREE.CylinderGeometry(0.085, 0.11, UPPER_LEG_LENGTH, 12)
  const lowerGeometry = new THREE.CylinderGeometry(0.04, 0.085, LOWER_LEG_LENGTH, 12)
  for (const leg of legs) {
    const hip = new THREE.Group()
    hip.name = leg.name
    hip.position.copy(leg.hip)
    body.add(hip)
    orb(hip, face, [0, 0, 0], [0.13, 0.13, 0.13])
    const upper = new THREE.Group()
    upper.name = `${leg.name}Upper`
    hip.add(upper)
    const upperMesh = new THREE.Mesh(upperGeometry, purple)
    upperMesh.position.y = UPPER_LEG_LENGTH / 2
    upper.add(upperMesh)
    const lower = new THREE.Group()
    lower.name = `${leg.name}Lower`
    lower.position.y = UPPER_LEG_LENGTH
    upper.add(lower)
    orb(lower, purple, [0, 0, 0], [0.105, 0.105, 0.105])
    const lowerMesh = new THREE.Mesh(lowerGeometry, purple)
    lowerMesh.position.y = LOWER_LEG_LENGTH / 2
    lower.add(lowerMesh)
    const foot = orb(lower, dark, [0, LOWER_LEG_LENGTH, 0], [0.045, 0.045, 0.045])
    foot.name = `${leg.name}Foot`
    const pose = solveLeg(leg, new THREE.Vector3(), footPosition(leg, 'Idle', 0))
    upper.quaternion.copy(pose.upper)
    lower.quaternion.copy(pose.lower)
  }
  const mouth = new THREE.Group()
  mouth.name = 'Mouth'
  mouth.position.set(0, -0.7, 1)
  body.add(mouth)
  strand(mouth, [
    new THREE.Vector3(-0.16, 0.02, -0.01),
    new THREE.Vector3(0, -0.05, 0.01),
    new THREE.Vector3(0.16, 0.02, -0.01),
  ], 0.026, dark)

  const web = new THREE.Group()
  web.name = 'Web'
  if (includeWeb) root.add(web)
  const point = (angle: number, radius: number) => new THREE.Vector3(Math.sin(angle) * radius, Math.cos(angle) * radius, WEB_Z)
  const angles = legs.map(leg => leg.angle).sort((a, b) => a - b)
  for (let i = 0; includeWeb && i < angles.length; i++) {
    const angle = angles[i]
    const next = angles[(i + 1) % angles.length] + (i === angles.length - 1 ? Math.PI * 2 : 0)
    strand(web, [point(angle, 0), point(angle, 2.6)], 0.012, silk)
    for (const radius of [0.8, 1.55, 2.45]) {
      strand(web, [point(angle, radius), point((angle + next) / 2, radius * 0.83), point(next, radius)], 0.012, silk)
    }
  }

  // Morph the actual silk, leaving the outer anchor points fixed.
  // Standard morph targets and weight tracks survive GLB export.
  web.children.forEach((object, index) => {
    const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
    mesh.name = `WebStrand${index}`
    const position = mesh.geometry.getAttribute('position')
    const bent = position.clone()
    for (let vertex = 0; vertex < position.count; vertex++) {
      bent.setZ(vertex, position.getZ(vertex) - webBendWeight(position.getX(vertex), position.getY(vertex)))
    }
    mesh.geometry.morphAttributes.position = [bent]
    mesh.updateMorphTargets()
  })

  // Bake IK to standard quaternion tracks so exported GLBs keep the same gait.
  const times = Array.from({ length: 121 }, (_, index) => index * GAIT_DURATION / 120)
  const clip = (name: SpiderMood) => {
    const tracks: THREE.KeyframeTrack[] = [
      new THREE.VectorKeyframeTrack('Body.position', times, times.flatMap(time => bodyPosition(name, time).toArray())),
    ]
    for (const strand of web.children) {
      tracks.push(new THREE.NumberKeyframeTrack(
        `${strand.name}.morphTargetInfluences[0]`, times, times.map(time => webDeflection(name, time)),
      ))
    }
    for (const eye of ['LeftEye', 'RightEye']) {
      tracks.push(new THREE.VectorKeyframeTrack(`${eye}.scale`, [0, 3.6, 3.68, 3.78, 4], [1, 1, 1, 1, 1, 1, 1, 0.08, 1, 1, 1, 1, 1, 1, 1]))
    }
    for (const leg of legs) {
      const poses = times.map(time => solveLeg(leg, bodyPosition(name, time), footPosition(leg, name, time)))
      tracks.push(new THREE.QuaternionKeyframeTrack(`${leg.name}Upper.quaternion`, times, poses.flatMap(pose => pose.upper.toArray())))
      tracks.push(new THREE.QuaternionKeyframeTrack(`${leg.name}Lower.quaternion`, times, poses.flatMap(pose => pose.lower.toArray())))
    }
    return new THREE.AnimationClip(name, GAIT_DURATION, tracks)
  }
  const clips = spiderMoods.map(clip)
  root.animations = clips
  return { root, clips }
}
