// components/Ticker.tsx

import React, { useRef, useEffect, useState, ReactElement } from 'react';
import styles from '../../styles/Ticker.module.css';

interface TickerProps {
    items: ReactElement[];
    speed?: number;
}

const Ticker1: React.FC<TickerProps> = ({ items, speed = 50 }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [contentWidth, setContentWidth] = useState<number>(0);

    useEffect(() => {
        const calculateContentWidth = () => {
            if (containerRef.current) {
                const contentElement = containerRef.current.querySelector(
                    `.${styles.tickerContent}`
                ) as HTMLDivElement;
                if (contentElement) {
                    setContentWidth(contentElement.scrollWidth);
                }
            }
        };

        calculateContentWidth();
        window.addEventListener('resize', calculateContentWidth);

        return () => {
            window.removeEventListener('resize', calculateContentWidth);
        };
    }, [items]);

    // Calculate animation duration based on content width and speed
    const duration = contentWidth / speed;

    return (
        <div className={styles.tickerContainer} ref={containerRef}>
            <div
                className={styles.tickerContent}
                style={{
                    animation: `scroll ${duration}s linear infinite`,
                }}
            >
                {/* Duplicate the items for seamless scrolling */}
                <div className={styles.tickerItems}>
                    {items.map((item, index) => (
                        <div key={`item-1-${index}`} className={styles.tickerItem}>
                            {item}
                        </div>
                    ))}
                </div>
                <div className={styles.tickerItems}>
                    {items.map((item, index) => (
                        <div key={`item-2-${index}`} className={styles.tickerItem}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Ticker1;