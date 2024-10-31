import { isServer } from './isServer'

export const safeWindow: Window = !isServer ? window : ({} as any)
