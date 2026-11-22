import * as THREE from 'three'
import { sharedWebPlan } from './sharedWebPlan'
import { createSpider } from '../spider/createSpider'
import { disposeSpiderModel } from '../spider/disposeSpiderModel'
import { legs, footPosition, solveLeg, UPPER_LEG_LENGTH, LOWER_LEG_LENGTH } from '../spider/spiderGait'
import { facingYaw, defenseMotion, battleGatherPoint, attackState, escapeDestination, escapeProgress } from './timeline'
import { spiderHomes } from '../spider/spiderHomes'
import { cardArtwork } from './cardArtwork'
import { clamp, smooth, projectileProgress, THROW_START, THROW_INTERVAL, THROW_FLIGHT, FLEE_START, type Battle, type Point } from './timeline'
import type { GameSound } from '../gameAudio'

type Cue = (key: string, sound: GameSound) => void
export interface ThreeShow { duration?: number; frame: (time: number) => void; dispose: () => void }
function stage(canvas: HTMLCanvasElement) {
  const width = innerWidth, height = innerHeight
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(width, height)
  const distance = height / (2 * Math.tan(25 * Math.PI / 180))
  const camera = new THREE.PerspectiveCamera(50, width / height, 1, distance * 5)
  camera.position.z = distance
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight('#fff4df', '#342142', 2))
  const key = new THREE.DirectionalLight('#fff2d8', 3); key.position.set(-200, 300, 500); scene.add(key)
  const rim = new THREE.DirectionalLight('#afcfff', 1.4); rim.position.set(400, -100, 300); scene.add(rim)
  const point = (x: number, y: number, z = 0) => new THREE.Vector3(x - width / 2, height / 2 - y, z)
  return { width, height, distance, renderer, scene, camera, point }
}
function actor(index: number) {
  const resident = spiderHomes[index]
  const model = createSpider({ colour: resident.colour, marking: resident.marking, includeWeb: false })
  const mixer = new THREE.AnimationMixer(model.root)
  mixer.clipAction(model.clips.find(c => c.name === 'Walk')!).play()
  // Small articulated fangs make the bites visible from the table camera.
  const fangMaterial = new THREE.MeshStandardMaterial({ color: '#fff2d7', roughness: .4 })
  for (const side of [-1, 1]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(.08, .3, 8), fangMaterial)
    fang.position.set(side * .12, -.16, .07); fang.rotation.z = Math.PI
    model.root.getObjectByName('Mouth')!.add(fang)
  }
  return { root: model.root, mixer, body: model.root.getObjectByName('Body')!, mouth: model.root.getObjectByName('Mouth')! }
}
function rearUp(spider: ReturnType<typeof actor>, amount: number, time: number) {
  spider.body.position.set(0, -.12 * amount, .5 * amount)
  spider.body.rotation.x = -.55 * amount
  const inverseBody = spider.body.quaternion.clone().invert()
  for (const leg of legs) {
    const foot = footPosition(leg, 'Walk', time * 5)
    if (leg.index >= 2) { foot.z += amount * 1.3; foot.y -= amount * .15 }
    foot.sub(spider.body.position).applyQuaternion(inverseBody)
    const hip = leg.hip
    const offset = foot.clone().sub(hip)
    const reach = UPPER_LEG_LENGTH + LOWER_LEG_LENGTH - .005
    if (offset.length() > reach) foot.copy(hip).add(offset.setLength(reach))
    const pose = solveLeg(leg, new THREE.Vector3(), foot)
    spider.root.getObjectByName(`${leg.name}Upper`)!.quaternion.copy(pose.upper)
    spider.root.getObjectByName(`${leg.name}Lower`)!.quaternion.copy(pose.lower)
  }
  spider.mouth.scale.set(1 + amount * .6, 1 + amount * 2, 1)
}
export function battleShow(canvas: HTMLCanvasElement, battle: Battle, cue: Cue): ThreeShow {
  const s = stage(canvas)
  const homeX = clamp(battle.home.x + battle.home.width / 2, 65, s.width - 65)
  const homeY = clamp(battle.home.y + battle.home.height * .45, 100, s.height - 100)
  const target = s.point(homeX, homeY)
  const first = battle.origins[0]
  const anchor = battleGatherPoint(battle)
  const gather = s.point(anchor.x, clamp(anchor.y, 110, s.height - 150))
  // Keep enough separation to read the throw, even when a tableau is near a home.
  if (gather.distanceTo(target) < 160) gather.y = target.y + Math.min(240, s.height * .32)
  const defenseYaw = facingYaw(gather.x - target.x, gather.y - target.y)
  const spider = actor(battle.slot)
  // Home camera spans eight world units; its resident scale is .96.
  const spiderSize = battle.home.width / 8 * .96
  const exit = escapeDestination(target.x, target.y, s.width, spiderSize)
  const escapeTarget = new THREE.Vector3(exit.x, exit.y, 0)
  const escapeYaw = facingYaw(exit.x - target.x, exit.y - target.y)
  const escapeTurn = Math.atan2(Math.sin(escapeYaw - defenseYaw), Math.cos(escapeYaw - defenseYaw))
  spider.root.position.copy(target); spider.root.scale.setScalar(spiderSize); s.scene.add(spider.root)
  const shellMaterials = new Set<THREE.MeshStandardMaterial>()
  spider.root.traverse(object => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) shellMaterials.add(object.material)
  })
  const away = target.clone().sub(gather).setZ(0).normalize()
  const textures: THREE.Texture[] = []
  const cards = battle.cards.map((card, index) => {
    const normal = new THREE.CanvasTexture(cardArtwork(card)), bitten = new THREE.CanvasTexture(cardArtwork(card, true))
    normal.colorSpace = bitten.colorSpace = THREE.SRGBColorSpace; textures.push(normal, bitten)
    const material = new THREE.MeshStandardMaterial({ map: normal, side: THREE.DoubleSide, transparent: true, roughness: .55 })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.4), material)
    const origin = battle.origins[index] ?? first
    const width = origin.width
    mesh.scale.setScalar(width); s.scene.add(mesh)
    return { mesh, material, normal, bitten, width, aim: new THREE.Vector3(), aimed: false, impact: new THREE.Vector3(), landing: target.clone().add(new THREE.Vector3(Math.sin(index * 2.4) * (85 + index * 3), Math.cos(index * 2.4) * (65 + index * 2), -12 + index * .15)), origin: s.point(origin.x + origin.width / 2, origin.y + origin.height / 2) }
  })
  return {
    frame(time) {
      cue('gather', 'gather')
      spider.mixer.setTime(time * (time >= FLEE_START ? 7 : 2))
      const injury = attackState(time)
      const dodge = defenseMotion(time)
      const underAttack = time >= THROW_START && time < FLEE_START
      const defense = time >= THROW_START && time < FLEE_START ? (.35 + .65 * Math.sin((time - THROW_START) * 7) ** 2) * (1 - injury.damage * .65) : 0
      rearUp(spider, defense, time >= FLEE_START ? time * 2.4 : underAttack ? time * 1.8 : time)
      for (const eye of ['LeftEye', 'RightEye']) spider.root.getObjectByName(eye)!.scale.y = injury.phase === 'overwhelmed' ? .45 : injury.phase === 'battered' ? .7 : 1
      spider.body.position.z -= injury.damage * .22
      spider.body.rotation.y = injury.recoil * .22 * (injury.hits % 2 ? 1 : -1)
      shellMaterials.forEach(material => {
        material.emissive.set('#dc5846')
        material.emissiveIntensity = injury.recoil * .5
        material.roughness = .55 + injury.damage * .4
      })
      // Snap the jaws around every third card, between evasive hops.
      const biteIndex = Math.max(0, Math.floor((time - THROW_START - THROW_FLIGHT + .12) / THROW_INTERVAL))
      const biteTime = THROW_START + biteIndex * THROW_INTERVAL + THROW_FLIGHT
      const bite = underAttack && biteIndex % 3 === 1 ? Math.max(0, 1 - Math.abs(time - biteTime) / .14) : 0
      spider.mouth.scale.y = 1 + defense * 1.5 + bite * 2
      spider.body.rotation.x -= bite * .22
      const escape = escapeProgress(time)
      const turning = smooth((time - FLEE_START) / .18)
      spider.root.position.copy(target).lerp(escapeTarget, escape)
      spider.root.position.x += dodge.x * spiderSize * 2.8
      spider.root.position.y += dodge.y * spiderSize * 2
      spider.root.position.z = dodge.hop * spiderSize * 1.1
      if (time >= FLEE_START) {
        spider.body.position.z = .04 + Math.sin((time - FLEE_START) * 46) ** 2 * .12
        spider.body.rotation.x = .12
      }
      spider.root.position.addScaledVector(away, (injury.recoil * 12 + injury.damage * 18) * (1 - escape))
      const facingCards = underAttack ? facingYaw(gather.x - spider.root.position.x, gather.y - spider.root.position.y) : defenseYaw
      spider.root.rotation.z = facingCards * smooth(time / .65) + escapeTurn * turning + (defense ? Math.sin(time * 18) * .035 : 0)
      const spiderProjection = 1 - spider.root.position.z / s.distance
      spider.root.scale.setScalar(spiderSize * spiderProjection)
      spider.root.position.x *= spiderProjection
      spider.root.position.y *= spiderProjection
      // Keep rendering the runner: only the viewport edge hides him.
      spider.root.updateMatrixWorld(true)
      const mouth = spider.mouth.getWorldPosition(new THREE.Vector3())
      // Card paths use screen-plane coordinates before perspective compensation.
      const mouthProjection = 1 - mouth.z / s.distance
      mouth.x /= mouthProjection; mouth.y /= mouthProjection
      if (time >= FLEE_START) cue('hiss', 'hiss')
      cards.forEach((card, index) => {
        const { mesh, material, normal, bitten, origin, impact, landing, width } = card
        const lift = smooth((time - .75) / .75)
        const stack = gather.clone().add(new THREE.Vector3(0, 0, lift * Math.min(140, s.distance * .23) + index * .4))
        mesh.position.copy(origin).lerp(stack, smooth(time / .75))
        let cardWidth = width
        mesh.rotation.set(lift * -.38, 0, 0)
        const launch = THROW_START + index * THROW_INTERVAL
        const p = projectileProgress(time, index)
        if (time >= launch) {
          cue(`throw-${index}`, 'whoosh')
          // Dodged cards keep their original trajectory instead of chasing him.
          if (!card.aimed) { card.aim.copy(mouth); card.aimed = true }
          const aim = index % 3 === 1 ? mouth.clone() : card.aim
          mesh.position.copy(stack).lerp(aim, p)
          mesh.position.z += Math.sin(p * Math.PI) * 120
          mesh.position.y += Math.sin(p * Math.PI) * 45
          mesh.rotation.set(p * Math.PI * 2, p * .7, p * (index % 2 ? .7 : -.7))
          if (p < 1) impact.copy(aim)
          if (p === 1) {
            cue(`impact-${index}`, index % 3 === 1 ? 'bite' : 'hit')
            const after = time - launch - THROW_FLIGHT
            material.map = index % 3 === 1 ? bitten : normal
            const fall = clamp(after / .65)
            if (impact.lengthSq() === 0) impact.copy(aim)
            mesh.position.copy(impact).lerp(landing, fall)
            mesh.position.z += Math.sin(fall * Math.PI) * 85
            mesh.position.y += Math.sin(fall * Math.PI) * 25
            const bounce = clamp((after - .65) / .3)
            mesh.position.z += Math.sin(bounce * Math.PI) * 14
            mesh.rotation.set((1 - fall) * Math.PI * 2, (1 - fall) * .7, index * 2.4 + (1 - fall) * 3)
            material.opacity = 1
          }
        }
        if (time > 7) {
          const settle = smooth((time - 7) / .65)
          material.map = normal; material.opacity = 1
          mesh.position.copy(landing).lerp(target, settle).add(new THREE.Vector3(index * .35, index * .4, index * .2))
          mesh.rotation.set(0, 0, 0)
          cardWidth = width + (Math.min(width, battle.home.width * .72) - width) * settle
        }
        // Compensate position AND size for perspective: lifting a card must
        // not inflate it. Rotation still provides depth and foreshortening.
        const projection = 1 - mesh.position.z / s.distance
        mesh.scale.setScalar(cardWidth * projection)
        mesh.position.x *= projection
        mesh.position.y *= projection
      })
      s.renderer.render(s.scene, s.camera)
    },
    dispose() {
      spider.mixer.stopAllAction(); disposeSpiderModel(spider.root)
      cards.forEach(c => { c.mesh.geometry.dispose(); c.material.dispose() }); textures.forEach(t => t.dispose())
      s.renderer.dispose(); s.renderer.forceContextLoss()
    },
  }
}
export function spiderParty(canvas: HTMLCanvasElement, remaining: number[], homes: Point[], cue: Cue): ThreeShow {
  const s = stage(canvas)
  const plan = sharedWebPlan(remaining.length)
  const center = s.point(s.width * .5, s.height * .48)
  const nodes = plan.nodes.map(node => center.clone().add(new THREE.Vector3(
    node.x * Math.max(60, s.width * .43), node.y * Math.max(60, s.height * .35), 0)))
  const silkMaterial = new THREE.LineBasicMaterial({ color: '#dbd0ee', transparent: true, opacity: .62 })
  function strand() {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(13 * 3), 3).setUsage(THREE.DynamicDrawUsage))
    const line = new THREE.Line(geometry, silkMaterial)
    line.frustumCulled = false; line.visible = false
    s.scene.add(line)
    return line
  }
  function stretch(line: THREE.Line, from: THREE.Vector3, to: THREE.Vector3, tension: number, time: number) {
    const points = line.geometry.getAttribute('position') as THREE.BufferAttribute
    const length = from.distanceTo(to)
    for (let point = 0; point <= 12; point++) {
      const t = point / 12, sag = Math.sin(t * Math.PI)
      points.setXYZ(point, from.x + (to.x - from.x) * t,
        from.y + (to.y - from.y) * t - sag * Math.min(18, length * .06) * tension,
        from.z + (to.z - from.z) * t + sag * Math.sin(time * 5 + length) * tension * 2)
    }
    points.needsUpdate = true; line.visible = true
  }
  const spiders = remaining.map((index, order) => {
    const spider = actor(index), home = homes[index]
    const size = home ? home.width / 8 * .96 : 15
    const start = s.point(home ? home.x + home.width / 2 : s.width / 2,
      home ? clamp(home.y + home.height / 2, 75, s.height - 75) : s.height * .8)
    spider.root.scale.setScalar(size); s.scene.add(spider.root)
    const waypoints = [start, ...plan.routes[order].map(node => nodes[node])]
    let cursor = order * .12
    const jobs = waypoints.slice(1).map((to, job) => {
      const from = waypoints[job]
      const run = Math.max(.65, from.distanceTo(to) / (120 + Math.random() * 70))
      const tend = .4 + Math.random() * .45
      const result = { from, to, begin: cursor, run, tend, line: strand() }
      cursor += run + tend
      return result
    })
    return { ...spider, index, order, size, start, jobs, end: cursor, live: strand(), yaw: 0 }
  })
  const duration = Math.max(0, ...spiders.map(spider => spider.end)) + 1
  return {
    duration,
    frame(time) {
      spiders.forEach(spider => {
        const current = spider.jobs.findIndex(job => time < job.begin + job.run + job.tend)
        const job = spider.jobs[current < 0 ? spider.jobs.length - 1 : current]
        const local = time - job.begin
        const progress = smooth(local / job.run)
        const tending = local >= job.run
        const heading = facingYaw(job.to.x - job.from.x, job.to.y - job.from.y)
        const turn = Math.atan2(Math.sin(heading - spider.yaw), Math.cos(heading - spider.yaw))
        spider.yaw += turn * .2
        spider.root.position.copy(job.from).lerp(job.to, progress)
        spider.root.position.z = spider.size * .8
        spider.root.rotation.z = spider.yaw
        const working = current >= 0 && time >= job.begin
        spider.mixer.setTime(time * (tending || !working ? .5 : 5))
        rearUp(spider, tending && working ? .18 + Math.sin(time * 11 + spider.index) ** 2 * .2 : 0, time)
        spider.root.updateMatrixWorld(true)
        // Silk streams from the spinnerets, then anchors and tightens at the join.
        const spinner = spider.root.localToWorld(new THREE.Vector3(0, .9, -.3))
        spider.jobs.forEach((finished, j) => {
          if (time >= finished.begin + finished.run) {
            const tightening = 1 - smooth((time - finished.begin - finished.run) / finished.tend)
            stretch(finished.line, finished.from, finished.to, .3 + tightening * .7, time)
          } else if (j !== current) finished.line.visible = false
        })
        spider.live.visible = working && !tending && local > 0
        if (spider.live.visible) stretch(spider.live, job.from, spinner, 1, time)
        if (tending && working) cue('web-join-' + spider.index + '-' + current, 'spider')
      })
      s.renderer.render(s.scene, s.camera)
    },
    dispose() {
      spiders.forEach(spider => {
        spider.mixer.stopAllAction(); disposeSpiderModel(spider.root)
        spider.live.geometry.dispose(); spider.jobs.forEach(job => job.line.geometry.dispose())
      })
      silkMaterial.dispose()
      s.renderer.dispose(); s.renderer.forceContextLoss()
    },
  }
}
