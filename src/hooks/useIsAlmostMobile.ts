import { useState, useEffect } from 'react';

const useIsAlmostMobile = () => {
  const [isAlmostMobile, setIsAlmostMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsAlmostMobile(window.innerWidth < 1080);
    };

    // Check on mount (in case the initial window size is mobile)
    checkIfMobile();

    window.addEventListener('resize', checkIfMobile);

    // Cleanup the event listener on component unmount
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return isAlmostMobile;
};

export default useIsAlmostMobile;