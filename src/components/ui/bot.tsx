"use client";

import type { Variants } from "motion/react";
import { motion, useAnimation } from "motion/react";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface BotIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BotIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const ANTENNA_VARIANTS: Variants = {
  initial: { rotate: 0 },
  hover: {
    rotate: [0, -12, 12, -6, 0],
    transition: { duration: 0.6, ease: "easeInOut" },
  },
};

const EYE_VARIANTS: Variants = {
  initial: { scaleY: 1 },
  hover: {
    scaleY: [1, 0.1, 1],
    transition: { duration: 0.35, delay: 0.3 },
  },
};

const BotIcon = forwardRef<BotIconHandle, BotIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const antennaControls = useAnimation();
    const eyeControls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => {
          antennaControls.start("hover");
          eyeControls.start("hover");
        },
        stopAnimation: () => {
          antennaControls.start("initial");
          eyeControls.start("initial");
        },
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          antennaControls.start("hover");
          eyeControls.start("hover");
        }
      },
      [onMouseEnter, antennaControls, eyeControls]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          antennaControls.start("initial");
          eyeControls.start("initial");
        }
      },
      [antennaControls, eyeControls, onMouseLeave]
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
          <motion.path
            animate={antennaControls}
            d="M12 8V4H8"
            style={{ originX: "8px", originY: "4px" }}
            variants={ANTENNA_VARIANTS}
          />
          <rect x="4" y="8" width="16" height="12" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <motion.path animate={eyeControls} d="M9 13v2" variants={EYE_VARIANTS} />
          <motion.path animate={eyeControls} d="M15 13v2" variants={EYE_VARIANTS} />
        </svg>
      </div>
    );
  }
);

BotIcon.displayName = "BotIcon";

export { BotIcon };
