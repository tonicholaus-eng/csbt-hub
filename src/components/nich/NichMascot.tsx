"use client";

import { motion, useReducedMotion } from "framer-motion";
import NichBody, { type NichBodyPose } from "./NichBody";
import NichFace from "./NichFace";

export type NichMascotPose = NichBodyPose;

type NichMascotProps = {
  pose?: NichMascotPose;
  size?: number;
  className?: string;
};

export default function NichMascot({
  pose = "idle",
  size = 240,
  className = "",
}: NichMascotProps) {
  const shouldReduceMotion = useReducedMotion();

  const headSize = size * 0.95;
  const bodySize = size;
  const totalHeight = size * 1.5;

  const isWalking = pose === "walk";
  const isWaving = pose === "wave";
  const isPointing = pose === "point";
  const isCelebrating = pose === "celebrate";

  const headTop = -size * 0.07;
  const bodyTop = headSize * 0.54;

  return (
    <motion.div
      role="img"
      aria-label={`Nich mascot ${pose} pose`}
      animate={
        shouldReduceMotion
          ? undefined
          : isWalking
            ? {
                y: [0, -5, 0],
                rotate: [-1, 1, -1],
              }
            : isCelebrating
              ? {
                  y: [0, -14, 0],
                  rotate: [0, -2, 2, 0],
                }
              : {
                  y: [0, -3, 0],
                }
      }
      transition={{
        duration: isWalking ? 0.55 : isCelebrating ? 0.75 : 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`relative shrink-0 ${className}`}
      style={{
        width: size,
        height: totalHeight,
      }}
    >
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : isWalking
              ? {
                  rotate: [-12, -8, -12],
                  y: [0, -2, 0],
                }
              : isWaving
                ? {
                    rotate: [-11, -14, -9, -11],
                    y: [0, -2, 0],
                  }
                : isPointing
                  ? {
                      rotate: [-10, -7, -10],
                      y: [0, -1, 0],
                    }
                  : isCelebrating
                    ? {
                        rotate: [-12, -7, -12],
                        y: [0, -5, 0],
                      }
                    : {
                        rotate: [-11, -9, -11],
                        y: [0, -2, 0],
                      }
        }
        transition={{
          duration: isWalking
            ? 0.55
            : isWaving
              ? 1.15
              : isCelebrating
                ? 0.75
                : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-1/2 z-30 -translate-x-1/2"
        style={{
          top: headTop,
          transformOrigin: "50% 78%",
        }}
      >
        <NichFace size={headSize} animate={false} />
      </motion.div>

      <div
        className="absolute left-1/2 z-20 -translate-x-1/2"
        style={{
          top: bodyTop,
        }}
      >
        <NichBody pose={pose} size={bodySize} />
      </div>

      <motion.div
        aria-hidden="true"
        animate={
          shouldReduceMotion
            ? undefined
            : {
                opacity: [0.12, 0.24, 0.12],
                scale: [0.92, 1.05, 0.92],
              }
        }
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute left-1/2 top-[4%] -z-10 -translate-x-1/2 rounded-full bg-yellow-300/20 blur-3xl"
        style={{
          width: size * 0.95,
          height: size * 0.95,
        }}
      />

      {isWaving && (
        <motion.div
          aria-hidden="true"
          initial={{
            opacity: 0,
            scale: 0.7,
          }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.7, 1, 1.05, 1.2],
            y: [5, 0, -3, -7],
          }}
          transition={{
            duration: 1.15,
            repeat: Infinity,
            repeatDelay: 1.4,
          }}
          className="absolute z-40 text-center font-black text-amber-500"
          style={{
            right: -size * 0.01,
            top: size * 0.28,
            fontSize: size * 0.09,
          }}
        >
          Hi!
        </motion.div>
      )}

      {isPointing && (
        <motion.div
          aria-hidden="true"
          initial={{
            opacity: 0,
            x: -10,
          }}
          animate={{
            opacity: [0, 1, 1],
            x: [-10, 0, 0],
          }}
          transition={{
            duration: 0.5,
          }}
          className="absolute z-40 whitespace-nowrap rounded-full border border-yellow-200 bg-white/95 px-3 py-1.5 text-xs font-black text-slate-800 shadow-lg"
          style={{
            right: -size * 0.45,
            top: size * 0.55,
          }}
        >
          Over there!
        </motion.div>
      )}

      {isCelebrating && (
        <>
          <motion.span
            aria-hidden="true"
            animate={{
              y: [0, -18, 0],
              rotate: [0, 18, -12, 0],
              scale: [0.85, 1.15, 0.85],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute z-40"
            style={{
              left: -size * 0.02,
              top: size * 0.08,
              fontSize: size * 0.13,
            }}
          >
            🎉
          </motion.span>

          <motion.span
            aria-hidden="true"
            animate={{
              y: [0, -22, 0],
              rotate: [0, -15, 12, 0],
              scale: [0.8, 1.1, 0.8],
            }}
            transition={{
              duration: 1.15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute z-40"
            style={{
              right: -size * 0.02,
              top: size * 0.06,
              fontSize: size * 0.12,
            }}
          >
            ✨
          </motion.span>
        </>
      )}
    </motion.div>
  );
}