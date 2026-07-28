"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Pet } from "../types/pet";
import { getPet } from "../lib/search";

const popularPets = [
  "Frost Dragon",
  "Shadow Dragon",
  "Owl",
  "Crow",
  "Parrot",
  "Giraffe",
  "Balloon Unicorn",
  "Evil Unicorn",
];

const gradients = [
  "from-cyan-400 via-sky-400 to-blue-500",
  "from-slate-700 via-slate-800 to-black",
  "from-amber-400 via-orange-400 to-yellow-500",
  "from-purple-500 via-fuchsia-500 to-pink-500",
  "from-green-400 via-emerald-500 to-teal-500",
  "from-yellow-400 via-orange-500 to-red-500",
  "from-pink-400 via-fuchsia-500 to-violet-500",
  "from-red-500 via-pink-500 to-purple-500",
];

type Props = {
  onSelect: (pet: Pet) => void;
};

export default function PopularPets({ onSelect }: Props) {
  return (
    <section id="values" className="mt-24">
      <motion.div
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="mb-14 text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-yellow-100/80 px-5 py-2 text-sm font-bold text-yellow-700 backdrop-blur">
          ⭐ Community Favorites
        </span>

        <h2 className="mt-5 text-5xl font-black text-gray-800 md:text-6xl">
          Popular Values
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
          The pets traders search for the most every day.
        </p>
      </motion.div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {popularPets.map((name, index) => {
          const pet = getPet(name);

          if (!pet) return null;

          return (
            <motion.button
              key={name}
              onClick={() => onSelect(pet)}
              initial={{ opacity: 0, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.55,
                delay: index * 0.08,
              }}
              whileHover={{
                y: -12,
                rotateX: 4,
                rotateY: index % 2 === 0 ? -4 : 4,
                scale: 1.03,
              }}
              whileTap={{
                scale: 0.97,
              }}
              className="group relative overflow-hidden rounded-[32px] border border-white/40 bg-white/75 p-6 text-left shadow-xl backdrop-blur-xl"
            >
              {/* Shine */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

              {/* Glow */}
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${gradients[index]}`}
              />

              {/* Badge */}
              <div className="absolute right-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-gray-700 shadow">
                #{index + 1}
              </div>

              {/* Image */}
              <div
                className={`relative rounded-3xl bg-gradient-to-br ${gradients[index]} p-[2px]`}
              >
                <div className="rounded-[22px] bg-gradient-to-br from-white via-white to-gray-50 p-6">
                  <motion.div
                    whileHover={{
                      rotate: [-2, 2, -2],
                      scale: 1.08,
                    }}
                    transition={{
                      duration: 0.5,
                    }}
                  >
                    <Image
                      src={pet.IMAGE}
                      alt={pet.PETS}
                      width={150}
                      height={150}
                      className="mx-auto h-36 w-36 object-contain drop-shadow-2xl"
                    />
                  </motion.div>
                </div>
              </div>

              {/* Info */}
              <h3 className="mt-6 text-2xl font-black text-gray-800 transition-colors duration-300 group-hover:text-amber-600">
                {pet.PETS}
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                View current trading values
              </p>

              {/* Value Preview */}
              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-yellow-100 py-2">
                  <div className="text-xs font-bold text-yellow-700">
                    Normal
                  </div>

                  <div className="font-black text-yellow-800">
                    {pet.NORMAL}
                  </div>
                </div>

                <div className="rounded-xl bg-cyan-100 py-2">
                  <div className="text-xs font-bold text-cyan-700">
                    Neon
                  </div>

                  <div className="font-black text-cyan-800">
                    {pet.NEON}
                  </div>
                </div>

                <div className="rounded-xl bg-pink-100 py-2">
                  <div className="text-xs font-bold text-pink-700">
                    Mega
                  </div>

                  <div className="font-black text-pink-800">
                    {pet.MEGA}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <motion.div
                whileHover={{ x: 6 }}
                className="mt-6 flex items-center justify-between rounded-2xl bg-gray-100 px-5 py-3 font-bold text-gray-700 transition-colors duration-300 group-hover:bg-amber-500 group-hover:text-white"
              >
                <span>View Details</span>

                <span>→</span>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}