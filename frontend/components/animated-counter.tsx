import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number; // seconds
  decimals?: number; // number of decimal places
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 0.5,
  decimals = 2,
  className = "",
}) => {
  const motionValue = useMotionValue(value);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      onUpdate: () => {},
    });

    return () => controls.stop();
  }, [value, duration, motionValue]);

  const displayValue = useTransform(motionValue, (latest) =>
    latest.toFixed(decimals),
  );

  const [currentValue, setCurrentValue] = React.useState<string>(value.toFixed(decimals));

  useEffect(() => {
    const unsubscribe = displayValue.on("change", (v) => setCurrentValue(v));
    return () => unsubscribe();
  }, [displayValue]);

  return (
    <motion.div className={className}>
      <motion.span>
        {currentValue} {/* Framer Motion transforms the value to string */}
      </motion.span>
    </motion.div>
  );
};

export default AnimatedCounter;
