'use client';
import { useEffect } from "react";

// Remove the divRef parameter
function useScrollRestoration(key: string, ready: boolean, delay: number = 0) {
    // Save scroll position when navigating away from the component
    useEffect(() => {
        const handleScroll = () => {
            // Use window.scrollY to get the scroll position
            sessionStorage.setItem(`scroll${key !== undefined ? `-${key}` : ''}`, window.scrollY.toString());
        };

        // Add event listener to window
        window.addEventListener('scroll', handleScroll);

        // Remove event listener from window on cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [key]); // Update dependency array

    // Restore scroll position when returning to the component
    useEffect(() => {
        // Check the ready flag
        if (ready) {
            const savedScrollPosition = sessionStorage.getItem(`scroll${key !== undefined ? `-${key}` : ''}`);
            if (savedScrollPosition) {
                const scrollPos = parseInt(savedScrollPosition, 10);
                const timer = setTimeout(() => {
                    window.scrollTo(0, scrollPos);
                }, delay);
            }
        }
    }, [ready, key]); // Update dependency array
}

export default useScrollRestoration;