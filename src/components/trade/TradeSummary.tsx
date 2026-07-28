type Props = {
  yourTotal: number;
  theirTotal: number;
};

export default function TradeSummary({
  yourTotal,
  theirTotal,
}: Props) {
  const difference = Math.abs(yourTotal - theirTotal);

  let title = "FAIR";
  let color = "from-green-400 to-emerald-500";
  let message = "Both offers have the same value.";

  if (yourTotal > theirTotal) {
    title = "WIN";
    color = "from-blue-500 to-cyan-500";
    message = `You're overpaying by ${difference}.`;
  }

  if (theirTotal > yourTotal) {
    title = "LOSE";
    color = "from-red-500 to-pink-500";
    message = `You're underpaying by ${difference}.`;
  }

  if (yourTotal === 0 && theirTotal === 0) {
    title = "FAIR";
    color = "from-green-400 to-emerald-500";
    message = "Add pets to both sides to calculate the trade.";
  }

  return (
    <div
      className={`mt-10 rounded-3xl bg-gradient-to-r ${color} p-8 text-center text-white shadow-xl`}
    >
      <h3 className="text-5xl font-black">
        {title}
      </h3>

      <div className="mt-6 flex justify-center gap-10 text-lg font-semibold">
        <div>
          <p>Your Total</p>
          <p className="text-3xl font-black">{yourTotal}</p>
        </div>

        <div>
          <p>Their Total</p>
          <p className="text-3xl font-black">{theirTotal}</p>
        </div>
      </div>

      <p className="mt-6 text-lg opacity-90">
        {message}
      </p>
    </div>
  );
}