"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface CountdownTimerProps {
  countdown: number;
  onComplete?: () => void;
  size?: "sm" | "md" | "lg";
}

export default function CountdownTimer({
  countdown: initialCountdown,
  onComplete,
  size = "md",
}: CountdownTimerProps) {
  const [countdown, setCountdown] = useState(initialCountdown);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || countdown <= 0) {
      if (countdown <= 0) {
        setIsActive(false);
        onComplete?.();
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isActive, onComplete]);

  const sizeClasses = {
    sm: {
      container: "px-4 py-2",
      icon: "size-4",
      label: "text-xs",
      value: "text-sm",
    },
    md: {
      container: "px-6 py-3",
      icon: "size-5",
      label: "text-sm",
      value: "text-lg",
    },
    lg: {
      container: "px-8 py-4",
      icon: "size-6",
      label: "text-base",
      value: "text-2xl",
    },
  };

  const classes = sizeClasses[size];
  const isLowTime = countdown <= 5 && countdown > 0;
  const isTimeUp = countdown <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-md mx-auto"
    >
      {/* Main Timer Card */}
      <div className="relative group">
        {/* Animated Background Blur */}
        <motion.div
          animate={
            isLowTime
              ? { opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }
              : { opacity: 0.2 }
          }
          transition={{
            duration: isLowTime ? 0.6 : 2,
            repeat: isLowTime ? Infinity : 0,
          }}
          className={`absolute -inset-1 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition duration-300 ${
            isLowTime
              ? "bg-gradient-to-r from-destructive to-orange-500"
              : "bg-gradient-to-r from-primary to-accent"
          }`}
        />

        {/* Main Content Container */}
        <div
          className={`relative ${classes.container} rounded-2xl backdrop-blur-md border transition-all duration-300 ${
            isTimeUp
              ? "bg-card/50 border-muted/30"
              : isLowTime
                ? "bg-gradient-to-r from-destructive/10 to-orange-500/10 border-destructive/50 shadow-lg shadow-destructive/20"
                : "bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/30 shadow-lg shadow-primary/10"
          }`}
        >
          <div className="flex items-center justify-between gap-3 md:gap-4 w-full">
            {/* Icon Section */}
            <motion.div
              animate={
                isLowTime ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : {}
              }
              transition={{
                duration: isLowTime ? 0.5 : 0,
                repeat: isLowTime ? Infinity : 0,
              }}
              className={`flex-shrink-0 p-2 md:p-3 rounded-xl transition-colors ${
                isTimeUp
                  ? "bg-muted/20"
                  : isLowTime
                    ? "bg-destructive/20"
                    : "bg-primary/20"
              }`}
            >
              <Zap
                className={`${classes.icon} transition-colors ${
                  isTimeUp
                    ? "text-muted-foreground"
                    : isLowTime
                      ? "text-destructive"
                      : "text-primary"
                }`}
              />
            </motion.div>

            {/* Text and Timer Section */}
            <div className="flex-1 flex items-center justify-between gap-3 md:gap-4">
              <div className="min-w-0">
                <div
                  className={`${classes.label} font-bold uppercase tracking-wider text-muted-foreground transition-colors ${
                    isTimeUp ? "text-muted-foreground" : ""
                  }`}
                >
                  {isTimeUp ? "Battle Started" : "Battle Begins In"}
                </div>
              </div>

              {/* Countdown Display */}
              <motion.div
                key={countdown}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex-shrink-0 font-black tabular-nums transition-all ${classes.value} ${
                  isTimeUp
                    ? "text-muted-foreground"
                    : isLowTime
                      ? "text-destructive"
                      : "text-primary"
                }`}
              >
                {isTimeUp ? "0" : countdown}
              </motion.div>

              {/* Seconds Unit */}
              {!isTimeUp && (
                <div
                  className={`${classes.label} font-black uppercase tracking-wider transition-colors ${
                    isLowTime ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  s
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Ring/Bar (Optional - for larger sizes) */}
        {size === "lg" && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute -bottom-2 left-0 right-0 h-1 bg-muted/20 rounded-full overflow-hidden mx-auto w-11/12"
          >
            <motion.div
              animate={{
                width: `${((initialCountdown - countdown) / initialCountdown) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
              className={`h-full transition-colors ${
                isLowTime
                  ? "bg-gradient-to-r from-destructive to-orange-500"
                  : "bg-gradient-to-r from-primary to-accent"
              }`}
            />
          </motion.div>
        )}
      </div>

      {/* Pulsing Indicator for Low Time */}
      {isLowTime && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="mt-3 text-center text-xs font-semibold text-destructive flex items-center justify-center gap-1"
        >
          <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          Hurry up!
        </motion.div>
      )}
    </motion.div>
  );
}
