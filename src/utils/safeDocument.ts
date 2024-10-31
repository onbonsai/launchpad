export const safeDocument: Document =
  typeof document !== 'undefined' ? document : ({} as any)
