import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  format: (value: number) => string;
  duration?: number;
  className?: string;
  "aria-label"?: string;
};

export function AnimatedNumber({ value, format, duration = 650, className, "aria-label": ariaLabel }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const delta = value - startValue;
    if (!delta || typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previousValue.current = value;
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + delta * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else previousValue.current = value;
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, value]);

  return <span className={className} aria-label={ariaLabel}>{format(displayValue)}</span>;
}
