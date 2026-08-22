import { useState, useEffect, useRef, useCallback } from 'react';

export function useQuizTimer({
  initialSeconds = 0,
  isCountDown = false,
  durationMinutes = 0,
  isActive = true,
  onTimeUp
}) {
  const [seconds, setSeconds] = useState(() => {
    if (isCountDown && durationMinutes > 0) {
      return durationMinutes * 60;
    }
    return initialSeconds;
  });
  const [isPaused, setIsPaused] = useState(false);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (!isActive || isPaused) return;

    const timer = setInterval(() => {
      setSeconds(prev => {
        if (isCountDown) {
          if (prev <= 1) {
            clearInterval(timer);
            if (onTimeUpRef.current) onTimeUpRef.current();
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, isPaused, isCountDown]);

  const formatTime = useCallback((totalSeconds = seconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [seconds]);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const reset = useCallback((newSec = 0) => setSeconds(newSec), []);

  return {
    seconds,
    formattedTime: formatTime(seconds),
    formatTime,
    isPaused,
    pause,
    resume,
    reset,
    setSeconds
  };
}
