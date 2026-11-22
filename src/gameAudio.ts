export type GameSound = 'failure' | 'hiss' | 'gather' | 'whoosh' | 'rocket' | 'bite' | 'hit' | 'firework' | 'flutter' | 'paint' | 'win' | 'spider'
let context: AudioContext | undefined
export function playGameSound(kind: GameSound, duration = 1.45): () => void {
  let cancelled = false
  const nodes: AudioScheduledSourceNode[] = []
  try {
    context ??= new AudioContext()
    const audio = context
    void audio.resume().then(() => {
      if (cancelled) return
      const now = audio.currentTime
      function tone(frequency: number, delay: number, duration: number, volume: number, end = frequency) {
        const osc = audio.createOscillator(), gain = audio.createGain()
        osc.type = kind === 'bite' ? 'sawtooth' : 'triangle'
        osc.frequency.setValueAtTime(frequency, now + delay)
        osc.frequency.exponentialRampToValueAtTime(end, now + delay + duration)
        gain.gain.setValueAtTime(.0001, now + delay)
        gain.gain.exponentialRampToValueAtTime(volume, now + delay + .015)
        gain.gain.exponentialRampToValueAtTime(.0001, now + delay + duration)
        osc.connect(gain); gain.connect(audio.destination)
        osc.onended = () => { osc.disconnect(); gain.disconnect() }
        nodes.push(osc); osc.start(now + delay); osc.stop(now + delay + duration)
      }
      function noise(duration: number, frequency: number, volume: number, delay = 0, filterType: BiquadFilterType = 'bandpass') {
        const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain()
        source.buffer = buffer; filter.type = filterType; filter.frequency.value = frequency; filter.Q.value = .65
        gain.gain.setValueAtTime(.0001, now + delay); gain.gain.exponentialRampToValueAtTime(volume, now + delay + .008); gain.gain.exponentialRampToValueAtTime(.0001, now + delay + duration)
        source.connect(filter); filter.connect(gain); gain.connect(audio.destination)
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect() }
        nodes.push(source); source.start(now + delay); source.stop(now + delay + duration)
      }
      function rocketScream() {
        const whistle = audio.createOscillator(), tremolo = audio.createOscillator()
        const vibrato = audio.createGain(), gain = audio.createGain()
        whistle.type = 'sine'; tremolo.type = 'sine'
        const pitch = 650 + Math.random() * 250
        whistle.frequency.setValueAtTime(pitch, now)
        whistle.frequency.exponentialRampToValueAtTime(pitch * 3.1, now + duration * .85)
        whistle.frequency.exponentialRampToValueAtTime(pitch * 2.3, now + duration)
        tremolo.frequency.setValueAtTime(18, now)
        tremolo.frequency.linearRampToValueAtTime(38, now + duration)
        vibrato.gain.setValueAtTime(15, now)
        vibrato.gain.linearRampToValueAtTime(95, now + duration)
        tremolo.connect(vibrato); vibrato.connect(whistle.frequency)
        gain.gain.setValueAtTime(.0001, now)
        gain.gain.exponentialRampToValueAtTime(.0008, now + .12)
        gain.gain.exponentialRampToValueAtTime(.0011, now + duration * .7)
        gain.gain.exponentialRampToValueAtTime(.0001, now + duration)
        whistle.connect(gain); gain.connect(audio.destination)
        whistle.onended = () => { whistle.disconnect(); gain.disconnect(); vibrato.disconnect(); tremolo.disconnect() }
        nodes.push(whistle, tremolo)
        whistle.start(now); tremolo.start(now)
        whistle.stop(now + duration); tremolo.stop(now + duration)
        noise(duration, 2600, .05)
      }
      switch (kind) {
        case 'failure': tone(190, 0, .22, .07, 75); break
        case 'hiss': noise(.8, 3200, .22); break
        case 'gather': [0, .06, .12].forEach(t => tone(500 + t * 1400, t, .1, .025)); break
        case 'rocket': rocketScream(); break
        case 'whoosh': noise(.18, 1800, .075); break
        case 'bite': noise(.09, 900, .13); tone(260, 0, .1, .025, 90); break
        case 'hit': tone(180, 0, .13, .05, 70); break
        case 'firework':
          // Sharp report, low rolling boom, then scattered burning sparks.
          noise(.13, 1800, .18)
          noise(1.9, 480, .2, 0, 'lowpass')
          tone(85 + Math.random() * 25, 0, .8, .075, 32)
          noise(1.2, 260, .045, .18, 'lowpass')
          noise(.8, 500, .025, .45, 'lowpass')
          for (let spark = 0; spark < 16; spark++) noise(.025 + Math.random() * .065, 1800 + Math.random() * 4000, .025 + Math.random() * .035, .12 + Math.random() * 1.5)
          break
        case 'flutter': noise(.12, 2800, .025); tone(880, 0, .2, .02, 1320); break
        case 'paint': tone(320 + Math.random() * 300, 0, .14, .025); break
        case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .13, .6, .04)); break
        case 'spider': [220, 277, 330].forEach((f, i) => tone(f, i * .09, .17, .025)); break
      }
    }).catch(() => {})
  } catch { /* Audio is supplementary to the visible and accessible feedback. */ }
  return () => { cancelled = true; nodes.forEach(node => { try { node.stop() } catch { /* Already ended. */ } }) }
}
