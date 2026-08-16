"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

type NichFaceProps = {
  size?: number;
  className?: string;
  animate?: boolean;
};

export default function NichFace({
  size = 150,
  className = "",
  animate = true,
}: NichFaceProps) {
  const shouldReduceMotion = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <motion.div
      aria-label="Nich"
      role="img"
      animate={
        animate && !shouldReduceMotion
          ? {
              y: [0, -3, 0],
              rotate: [0, -1.25, 1.25, 0],
            }
          : undefined
      }
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`relative shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <div className="pointer-events-none absolute inset-[8%] rounded-full bg-yellow-300/25 blur-2xl" />

      {!imageFailed ? (
        <Image
          src="/nich/nich-head.png"
          alt="Nich"
          fill
          priority
          onError={() => setImageFailed(true)}
          className="object-contain drop-shadow-[0_14px_18px_rgba(15,23,42,.28)]"
          sizes={`${size}px`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-6xl">
          😛
        </div>
      )}
    </motion.div>
  );
}