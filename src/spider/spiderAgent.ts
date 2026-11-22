import { Vector3 } from 'three'
import { legs } from './spiderGait.ts'
import { WebSurface, type FootAnchor, type SilkThread } from '../web/webSurface.ts'

export type SpiderAnimation = 'Auto' | 'Idle' | 'Walk' | 'Wave' | 'Celebrate'
export type SpiderTemperament = 'Curious' | 'Calm' | 'Grumpy'
export type SpiderActivity = 'Resting' | 'Exploring' | 'Trimming silk' | 'Spinning silk' | 'Waving' | 'Celebrating' | 'Heading home' | 'Frowning'

/** One independent caretaker; time advances only while its web is running. */
export class SpiderAgent {
  readonly position: Vector3
  readonly feet: { anchor: FootAnchor; from: Vector3; target: FootAnchor; swing: number; stepping: boolean; cycle: number }[]
  activity: SpiderActivity = 'Resting'
  work?: SilkThread
  workProgress = 0
  workKind: 'trim' | 'spin' = 'trim'
  private target = new Vector3()
  private inspectionUntil = 0
  private repair?: SilkThread
  private deadline = 2
  private waypoint = 0
  private lastTime = 0
  private lastAnimation: SpiderAnimation = 'Auto'
  private modeStart = 0
  private travelSpeed = 0
  private gaitPhase = 0
  private storyPhase: 'choose' | 'to-repair' | 'trim' | 'repair' | 'home' | 'celebrate' | 'frown' = 'choose'
  private job?: SilkThread
  private storyStarted = 0
  private startFray = 0
  private shookWeb = false

  get isMoving() { return this.activity === 'Exploring' || this.activity === 'Heading home' }
  get isCelebrating() { return this.storyPhase === 'celebrate' && this.lastAnimation === 'Auto' }
  get celebrationTime() { return this.surface.time - this.storyStarted }
  get isFrowning() { return this.activity === 'Frowning' }

  readonly id: string
  readonly surface: WebSurface
  readonly size: number
  constructor(id: string, surface: WebSurface, size: number, start: [number, number] = [0, 0], variation = 0) {
    this.id = id
    this.surface = surface
    this.size = size
    this.lastTime = surface.time
    this.modeStart = surface.time
    this.deadline = surface.time + 1.2 + variation * .27
    this.waypoint = variation
    const limit = Math.max(0, surface.options.radius - size * 2.8)
    this.position = new Vector3(start[0], start[1], 0)
    if (this.position.length() > limit) this.position.setLength(limit)
    this.feet = legs.map(leg => {
      const point = new Vector3(Math.sin(leg.angle), Math.cos(leg.angle), 0).multiplyScalar(1.85 * size).add(this.position)
      const anchor = surface.nearestFoot(point)
      return { anchor, from: anchor.point.clone(), target: anchor, swing: 0, stepping: false, cycle: -1 }
    })
    this.surface.occupy(id, this.feet.map(foot => foot.anchor))
  }

  investigate(point: Vector3) {
    this.cancelWork()
    this.repair = undefined
    this.target.copy(point).setZ(0)
    this.target.clampLength(0, Math.max(.3, this.surface.options.radius - this.size * 2.5))
    this.inspectionUntil = this.surface.time + 6
    this.activity = 'Exploring'
    this.surface.disturb(point, 1.4)
  }

  get animationTime() { return this.surface.time - this.modeStart }

  private cancelWork() {
    if (this.job) {
      delete this.job.owner
      this.job = undefined
    }
    this.storyPhase = 'choose'
    if (this.work) {
      // Interrupted work remains a real gap or complete thread, never dangling partial silk.
      this.work.coverage = this.surface.options.tattered ? 0 : this.workKind === 'trim' ? 1 : 0
      delete this.work.owner
      this.work = undefined
    }
  }

  private moveTowardsTarget(delta: number, cruisingSpeed: number) {
    const direction = this.target.clone().sub(this.position)
    const distance = direction.length()
    if (distance <= 0.015) return true
    // Fast launch, then brake over the last body-length before touching the work.
    const approach = Math.min(1, distance / (this.size * 1.2))
    const desiredSpeed = cruisingSpeed * (0.12 + 0.88 * approach * approach)
    this.travelSpeed += Math.max(-delta * 7, Math.min(delta * 7, desiredSpeed - this.travelSpeed))
    const next = this.position.clone().addScaledVector(direction.normalize(), Math.min(distance, delta * this.travelSpeed))
    const root = next.clone()
    root.z = this.surface.height(next.x, next.y) + 0.9 * this.size
    const supported = legs.every((leg, index) =>
      leg.hip.clone().multiplyScalar(this.size).add(root).distanceTo(this.footPoint(index)) < 2.25 * this.size)
    if (supported) this.position.copy(next)
    return false
  }

