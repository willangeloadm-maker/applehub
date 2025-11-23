import { useState, useEffect } from 'react';

let animationTriggerCallbacks: (() => void)[] = [];

export const triggerCartAnimation = () => {
  animationTriggerCallbacks.forEach(callback => callback());
};

export const useCartAnimation = () => {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const triggerAnimation = () => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 600);
    };

    animationTriggerCallbacks.push(triggerAnimation);

    return () => {
      animationTriggerCallbacks = animationTriggerCallbacks.filter(
        cb => cb !== triggerAnimation
      );
    };
  }, []);

  return isPulsing;
};
