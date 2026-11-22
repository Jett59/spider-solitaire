import type { Location } from './spiderHomes'

export function columnLocations(): Location[] {
  return Array.from(document.querySelectorAll('.card-stack'), column => {
    const top = column.querySelector('[data-depth="1"]') ?? column
    const bounds = top.getBoundingClientRect()
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  })
}
export function homeLocations(): Location[] {
  return Array.from(document.querySelectorAll('[data-home-index]'), home => {
    const bounds = home.getBoundingClientRect()
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  })
}