  private updateRepairStory(now: number, delta: number, speed: number) {
    if (this.storyPhase === 'choose') {
      this.activity = 'Resting'
      if (now < this.deadline) return
      this.job = this.surface.claimDamage(this.id, this.position)
      if (this.job) {
        this.target.copy(this.job.points[0]).multiplyScalar(0.96)
        this.storyPhase = 'to-repair'
      } else if (this.surface.damageCount === 0) {
        this.target.set(0, 0, 0)
        this.storyPhase = 'home'
      }
      this.activity = this.storyPhase === 'home' ? 'Heading home' : 'Exploring'
    } else if (this.storyPhase === 'to-repair' || this.storyPhase === 'home') {
      this.activity = this.storyPhase === 'home' ? 'Heading home' : 'Exploring'
      if (!this.moveTowardsTarget(delta, speed)) return
      if (this.storyPhase === 'to-repair' && this.job) {
        this.work = this.job
        this.workProgress = 0
        this.startFray = this.job.fray ?? 0
        this.storyPhase = this.startFray > 0 ? 'trim' : 'repair'
        this.workKind = this.startFray > 0 ? 'trim' : 'spin'
        this.storyStarted = now
        this.activity = this.startFray > 0 ? 'Trimming silk' : 'Spinning silk'
      } else if (this.surface.damageCount === 0) {
        this.position.set(0, 0, 0)
        this.storyPhase = 'celebrate'
        this.storyStarted = now
        this.shookWeb = false
        this.activity = 'Celebrating'
      } else this.storyPhase = 'choose'
    } else if ((this.storyPhase === 'trim' || this.storyPhase === 'repair') && this.job) {
      const trimming = this.storyPhase === 'trim'
      this.activity = trimming ? 'Trimming silk' : 'Spinning silk'
      this.workKind = trimming ? 'trim' : 'spin'
      this.workProgress = Math.min(1, (now - this.storyStarted) / (trimming ? 0.9 : 2.2))
      if (trimming) this.job.fray = this.startFray * (1 - this.workProgress)
      else this.job.coverage = this.workProgress
      if (this.workProgress >= 1) {
        if (trimming) {
          this.storyPhase = 'repair'
          this.storyStarted = now
          this.workProgress = 0
        } else {
          this.job.coverage = 1
          this.job.fray = 0
          delete this.job.owner
          this.surface.completedRepairs++
          this.job = undefined
          this.work = undefined
          this.storyPhase = 'choose'
          this.deadline = now + 0.25
          this.activity = 'Resting'
        }
      }
    } else if (this.storyPhase === 'celebrate') {
      this.activity = 'Celebrating'
      if (now - this.storyStarted >= 1.7 && !this.shookWeb) {
        this.surface.shakeLoose()
        this.surface.disturb(this.position, 0.85)
        this.shookWeb = true
      }
      if (now - this.storyStarted >= 2.4) {
        this.storyPhase = 'frown'
        this.storyStarted = now
        this.activity = 'Frowning'
      }
    } else if (this.storyPhase === 'frown' && now - this.storyStarted >= 1.8) {
      this.storyPhase = 'choose'
      this.deadline = now + 0.2
      this.activity = 'Resting'
    }
  }

