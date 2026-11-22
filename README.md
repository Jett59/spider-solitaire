# Spider Solitaire

React, TypeScript, Three.js and React Three Fiber. The home page starts with a torn silk web. Its spider repairs every gap, returns to the centre and jumps for joy, accidentally shakes loose a few random strands, frowns, and starts repairing again.

## Development

Use Node 22.18+ (Node 24 recommended).

```sh
npm install
npm run dev
npm run build
npm test
npm run lint
```

Vite serves the app under `/spider-solitaire/`.

## Reusable scene components

Both components belong inside a React Three Fiber `Canvas`. Each `Web` provides a shared silk surface to its spiders; multiple webs can live in the same scene.

```tsx
import { Canvas } from '@react-three/fiber'
import { Web } from './src/web/Web'
import { Spider } from './src/spider/Spider'

<Canvas camera={{ position: [0, 0, 18], fov: 38 }}>
  <hemisphereLight intensity={2.5} />
  <directionalLight position={[-3, 4, 5]} intensity={4} />
  <Web radius={5} spokes={18} rings={10} colour="#c9c1e4">
    <Spider
      colour="#a477ed"
      mood="Curious"
      animation="Auto"
      size={0.42}
      position={[0, 0]}
      onActivityChange={activity => console.log(activity)}
    />
    <Spider colour="#df8e54" mood="Calm" position={[-1, 1]} />
  </Web>
</Canvas>
```

### Spider

- `colour`: CSS colour, default purple.
- `mood`: `Curious`, `Calm`, or `Grumpy`; changes eye expression and walking speed.
- `animation`: `Auto`, `Walk`, `Idle`, `Wave`, or `Celebrate`.
- `size`: scale in web coordinates; constrained to 0.25 through one-sixth of the web radius.
- `position`: initial XY position, constrained inside the web.
- `paused`: stops the agent; pause the containing web as well to freeze its silk motion.
- `onActivityChange`: reports resting, exploring, trimming, spinning, waving, or celebrating.

`Auto` alternates roaming, resting, and maintenance. A spider reserves a reachable ring segment, trims it progressively, and later repairs an existing gap. Threads under another spider's feet cannot be trimmed. On a tattered web, the spider instead reserves damaged sections, removes their dangling remnants and replaces the missing silk. It heads directly to the next damaged section, planting its feet on nearby intact silk, and returns to the centre only after all repairs are complete. Completion requires every gap to be repaired; the celebration happens only after returning to the centre, and new random damage is applied once at landing. Interrupted jobs release their reservation and leave either a complete thread or a gap.

Feet use the same sampled silk paths as rendering. Hip/knee inverse kinematics articulate the legs; alternating steps plant feet on silk. Footsteps and celebration landings disturb the shared web, with fixed outer anchors. The caretaker uses a deterministic itinerary rather than a physics simulation or biological locomotion model.

### Web

- `radius`: 3–12 world units, default 5.
- `spokes`: 8–40 radial threads, default 18.
- `rings`: 4–20 rings, default 10.
- `colour`: silk colour.
- `tattered`: starts with missing ring sections and swaying broken ends; enables the repair/celebration story for automatic spiders. Default false; enabled on the home page.
- `paused`: freezes simulation time.
- `children`: spiders sharing this surface.

Changing dimensions creates a fresh topology and safely resets its caretakers. Silk is batched into one dynamic line geometry; partial thread coverage visibly grows or shrinks during work. Maintenance reuses existing segments, so it cannot accumulate an unbounded number of objects.

The home page pauses offscreen/in hidden tabs, honours reduced-motion preferences, caps pixel ratio at 1.5, and exposes colour, mood, size and thread-count controls.

## Verification

`npm test` checks leg reach, planted feet, jump/landing contact, web topology, disturbance, maintenance, reservations, and multiple caretakers. Browser verification captures stay in ignored `output/playwright/` and `.playwright-cli/` folders.
