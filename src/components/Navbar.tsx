"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 px-3 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div
        className={`mx-auto max-w-7xl rounded-3xl border border-white/40 bg-white/75 backdrop-blur-2xl transition-all duration-300 ${
          scrolled
            ? "shadow-xl"
            : "shadow-[0_20px_60px_rgba(0,0,0,.12)]"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">

          {/* Logo */}

          <a
            href="#"
            className="group flex items-center gap-3"
          >
            <Image
              src="/logo.png"
              alt="CSBT HUB"
              width={50}
              height={50}
              priority
              className="rounded-full transition duration-300 group-hover:rotate-12 group-hover:scale-110"
            />

            <div>
              <h1 className="text-xl font-black text-amber-900">
                CSBT HUB
              </h1>

              <p className="text-xs text-gray-500">
                Adopt Me Values
              </p>
            </div>
          </a>

          {/* Desktop */}

          <nav className="hidden items-center gap-8 lg:flex">

            <a
              href="#"
              className="relative font-semibold text-gray-700 transition hover:text-yellow-600 after:absolute after:bottom-[-6px] after:left-0 after:h-[3px] after:w-0 after:rounded-full after:bg-yellow-500 after:transition-all hover:after:w-full"
            >
              Home
            </a>

            <a
              href="#values"
              className="relative font-semibold text-gray-700 transition hover:text-yellow-600 after:absolute after:bottom-[-6px] after:left-0 after:h-[3px] after:w-0 after:rounded-full after:bg-yellow-500 after:transition-all hover:after:w-full"
            >
              Values
            </a>

            <a
              href="#calculator"
              className="relative font-semibold text-gray-700 transition hover:text-yellow-600 after:absolute after:bottom-[-6px] after:left-0 after:h-[3px] after:w-0 after:rounded-full after:bg-yellow-500 after:transition-all hover:after:w-full"
            >
              Calculator
            </a>

          </nav>

          {/* Join */}

          <div className="hidden lg:block">
            <a
              href="https://www.facebook.com/groups/5352107604807631"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-3 font-bold text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-2xl"
            >
              Join CSBT →
            </a>
          </div>

          {/* Mobile Button */}

          <button
            onClick={() => setOpen(!open)}
            className="rounded-xl p-2 transition hover:bg-gray-100 lg:hidden"
          >
            <span className="text-3xl">
              {open ? "✕" : "☰"}
            </span>
          </button>

        </div>

        {/* Mobile Menu */}

        <div
          className={`overflow-hidden transition-all duration-300 lg:hidden ${
            open ? "max-h-96" : "max-h-0"
          }`}
        >
          <div className="border-t border-gray-200 px-6 py-6">

            <div className="flex flex-col gap-5">

              <a
                href="#"
                onClick={() => setOpen(false)}
                className="font-semibold text-gray-700 hover:text-yellow-600"
              >
                Home
              </a>

              <a
                href="#values"
                onClick={() => setOpen(false)}
                className="font-semibold text-gray-700 hover:text-yellow-600"
              >
                Values
              </a>

              <a
                href="#calculator"
                onClick={() => setOpen(false)}
                className="font-semibold text-gray-700 hover:text-yellow-600"
              >
                Calculator
              </a>

              <a
                href="https://www.facebook.com/groups/5352107604807631"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-center font-bold text-white shadow-lg"
              >
                Join CSBT →
              </a>

            </div>

          </div>
        </div>

      </div>
    </header>
  );
}