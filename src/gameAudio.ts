let context: AudioContext | undefined
export function playGameSound(kind: 'failure' | 'hiss') {
  // Audio is supplementary; unsupported or blocked audio must never stop a move.
  try {
    context ??= new AudioContext()
    const audio = context
    void audio.resume().then(() => {
      const gain = audio.createGain()
      gain.connect(audio.destination)
      const now = audio.currentTime
      const duration = kind === 'hiss' ? 0.65 : 0.22
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(kind === 'hiss' ? 0.14 : 0.08, now + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
      let source: AudioBufferSourceNode | OscillatorNode
      if (kind === 'hiss') {
        const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        const noise = audio.createBufferSource()
        noise.buffer = buffer
        const filter = audio.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 2500
        noise.connect(filter)
        filter.connect(gain)
        source = noise
        source.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect() }
      } else {
        const tone = audio.createOscillator()
        tone.type = 'triangle'
        tone.frequency.setValueAtTime(190, now)
        tone.frequency.exponentialRampToValueAtTime(75, now + duration)
        tone.connect(gain)
        source = tone
        source.onended = () => { tone.disconnect(); gain.disconnect() }
      }
      source.start(now)
      source.stop(now + duration)
    }).catch(() => {})
  } catch { /* The visible warning and live region remain available. */ }
}
