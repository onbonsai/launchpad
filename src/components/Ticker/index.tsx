import React, { useMemo, CSSProperties } from 'react'
import styles from '@src/styles/Ticker.module.css'

const sharedPositionProps = {
  position: 'fixed',
}

export const Ticker = ({ position, slideSpeed, children }: React.PropsWithChildren<TickerProps>) => {
  const positionToApply = useMemo(() => {
    if (!position) return {}
    if (position === 'top') {
      return {
        ...sharedPositionProps,
        top: 0,
      }
    }
    return {
      ...sharedPositionProps,
      bottom: 0,
    }
  }, [position])

  const animationDuration = useMemo(() => (slideSpeed ? { animationDuration: slideSpeed } : {}), [slideSpeed])

  return (
    <div style={positionToApply} className={styles.ticker}>
      <div className={styles.tickerList} style={animationDuration}>
        {children}
      </div>
    </div>
  )
}

export interface TickerProps {
  /** Positions the ticker at the top or bottom of the viewport, if left out, will not position at all */
  position?: 'top' | 'bottom'
  /** Must be a CSS readable duration
   * @default 10s
   * @example '15s'
   * @example '1s'
   * @example '200ms'
   */
  slideSpeed?: CSSProperties['animationDuration']
}

export interface TickerItem {
  item: any
  /** If present, this will be used as the key, defaults to index */
  id?: string
}