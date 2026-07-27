export default function Navbar() {
  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto mt-5 flex max-w-7xl items-center justify-between rounded-full border border-white/20 bg-white/15 px-6 py-4 shadow-2xl backdrop-blur-xl">

        <div className="flex items-center gap-3">

          <img
            src="/logo.png"
            alt="CSBT HUB"
            className="h-12 w-12 rounded-full"
          />

          <div>
            <h1 className="text-xl font-black text-amber-900">
              CSBT HUB
            </h1>

            <p className="text-xs text-gray-600">
              Adopt Me Values
            </p>
          </div>

        </div>

        <nav className="hidden gap-8 font-semibold text-gray-700 md:flex">
          <a href="#" className="transition hover:text-amber-600">
            Home
          </a>

          <a href="#" className="transition hover:text-amber-600">
            Values
          </a>

          <a href="#" className="transition hover:text-amber-600">
            Calculator
          </a>
        </nav>

        <a
  href="https://www.facebook.com/groups/5352107604807631"
  target="_blank"
  rel="noopener noreferrer"
  className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white transition hover:scale-105 hover:bg-blue-700"
>
  ⓕ Join CSBT
</a>

      </div>
    </header>
  );
}