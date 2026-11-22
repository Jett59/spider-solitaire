import { searchEndgame } from './endgameSearch'
import type { Game } from './gameRules'
self.onmessage = (event: MessageEvent<Game>) => self.postMessage(searchEndgame(event.data))
