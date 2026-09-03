"use client";

import type { Transition, Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface ClockIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface ClockIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
  // Continuous sweep, independent of the hover-triggered one-shot
  // animation below -- used where the icon itself needs to communicate
  // "actively running" (e.g. a live clock-in timer), not just react to
  // hover. Spins the hour hand only; the minute hand stays put -- reads
  // as a stopwatch sweep at the small sizes this renders at, and two
  // hands spinning at different rates would just look busy this small.
  spinning?: boolean;
}

const HAND_TRANSITION: Transition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};

const HAND_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    originX: "0%",
    originY: "100%",
  },
  animate: {
    rotate: 360,
    originX: "0%",
    originY: "100%",
  },
};

const MINUTE_HAND_TRANSITION: Transition = {
  duration: 0.5,
  ease: "easeInOut",
};

const MINUTE_HAND_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    originX: "0%",
    originY: "100%",
  },
  animate: {
    rotate: 45,
    originX: "0%",
    originY: "100%",
  },
};

const SPIN_TRANSITION: Transition = {
  duration: 1.8,
  repeat: Infinity,
  ease: "linear",
};

const ClockIcon = forwardRef<ClockIconHandle, ClockIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, spinning = false, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    // Without this, turning `spinning` off mid-rotation leaves the hand
    // wherever the infinite loop happened to be (a random angle, not the
    // rest position) -- `animate` swaps from a plain rotate target back to
    // `controls`, which only drives something once told to. Snap it back
    // to "normal" explicitly so clocking out always reads as "stopped and
    // reset," not "frozen wherever it happened to land."
    useEffect(() => {
      if (!spinning) {
        controls.start("normal");
      }
    }, [spinning, controls]);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
          <motion.line
            animate={spinning ? { rotate: 360, originX: "0%", originY: "100%" } : controls}
            initial={spinning ? { rotate: 0, originX: "0%", originY: "100%" } : "normal"}
            transition={spinning ? SPIN_TRANSITION : HAND_TRANSITION}
            variants={spinning ? undefined : HAND_VARIANTS}
            x1="12"
            x2="12"
            y1="12"
            y2="6"
          />
          <motion.line
            animate={controls}
            initial="normal"
            transition={MINUTE_HAND_TRANSITION}
            variants={MINUTE_HAND_VARIANTS}
            x1="12"
            x2="16"
            y1="12"
            y2="12"
          />
        </svg>
      </div>
    );
  }
);

ClockIcon.displayName = "ClockIcon";

export { ClockIcon };
