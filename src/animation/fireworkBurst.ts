export interface BurstSpark { angle: number; speed: number; life: number; hue: number; phase: number; gravity: number }
export function createBurst(hue: number, random = Math.random): BurstSpark[] {
  const style = Math.floor(random() * 3), radius = 90 + random() * 90
  return Array.from({ length: 180 }, (_, i) => ({
    angle: i * 2.39996 + (random() - .5) * .2,
    speed: radius * (style === 1 ? .85 + random() * .15 : Math.sqrt(random())) * (style === 2 ? .75 : 1),
    life: 1.4 + random() * 1.5,
    hue: style === 2 ? 35 + random() * 15 : hue + random() * 20,
    phase: random() * Math.PI * 2,
    gravity: style === 2 ? 45 : 26,
  }))
}
export function sparkPosition(spark: BurstSpark, age: number) {
  const expansion = (1 - Math.exp(-age * 1.3)) / 1.3
  return { x: Math.cos(spark.angle) * spark.speed * expansion,
    y: Math.sin(spark.angle) * spark.speed * expansion + spark.gravity * age * age }
}
export function createBurstRenderer() {
  const smoke = document.createElement('canvas')
  smoke.width = smoke.height = 96
  const brush = smoke.getContext('2d')!
  const cloud = brush.createRadialGradient(48,48,0,48,48,48)
  cloud.addColorStop(0, '#a0aabc'); cloud.addColorStop(.4, '#7d899b88'); cloud.addColorStop(1, '#6c798900')
  brush.fillStyle = cloud; brush.fillRect(0,0,96,96)
  return (ctx: CanvasRenderingContext2D, sparks: BurstSpark[], x: number, y: number, age: number, lifetime: number) => {
    ctx.save()
    // Smoke drifts and expands after the flash instead of disappearing with it.
    ctx.globalAlpha = Math.max(0, 1 - age / lifetime) * Math.min(1, age * 2) * .13
    for (let puff = 0; puff < 5; puff++) {
      const size = 65 + age * 65
      ctx.drawImage(smoke, x + Math.cos(puff * 2.4) * age * 30 + age * 17 - size / 2,
        y + Math.sin(puff * 2.4) * age * 20 - age * 15 - size / 2, size, size)
    }
    ctx.globalCompositeOperation = 'lighter'
    if (age < .18) {
      ctx.globalAlpha = 1 - age / .18
      const flash = ctx.createRadialGradient(x,y,0,x,y,35)
      flash.addColorStop(0,'#ffffff'); flash.addColorStop(.15,'#fff4c9'); flash.addColorStop(1,'#ffdb7700')
      ctx.fillStyle = flash; ctx.fillRect(x-35,y-35,70,70)
    }
    for (const spark of sparks) {
      if (age > spark.life) continue
      const point = sparkPosition(spark, age), tail = sparkPosition(spark, Math.max(0, age - .09))
      const fade = (1 - age / spark.life) ** .65
      const twinkle = age > .7 ? .3 + .7 * Math.sin(age * 24 + spark.phase) ** 2 : 1
      ctx.globalAlpha = fade * twinkle
      ctx.strokeStyle = ctx.fillStyle = `hsl(${spark.hue} 95% ${75 - age * 10}%)`
      ctx.lineWidth = age < .3 ? 1.8 : .9
      ctx.beginPath(); ctx.moveTo(x+tail.x,y+tail.y); ctx.lineTo(x+point.x,y+point.y); ctx.stroke()
      ctx.fillRect(x+point.x-1,y+point.y-1,2,2)
      // Soft glows without expensive per-particle canvas shadows.
      ctx.globalAlpha = fade * twinkle * .1
      ctx.beginPath(); ctx.arc(x+point.x,y+point.y,4,0,Math.PI*2); ctx.fill()
    }
    ctx.restore()
  }
}
