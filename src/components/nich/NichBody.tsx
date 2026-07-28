"use client";

import { motion, useReducedMotion } from "framer-motion";

export type NichBodyPose =
  | "idle"
  | "walk"
  | "wave"
  | "point"
  | "celebrate";

type NichBodyProps = {
  pose?: NichBodyPose;
  size?: number;
  className?: string;
};

export default function NichBody({
  pose = "idle",
  size = 240,
  className = "",
}: NichBodyProps) {
  const shouldReduceMotion = useReducedMotion();

  const scale = size / 240;

  const isWalking = pose === "walk";
  const isWaving = pose === "wave";
  const isPointing = pose === "point";
  const isCelebrating = pose === "celebrate";

  return (
    <div
      aria-hidden="true"
      className={`relative shrink-0 ${className}`}
      style={{
        width: size,
        height: size * 1.05,
      }}
    >
      <div
        className="absolute left-1/2 top-0"
        style={{
          width: 240,
          height: 252,
          transform: `translateX(-50%) scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        {/* Ground shadow */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : isWalking
                ? {
                    scaleX: [1, 0.78, 1],
                    opacity: [0.24, 0.13, 0.24],
                  }
                : isCelebrating
                  ? {
                      scaleX: [1, 0.72, 1],
                      opacity: [0.22, 0.1, 0.22],
                    }
                  : {
                      scaleX: [1, 0.94, 1],
                      opacity: [0.2, 0.16, 0.2],
                    }
          }
          transition={{
            duration: isWalking ? 0.55 : isCelebrating ? 0.75 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="
            absolute
            bottom-[1px]
            left-1/2
            h-[15px]
            w-[154px]
            -translate-x-1/2
            rounded-full
            bg-slate-950/20
            blur-md
          "
        />

        {/* Hood behind the head */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  scaleX: [1, 1.012, 1],
                  scaleY: [1, 0.992, 1],
                }
          }
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="
            absolute
            left-1/2
            top-[1px]
            z-0
            h-[75px]
            w-[130px]
            -translate-x-1/2
            rounded-[58px_58px_34px_34px]
            border-[4px]
            border-amber-700
            bg-gradient-to-b
            from-yellow-300
            via-yellow-400
            to-amber-400
            shadow-[0_11px_26px_rgba(120,53,15,.3)]
          "
        >
          <div
            className="
              absolute
              left-[10px]
              top-[9px]
              h-[50px]
              w-[31px]
              -rotate-[18deg]
              rounded-full
              bg-yellow-100/35
              blur-[1px]
            "
          />

          <div
            className="
              absolute
              right-[10px]
              top-[9px]
              h-[50px]
              w-[31px]
              rotate-[18deg]
              rounded-full
              bg-amber-600/18
              blur-[1px]
            "
          />

          {/* Dark head opening */}
          <div
            className="
              absolute
              bottom-[3px]
              left-1/2
              h-[37px]
              w-[82px]
              -translate-x-1/2
              rounded-[48%_48%_44%_44%]
              border-[4px]
              border-amber-800
              bg-slate-950
            "
          />
        </motion.div>

        {/* Rear shoulder and arm */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : isWalking
                ? {
                    rotate: [-20, 21, -20],
                    x: [3, -3, 3],
                  }
                : isCelebrating
                  ? {
                      rotate: [4, 110, 101, 110],
                      x: [0, 6, 4, 6],
                      y: [0, -13, -8, -13],
                    }
                  : {
                      rotate: [2, -2, 2],
                    }
          }
          transition={{
            duration: isWalking
              ? 0.55
              : isCelebrating
                ? 0.75
                : 3.1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="
            absolute
            right-[15px]
            top-[72px]
            z-10
            h-[103px]
            w-[53px]
            origin-[45%_12%]
          "
        >
          <div
            className="
              absolute
              left-[7px]
              top-0
              h-[76px]
              w-[39px]
              rounded-[22px_22px_18px_18px]
              border-[4px]
              border-amber-700
              bg-gradient-to-b
              from-yellow-300
              via-yellow-400
              to-amber-500
              shadow-[0_8px_14px_rgba(120,53,15,.2)]
            "
          />

          <div
            className="
              absolute
              bottom-[1px]
              left-[4px]
              h-[39px]
              w-[43px]
              rounded-[46%]
              border-[4px]
              border-amber-800
              bg-gradient-to-br
              from-orange-100
              to-orange-200
              shadow-sm
            "
          >
            <div
              className="
                absolute
                right-[4px]
                top-[7px]
                h-[16px]
                w-[8px]
                rotate-12
                rounded-full
                bg-orange-300/55
              "
            />
          </div>
        </motion.div>

        {/* Left leg */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : isWalking
                ? {
                    rotate: [18, -18, 18],
                    x: [-3, 4, -3],
                    y: [0, -3, 0],
                  }
                : isCelebrating
                  ? {
                      rotate: [-8, 7, -8],
                      y: [0, -8, 0],
                    }
                  : {
                      rotate: [0, 1.2, 0],
                    }
          }
          transition={{
            duration: isWalking ? 0.55 : isCelebrating ? 0.75 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="
            absolute
            left-[62px]
            top-[169px]
            z-10
            h-[76px]
            w-[56px]
            origin-top
          "
        >
          <div
            className="
              absolute
              left-[12px]
              top-0
              h-[50px]
              w-[34px]
              rounded-[7px_7px_17px_17px]
              border-[4px]
              border-slate-950
              bg-gradient-to-b
              from-slate-800
              to-slate-950
            "
          />

          <div
            className="
              absolute
              -left-[7px]
              bottom-0
              h-[31px]
              w-[69px]
              -rotate-[3deg]
              rounded-[22px_27px_13px_13px]
              border-[4px]
              border-slate-300
              bg-white
              shadow-[0_7px_12px_rgba(15,23,42,.25)]
            "
          >
            <div
              className="
                absolute
                left-[8px]
                top-[6px]
                h-[5px]
                w-[37px]
                rounded-full
                bg-yellow-400
              "
            />

            <div
              className="
                absolute
                bottom-[3px]
                left-[5px]
                right-[5px]
                h-[5px]
                rounded-full
                bg-slate-900
              "
            />

            <div
              className="
                absolute
                right-[9px]
                top-[7px]
                h-[5px]
                w-[9px]
                rounded-full
                bg-slate-300
              "
            />
          </div>
        </motion.div>

        {/* Right leg */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : isWalking
                ? {
                    rotate: [-18, 18, -18],
                    x: [4, -3, 4],
                    y: [-3, 0, -3],
                  }
                : isCelebrating
                  ? {
                      rotate: [8, -7, 8],
                      y: [0, -8, 0],
                    }
                  : {
                      rotate: [0, -1.2, 0],
                    }
          }
          transition={{
            duration: isWalking ? 0.55 : isCelebrating ? 0.75 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="
            absolute
            right-[62px]
            top-[169px]
            z-10
            h-[76px]
            w-[56px]
            origin-top
          "
        >
          <div
            className="
              absolute
              left-[10px]
              top-0
              h-[50px]
              w-[34px]
              rounded-[7px_7px_17px_17px]
              border-[4px]
              border-slate-950
              bg-gradient-to-b
              from-slate-800
              to-slate-950
            "
          />

          <div
            className="
              absolute
              -left-[6px]
              bottom-0
              h-[31px]
              w-[69px]
              rotate-[3deg]
              rounded-[27px_22px_13px_13px]
              border-[4px]
              border-slate-300
              bg-white
              shadow-[0_7px_12px_rgba(15,23,42,.25)]
            "
          >
            <div
              className="
                absolute
                right-[8px]
                top-[6px]
                h-[5px]
                w-[37px]
                rounded-full
                bg-yellow-400
              "
            />

            <div
              className="
                absolute
                bottom-[3px]
                left-[5px]
                right-[5px]
                h-[5px]
                rounded-full
                bg-slate-900
              "
            />

            <div
              className="
                absolute
                left-[9px]
                top-[7px]
                h-[5px]
                w-[9px]
                rounded-full
                bg-slate-300
              "
            />
          </div>
        </motion.div>

        {/* Main hoodie torso */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : isWalking
                ? {
                    rotate: [-1.5, 1.5, -1.5],
                    y: [0, -4, 0],
                  }
                : isCelebrating
                  ? {
                      y: [0, -11, 0],
                      rotate: [-2, 2, -2],
                    }
                  : {
                      scaleX: [1, 1.015, 1],
                      scaleY: [1, 0.992, 1],
                    }
          }
          transition={{
            duration: isWalking
              ? 0.55
              : isCelebrating
                ? 0.75
                : 2.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="
            absolute
            left-1/2
            top-[43px]
            z-20
            h-[143px]
            w-[158px]
            -translate-x-1/2
          "
        >
          {/* Torso base */}
          <div
            className="
              absolute
              inset-0
              rounded-[45px_45px_40px_40px]
              border-[4px]
              border-amber-700
              bg-gradient-to-b
              from-yellow-300
              via-yellow-400
              to-amber-500
              shadow-[0_18px_30px_rgba(120,53,15,.3)]
            "
          />

          {/* Left highlight */}
          <div
            className="
              absolute
              left-[17px]
              top-[19px]
              h-[87px]
              w-[30px]
              -rotate-[8deg]
              rounded-full
              bg-yellow-100/27
              blur-[1px]
            "
          />

          {/* Right shadow */}
          <div
            className="
              absolute
              right-[13px]
              top-[21px]
              h-[85px]
              w-[29px]
              rotate-[8deg]
              rounded-full
              bg-amber-700/14
              blur-[1px]
            "
          />

          {/* Tight collar opening */}
          <div
            className="
              absolute
              left-1/2
              top-[-5px]
              z-10
              h-[24px]
              w-[58px]
              -translate-x-1/2
              rounded-[50%]
              border-[4px]
              border-amber-800
              bg-slate-950
            "
          />

          {/* Left hood flap wrapping toward jaw */}
          <div
            className="
              absolute
              left-[26px]
              top-[-6px]
              z-30
              h-[42px]
              w-[49px]
              -rotate-[14deg]
              rounded-[60%_40%_52%_45%]
              border-l-[4px]
              border-t-[4px]
              border-amber-700
              bg-gradient-to-br
              from-yellow-300
              to-yellow-400
              shadow-[-4px_-2px_8px_rgba(120,53,15,.08)]
            "
          />

          {/* Right hood flap wrapping toward jaw */}
          <div
            className="
              absolute
              right-[26px]
              top-[-6px]
              z-30
              h-[42px]
              w-[49px]
              rotate-[14deg]
              rounded-[40%_60%_45%_52%]
              border-r-[4px]
              border-t-[4px]
              border-amber-700
              bg-gradient-to-bl
              from-yellow-300
              to-yellow-400
              shadow-[4px_-2px_8px_rgba(120,53,15,.08)]
            "
          />

          {/* Inner collar rim */}
          <div
            className="
              absolute
              left-1/2
              top-[4px]
              z-40
              h-[14px]
              w-[43px]
              -translate-x-1/2
              rounded-b-full
              border-b-[3px]
              border-amber-800/70
            "
          />

          {/* Drawstrings */}
          <div
            className="
              absolute
              left-[60px]
              top-[21px]
              z-40
              h-[31px]
              w-[4px]
              rotate-[5deg]
              rounded-full
              bg-slate-900
            "
          >
            <span
              className="
                absolute
                -bottom-[3px]
                left-1/2
                h-[8px]
                w-[8px]
                -translate-x-1/2
                rounded-full
                bg-slate-950
              "
            />
          </div>

          <div
            className="
              absolute
              right-[60px]
              top-[21px]
              z-40
              h-[31px]
              w-[4px]
              -rotate-[5deg]
              rounded-full
              bg-slate-900
            "
          >
            <span
              className="
                absolute
                -bottom-[3px]
                left-1/2
                h-[8px]
                w-[8px]
                -translate-x-1/2
                rounded-full
                bg-slate-950
              "
            />
          </div>

          {/* Chest logo */}
          <motion.div
            animate={
              shouldReduceMotion
                ? undefined
                : isCelebrating
                  ? {
                      scale: [1, 1.06, 1],
                    }
                  : undefined
            }
            transition={{
              duration: 0.75,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="
              absolute
              left-1/2
              top-[52px]
              w-[78px]
              -translate-x-1/2
              rounded-[13px]
              border-[3px]
              border-white/75
              bg-slate-950
              px-2
              py-[7px]
              text-center
              shadow-[0_6px_10px_rgba(15,23,42,.3)]
            "
          >
            <p
              className="
                text-[17px]
                font-black
                leading-[15px]
                tracking-[-0.04em]
                text-yellow-300
              "
            >
              CSBT
            </p>

            <p
              className="
                mt-[2px]
                text-[14px]
                font-black
                leading-[13px]
                tracking-[-0.02em]
                text-white
              "
            >
              HUB
            </p>
          </motion.div>

          {/* Hoodie pocket */}
          <div
            className="
              absolute
              bottom-[15px]
              left-1/2
              h-[31px]
              w-[94px]
              -translate-x-1/2
              rounded-[9px_9px_20px_20px]
              border-[3px]
              border-amber-700/70
              bg-amber-500/40
            "
          >
            <div
              className="
                absolute
                left-[10px]
                top-[6px]
                h-[15px]
                w-[24px]
                -rotate-[12deg]
                rounded-full
                border-l-[3px]
                border-amber-700/60
              "
            />

            <div
              className="
                absolute
                right-[10px]
                top-[6px]
                h-[15px]
                w-[24px]
                rotate-[12deg]
                rounded-full
                border-r-[3px]
                border-amber-700/60
              "
            />
          </div>

          {/* Waistband */}
          <div
            className="
              absolute
              bottom-[3px]
              left-[10px]
              right-[10px]
              h-[12px]
              rounded-full
              border-t-[3px]
              border-amber-700/60
              bg-amber-600/28
            "
          />
        </motion.div>

        {/* Front arm */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : isWaving
                ? {
                    rotate: [0, -81, -67, -83, -66, -81],
                    x: [0, -8, -12, -8, -12, -8],
                    y: [0, -3, -8, -3, -8, -3],
                  }
                : isPointing
                  ? {
                      rotate: -69,
                      x: 13,
                      y: 10,
                    }
                  : isCelebrating
                    ? {
                        rotate: [0, -101, -91, -101],
                        x: [0, -8, -5, -8],
                        y: [0, -7, -3, -7],
                      }
                    : isWalking
                      ? {
                          rotate: [21, -21, 21],
                          x: [-3, 4, -3],
                        }
                      : {
                          rotate: [-2, 2, -2],
                        }
          }
          transition={{
            duration: isWaving
              ? 1.15
              : isWalking
                ? 0.55
                : isCelebrating
                  ? 0.75
                  : 3,
            repeat: Infinity,
            repeatDelay: isWaving ? 1.4 : 0,
            ease: "easeInOut",
          }}
          className="
            absolute
            left-[15px]
            top-[76px]
            z-30
            h-[103px]
            w-[53px]
            origin-[58%_12%]
          "
        >
          <div
            className="
              absolute
              left-[6px]
              top-0
              h-[76px]
              w-[39px]
              rounded-[22px_22px_18px_18px]
              border-[4px]
              border-amber-700
              bg-gradient-to-b
              from-yellow-300
              via-yellow-400
              to-amber-500
              shadow-[0_8px_14px_rgba(120,53,15,.2)]
            "
          />

          <div
            className="
              absolute
              bottom-[1px]
              left-[3px]
              h-[39px]
              w-[43px]
              rounded-[46%]
              border-[4px]
              border-amber-800
              bg-gradient-to-br
              from-orange-100
              to-orange-200
              shadow-sm
            "
          >
            <div
              className="
                absolute
                left-[4px]
                top-[7px]
                h-[16px]
                w-[8px]
                -rotate-12
                rounded-full
                bg-orange-300/55
              "
            />

            {isPointing && (
              <div
                className="
                  absolute
                  -right-[35px]
                  top-[8px]
                  h-[14px]
                  w-[44px]
                  rounded-full
                  border-[3px]
                  border-amber-800
                  bg-gradient-to-r
                  from-orange-200
                  to-orange-100
                "
              >
                <div
                  className="
                    absolute
                    right-[2px]
                    top-[2px]
                    h-[4px]
                    w-[13px]
                    rounded-full
                    bg-white/40
                  "
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Wave effects */}
        {isWaving && (
          <>
            <motion.span
              initial={{
                opacity: 0,
                scale: 0.6,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.6, 1, 1, 1.2],
                rotate: [-10, 8, -8],
              }}
              transition={{
                duration: 1.15,
                repeat: Infinity,
                repeatDelay: 1.4,
              }}
              className="
                absolute
                left-[-3px]
                top-[27px]
                z-40
                text-[30px]
              "
            >
              ✨
            </motion.span>

            <motion.span
              initial={{
                opacity: 0,
                scale: 0.5,
              }}
              animate={{
                opacity: [0, 0.9, 0],
                scale: [0.5, 0.9, 1.1],
              }}
              transition={{
                duration: 1.15,
                delay: 0.2,
                repeat: Infinity,
                repeatDelay: 1.4,
              }}
              className="
                absolute
                left-[-5px]
                top-[72px]
                z-40
                text-[20px]
              "
            >
              ✦
            </motion.span>
          </>
        )}

        {/* Celebration effects */}
        {isCelebrating && (
          <>
            <motion.span
              animate={{
                y: [0, -25, 0],
                rotate: [0, 18, -12, 0],
                scale: [0.8, 1.1, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
                absolute
                left-[-2px]
                top-[19px]
                z-40
                text-[34px]
              "
            >
              🎉
            </motion.span>

            <motion.span
              animate={{
                y: [0, -31, 0],
                rotate: [0, -18, 13, 0],
                scale: [0.75, 1.05, 0.75],
              }}
              transition={{
                duration: 1.15,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="
                absolute
                right-[-2px]
                top-[15px]
                z-40
                text-[32px]
              "
            >
              ✨
            </motion.span>
          </>
        )}

        {/* Walking dust */}
        {isWalking && !shouldReduceMotion && (
          <>
            <motion.span
              animate={{
                opacity: [0, 0.65, 0],
                scale: [0.5, 1, 1.25],
                x: [0, -24, -45],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="
                absolute
                bottom-[4px]
                left-[53px]
                h-[10px]
                w-[30px]
                rounded-full
                bg-yellow-400/55
                blur-sm
              "
            />

            <motion.span
              animate={{
                opacity: [0, 0.5, 0],
                scale: [0.45, 0.9, 1.15],
                x: [0, -18, -36],
              }}
              transition={{
                duration: 0.8,
                delay: 0.4,
                repeat: Infinity,
                ease: "easeOut",
              }}
              className="
                absolute
                bottom-[14px]
                left-[83px]
                h-[8px]
                w-[24px]
                rounded-full
                bg-orange-300/50
                blur-sm
              "
            />
          </>
        )}
      </div>
    </div>
  );
}