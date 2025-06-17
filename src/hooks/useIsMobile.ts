import { useState, useEffect } from 'react';
import { useIsMiniApp } from './useIsMiniApp';

const useIsMobile = () => {
  const { isMiniApp } = useIsMiniApp();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount (in case the initial window size is mobile)
    checkIfMobile();

    window.addEventListener('resize', checkIfMobile);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [isMiniApp]);

  return isMobile || isMiniApp;
};

export default useIsMobile;