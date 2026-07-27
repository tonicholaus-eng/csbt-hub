type HeroProps = {
  totalPets: number;
};

export default function Hero({ totalPets }: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 px-8 py-16 text-center text-white shadow-2xl">

      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_60%)]" />

      {/* Decorative Glow Circles */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-yellow-200/20 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-orange-200/20 blur-3xl" />

      {/* Floating Pets */}
      <img
        src="/pets/frost-dragon.webp"
        alt=""
        className="pointer-events-none absolute left-6 top-8 hidden w-32 rotate-[-15deg] opacity-20 lg:block animate-bounce"
      />

      <img
        src="/pets/owl.webp"
        alt=""
        className="pointer-events-none absolute right-8 top-10 hidden w-28 rotate-12 opacity-20 lg:block animate-pulse"
      />

      <img
        src="/pets/shadow-dragon.webp"
        alt=""
        className="pointer-events-none absolute bottom-6 left-10 hidden w-32 -rotate-12 opacity-15 lg:block animate-bounce"
      />

      <img
        src="/pets/balloon-unicorn.webp"
        alt=""
        className="pointer-events-none absolute bottom-8 right-10 hidden w-28 rotate-12 opacity-20 lg:block animate-pulse"
      />

      {/* Sparkles */}
      <div className="absolute left-1/4 top-12 text-3xl opacity-40 animate-pulse">
        ✨
      </div>

      <div className="absolute right-1/3 bottom-12 text-2xl opacity-30 animate-ping">
        ✦
      </div>

      <div className="relative z-10">

        <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">
          🚀 Updated Daily
        </span>

        <h1 className="mt-6 text-5xl font-black tracking-wide md:text-7xl">
          CSBT HUB
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-white/90 md:text-2xl">
          The Ultimate Adopt Me Value Checker & Trade Calculator
        </p>

        <p className="mt-3 text-sm text-white/80">
          Search values instantly • Compare trades • Stay updated
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-6">

          <div className="rounded-2xl bg-white/15 px-8 py-5 backdrop-blur transition hover:scale-105">
            <p className="text-4xl font-black">{totalPets}+</p>
            <p className="mt-1 text-sm text-white/80">
              Pets
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 px-8 py-5 backdrop-blur transition hover:scale-105">
            <p className="text-4xl">⚡</p>
            <p className="mt-1 text-sm text-white/80">
              Instant Search
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 px-8 py-5 backdrop-blur transition hover:scale-105">
            <p className="text-4xl">📈</p>
            <p className="mt-1 text-sm text-white/80">
              Daily Values
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 px-8 py-5 backdrop-blur transition hover:scale-105">
            <p className="text-4xl">🤝</p>
            <p className="mt-1 text-sm text-white/80">
              Trade Calculator
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}