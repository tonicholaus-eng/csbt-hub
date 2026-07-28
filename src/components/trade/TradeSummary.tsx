type Props = {
  yourTotal: number;
  theirTotal: number;
};

export default function TradeSummary({
  yourTotal,
  theirTotal,
}: Props) {
  const difference = Math.abs(theirTotal - yourTotal);

  let title = "FAIR";
  let emoji = "🤝";
  let color = "from-yellow-400 via-orange-400 to-amber-500";
  let glow = "shadow-yellow-400/40";
  let message = "Both offers have equal value.";

  if (yourTotal === 0 && theirTotal === 0) {
    title = "READY";
    emoji = "🧮";
    color = "from-slate-500 via-slate-600 to-slate-700";
    glow = "shadow-slate-400/40";
    message = "Add pets to both sides to calculate your trade.";
  } else if (theirTotal > yourTotal) {
    title = "WIN";
    emoji = "🏆";
    color = "from-green-500 via-emerald-500 to-green-700";
    glow = "shadow-green-400/40";
    message = `You're underpaying by ${difference}.`;
  } else if (yourTotal > theirTotal) {
    title = "LOSE";
    emoji = "💸";
    color = "from-red-500 via-pink-500 to-red-700";
    glow = "shadow-red-400/40";
    message = `You're overpaying by ${difference}.`;
  }

  const max = Math.max(yourTotal, theirTotal, 1);
  const yourPercent = (yourTotal / max) * 100;
  const theirPercent = (theirTotal / max) * 100;

  return (
    <section
      className={`relative mt-14 overflow-hidden rounded-[40px] bg-gradient-to-r ${color} p-10 text-white shadow-2xl ${glow}`}
    >
      {/* Background Glow */}
      <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <div className="animate-bounce text-8xl drop-shadow-xl">
            {emoji}
          </div>

          <h2 className="mt-5 text-6xl font-black tracking-tight">
            {title}
          </h2>

          <p className="mt-4 text-xl text-white/90">
            {message}
          </p>
        </div>

        {/* Stats */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl bg-white/15 p-7 text-center backdrop-blur-xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
              Your Offer
            </p>

            <p className="mt-4 text-5xl font-black tabular-nums">
              {yourTotal}
            </p>
          </div>

          <div className="rounded-3xl bg-white/20 p-7 text-center backdrop-blur-xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
              Difference
            </p>

            <p className="mt-4 text-5xl font-black tabular-nums">
              {difference}
            </p>
          </div>

          <div className="rounded-3xl bg-white/15 p-7 text-center backdrop-blur-xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
              Their Offer
            </p>

            <p className="mt-4 text-5xl font-black tabular-nums">
              {theirTotal}
            </p>
          </div>
        </div>

        {/* Comparison */}
        {(yourTotal > 0 || theirTotal > 0) && (
          <div className="mt-10 rounded-3xl bg-white/15 p-7 backdrop-blur-xl">
            <div className="mb-6 flex justify-between text-sm font-bold uppercase tracking-wider">
              <span>Your Offer</span>
              <span>Their Offer</span>
            </div>

            <div className="space-y-5">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Your Value</span>
                  <span>{yourTotal}</span>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${yourPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Their Value</span>
                  <span>{theirTotal}</span>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${theirPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl bg-white/10 p-5 text-center">
              <p className="text-lg font-semibold">
                {title === "WIN" &&
                  "✅ Great trade! You're receiving more value than you're giving."}

                {title === "FAIR" &&
                  "🤝 This trade is balanced based on current CSBT values."}

                {title === "LOSE" &&
                  "⚠️ Be careful! You're giving more value than you're receiving."}

                {title === "READY" &&
                  "Start adding pets to compare both sides instantly."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}