 "use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { TradeItem } from "./trade/types";

type Props = {
  pet: TradeItem;
  onBack: () => void;
};

type PetImageProps = {
  src?: string;
  name: string;
  category: TradeItem["CATEGORY"];
};

function PetImage({ src, name, category }: PetImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-52 w-52 items-center justify-center text-7xl">
        {category === "PETWEAR" ? "🎩" : "🐾"}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={256}
      height={256}
      priority
      unoptimized
      onError={() => setFailed(true)}
      className="h-52 w-52 object-contain drop-shadow-xl"
    />
  );
}

const cards = [
  {
    key: "NORMAL",
    label: "Normal",
    icon: "🟡",
    style: "from-yellow-50 to-orange-100 text-yellow-700",
  },
  {
    key: "NEON",
    label: "Neon",
    icon: "🔷",
    style: "from-cyan-50 to-blue-100 text-cyan-700",
  },
  {
    key: "MEGA",
    label: "Mega",
    icon: "🌈",
    style: "from-pink-50 to-purple-100 text-pink-700",
  },
] as const;

export default function PetDetails({ pet, onBack }: Props) {
  const reduceMotion = useReducedMotion();

  const availableCards =
    pet.CATEGORY === "PETWEAR"
      ? cards.filter((card) => card.key === "NORMAL")
      : cards;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 overflow-hidden rounded-[38px] border border-white/60 bg-white/85 shadow-xl backdrop-blur-xl"
    >
      <div className="bg-gradient-to-br from-amber-500 via-yellow-400 to-orange-500 px-6 py-10 text-white sm:px-10">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-white/20 px-5 py-2 font-black backdrop-blur"
        >
          ← Back
        </button>

        <div className="mt-8 flex flex-col items-center gap-8 lg:flex-row">
          <motion.div
            animate={
              reduceMotion
                ? undefined
                : { y: [0, -8, 0] }
            }
            transition={{
              duration: 4,
              repeat: Infinity,
            }}
            className="rounded-[34px] bg-white/20 p-6"
          >
            <PetImage
              src={pet.IMAGE}
              name={pet.NAME}
              category={pet.CATEGORY}
            />
          </motion.div>

          <div className="text-center lg:text-left">
            <h1 className="text-5xl font-black">
              {pet.NAME}
            </h1>

            <p className="mt-4 text-lg text-white/90">
              {pet.CATEGORY === "PETWEAR"
                ? "Pet Wear trading value"
                : "Compare Normal, Neon and Mega trading values."}
            </p>

            <span className="mt-5 inline-flex rounded-full bg-white/20 px-4 py-2 font-black">
              {pet.CATEGORY === "PETWEAR"
                ? "🎩 Pet Wear"
                : "🐾 Pet"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-10">
        <h2 className="mb-8 text-center text-3xl font-black">
          Value Breakdown
        </h2>

        <div className="grid gap-6 lg:grid-cols-3">
          {availableCards.map((card) => (
            <motion.div
              key={card.key}
              whileHover={
                reduceMotion ? undefined : { y: -8 }
              }
              className={`rounded-[30px] border bg-gradient-to-br p-7 text-center shadow-lg ${card.style}`}
            >
              <div className="text-4xl">
                {card.icon}
              </div>

              <p className="mt-4 text-sm font-black uppercase">
                {card.label}
              </p>

              <p className="mt-5 text-5xl font-black">
                {pet[card.key] ?? "N/A"}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}