"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

import { TradeItem } from "./trade/types";

type Props = {
  pets: TradeItem[];
  onSelect: (item: TradeItem) => void;
};

type ItemImageProps = {
  src?: string;
  name: string;
  category: TradeItem["CATEGORY"];
};

function ItemImage({
  src,
  name,
  category,
}: ItemImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div className="flex h-24 w-24 items-center justify-center text-5xl">
        {category === "PETWEAR" ? "🎩" : "🐾"}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={96}
      height={96}
      unoptimized
      onError={() => setFailed(true)}
      className="h-24 w-24 object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110"
    />
  );
}

const gradients = [
  "from-amber-400 via-yellow-400 to-orange-500",
  "from-cyan-400 via-sky-400 to-blue-500",
  "from-pink-400 via-fuchsia-400 to-purple-500",
  "from-emerald-400 via-green-400 to-teal-500",
];

export default function SearchResults({
  pets,
  onSelect,
}: Props) {
  const reduceMotion = useReducedMotion();

  if (!pets.length) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative mt-10"
    >
      <div className="mb-7">
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-100/80 px-4 py-2 text-sm font-black text-amber-700">
          ✨ Matches Found
        </span>

        <h2 className="mt-4 text-3xl font-black text-gray-800 sm:text-4xl">
          Search Results
        </h2>

        <p className="mt-2 text-gray-500">
          We found{" "}
          <span className="font-black text-gray-700">
            {pets.length}{" "}
            {pets.length === 1 ? "item" : "items"}
          </span>{" "}
          matching your search.
        </p>
      </div>

      <div className="rounded-[34px] border border-white/60 bg-white/75 p-3 shadow-xl backdrop-blur-xl sm:p-4">
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {pets.map((item, index) => {
              const gradient =
                gradients[index % gradients.length];

              return (
                <motion.button
                  key={item.ID}
                  type="button"
                  onClick={() => onSelect(item)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={
                    reduceMotion
                      ? undefined
                      : {
                          y: -4,
                          scale: 1.008,
                        }
                  }
                  className="group relative flex w-full flex-col gap-5 overflow-hidden rounded-[26px] border border-gray-100 bg-white/85 p-5 text-left shadow-sm hover:shadow-xl sm:flex-row sm:items-center"
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradient}`}
                  />

                  <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br p-[2px]">
                    <ItemImage
                      src={item.IMAGE}
                      name={item.NAME}
                      category={item.CATEGORY}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-2xl font-black text-gray-800 group-hover:text-amber-600">
                        {item.NAME}
                      </h3>

                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-black text-green-700">
                        {item.CATEGORY}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {item.CATEGORY === "PETWEAR"
                        ? "Current pet wear trading value."
                        : "Current Normal, Neon, and Mega trading values."}
                    </p>

                    <div
                      className={`mt-4 grid gap-2 ${
                        item.CATEGORY === "PET"
                          ? "grid-cols-3"
                          : "grid-cols-1"
                      }`}
                    >
                      <ValueCard
                        label="Normal"
                        value={item.NORMAL}
                      />

                      {item.CATEGORY === "PET" && (
                        <>
                          <ValueCard
                            label="Neon"
                            value={item.NEON}
                          />
                          <ValueCard
                            label="Mega"
                            value={item.MEGA}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`rounded-2xl bg-gradient-to-r ${gradient} px-5 py-3 font-black text-white`}>
                    View Item →
                  </div>
                </motion.button>
              );
            })}
          </div>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function ValueCard({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 px-3 py-2.5 text-center">
      <p className="text-[10px] font-black uppercase">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black">
        {value ?? "N/A"}
      </p>
    </div>
  );
}