  update(animation: SpiderAnimation, temperament: SpiderTemperament, urgency = 1) {
    const now = this.surface.time
    const delta = Math.min(0.05, Math.max(0, now - this.lastTime))
    this.lastTime = now
    if (animation !== this.lastAnimation) {
      this.cancelWork()
      this.repair = undefined
      this.lastAnimation = animation
      this.modeStart = now
      this.deadline = now + 0.8
      this.travelSpeed = 0
      this.activity = 'Resting'
      this.target.copy(this.position)
    }
    const cruisingSpeed = (temperament === 'Calm' ? 0.75 : temperament === 'Grumpy' ? 1.4 : 1.15) * this.size / 0.42 * urgency
    if (!this.isMoving) this.travelSpeed = 0

    if (now < this.inspectionUntil && (animation === 'Auto' || animation === 'Walk')) {
      this.activity = 'Exploring'
      if (this.moveTowardsTarget(delta, cruisingSpeed * 1.8)) {
        this.activity = 'Waving'
        this.inspectionUntil = Math.min(this.inspectionUntil, now + 1.2)
      }
      this.deadline = now + .3
    } else if (animation === 'Auto' && this.surface.options.tattered) {
      this.updateRepairStory(now, delta, cruisingSpeed)
    } else if (animation === 'Auto' || animation === 'Walk') {
      if (this.work) {
        this.workProgress = Math.max(0, Math.min(1, (now - this.deadline) / 3))
        this.work.coverage = this.workKind === 'trim' ? 1 - this.workProgress : this.workProgress
        this.activity = this.workKind === 'trim' ? 'Trimming silk' : 'Spinning silk'
        if (this.workProgress >= 1) {
          if (this.workKind === 'trim') this.repair = this.work
          delete this.work.owner
          this.work = undefined
          this.deadline = now + (this.workKind === 'trim' ? 0.75 : 0.55)
          this.travelSpeed = 0
          this.activity = 'Resting'
        }
      } else if (this.activity === 'Exploring') {
        const direction = this.target.clone().sub(this.position)
        const distance = direction.length()
        if (distance > 0.015) {
          this.moveTowardsTarget(delta, cruisingSpeed)
        }
        else {
          this.activity = 'Resting'
          this.deadline = now + 0.6
          if (animation === 'Auto') {
            for (const side of [1, -1]) {
              const desired = this.position.clone().add(new Vector3(side * this.size * 1.5, -this.size, 0))
              this.work = this.surface.claimWork(this.id, desired, this.size * 1.1, thread =>
                thread.points.every(point => legs.some(leg => {
                  const hip = leg.hip.clone().multiplyScalar(this.size).add(this.position)
                  hip.z = this.surface.height(this.position.x, this.position.y) + 0.9 * this.size
                  const contact = point.clone()
                  contact.z = this.surface.height(point.x, point.y) + this.size * 0.057
                  return hip.distanceTo(contact) < 2.1 * this.size
                })))
              if (this.work) break
            }
            if (this.work) {
              this.workKind = this.work.coverage < 0.5 ? 'spin' : 'trim'
              this.deadline = now + 0.3
            }
          }
        }
      } else if (now >= this.deadline && animation === 'Auto' && this.repair && !this.repair.owner && this.repair.coverage === 0) {
        this.work = this.repair
        this.work.owner = this.id
        this.workKind = 'spin'
        this.workProgress = 0
        this.deadline = now
        this.repair = undefined
      } else if (now >= this.deadline) {
        this.repair = undefined
        this.waypoint++
        const angle = this.waypoint * 2.4
        const radius = Math.min(this.surface.options.radius * 0.32, 1.6)
        this.target.set(Math.sin(angle) * radius, Math.cos(angle) * radius, 0)
        this.activity = 'Exploring'
      }
    } else {
      this.activity = animation === 'Wave' ? 'Waving' : animation === 'Celebrate' ? 'Celebrating' : 'Resting'
    }

    const cadence = (1.4 + 3.8 * Math.min(1, this.travelSpeed / cruisingSpeed)) * urgency
    if (this.isMoving) this.gaitPhase += delta * cadence
    for (let index = 0; index < legs.length; index++) {
      const leg = legs[index]
      const foot = this.feet[index]
      const phase = (this.gaitPhase + leg.phase) % 1
      if (!foot.stepping && this.isMoving && phase > 0.62 && foot.cycle !== Math.floor(this.gaitPhase + leg.phase)) {
        foot.cycle = Math.floor(this.gaitPhase + leg.phase)
        const ahead = this.target.clone().sub(this.position).normalize().multiplyScalar(this.size * (0.2 + 0.22 * this.travelSpeed / cruisingSpeed))
        const desired = new Vector3(Math.sin(leg.angle), Math.cos(leg.angle), 0)
          .multiplyScalar(1.85 * this.size).add(this.position).add(ahead)
        const hip = leg.hip.clone().multiplyScalar(this.size).add(this.position)
        const anchor = this.surface.nearestFoot(desired, hip, 1.95 * this.size)
        foot.from.copy(foot.anchor.point)
        foot.target = anchor
        foot.stepping = true
      }
      if (foot.stepping) {
        foot.swing = Math.min(1, foot.swing + delta * cadence / 0.34)
        if (foot.swing >= 1) {
          foot.anchor = foot.target
          foot.swing = 0
          foot.stepping = false
          this.surface.disturb(foot.anchor.point, 0.035)
        }
      }
    }
    this.surface.occupy(this.id, this.feet.flatMap(foot => [foot.anchor, foot.target]))
  }

  footPoint(index: number) {
    const foot = this.feet[index]
    const eased = foot.swing * foot.swing * (3 - 2 * foot.swing)
    const point = foot.stepping ? foot.from.clone().lerp(foot.target.point, eased) : foot.anchor.point.clone()
    point.z = this.surface.height(point.x, point.y) + this.size * 0.057
      + (foot.stepping ? Math.sin(foot.swing * Math.PI) ** 2 * this.size * 0.18 : 0)
    return point
  }

  dispose() { this.cancelWork(); this.surface.release(this.id) }
}
