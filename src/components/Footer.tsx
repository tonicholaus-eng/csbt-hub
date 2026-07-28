export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/30 bg-white/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-6 py-12 md:flex-row">

        <div>

          <div className="flex items-center gap-3">

            <img
              src="/logo.png"
              alt="CSBT HUB"
              className="h-12 w-12 rounded-full"
            />

            <div>
              <h3 className="text-2xl font-black text-amber-900">
                CSBT HUB
              </h3>

              <p className="text-sm text-gray-500">
                Adopt Me Value Checker
              </p>
            </div>

          </div>

          <p className="mt-4 max-w-md text-gray-600">
            Search values instantly, compare trades, and stay updated with the
            latest CSBT values.
          </p>

        </div>

        <div className="flex flex-col gap-3 text-center md:text-right">

          <a
            href="https://www.facebook.com/groups/5352107604807631"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-blue-600 transition hover:text-blue-700"
          >
            Facebook Community
          </a>

          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} CSBT HUB
          </p>

          <p className="text-xs text-gray-400">
            Not affiliated with Uplift Games or Adopt Me.
          </p>

        </div>

      </div>
    </footer>
  );
}