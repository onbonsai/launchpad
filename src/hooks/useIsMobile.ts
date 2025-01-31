import { useState, useEffect } from 'react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Check on mount (in case the initial window size is mobile)
    checkIfMobile();

    window.addEventListener('resize', checkIfMobile);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return isMobile;
};

export default useIsMobile;