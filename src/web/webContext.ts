import { createContext, useContext } from 'react'
import type { WebSurface } from './webSurface'

export const WebContext = createContext<WebSurface | null>(null)
export function useWebSurface() {
  const surface = useContext(WebContext)
  if (!surface) throw new Error('Spider must be placed inside a Web component.')
  return surface
}
