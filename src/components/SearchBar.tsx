type SearchBarProps = {
  search: string;
  onChange: (value: string) => void;
};

export default function SearchBar({
  search,
  onChange,
}: SearchBarProps) {
  return (
    <div className="mx-auto -mt-10 max-w-4xl px-4 relative z-20">
      <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/90 p-3 shadow-2xl backdrop-blur-xl">

        <div className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-2xl">
          🔍
        </div>

        <input
          type="text"
          placeholder="Search any Adopt Me pet..."
          value={search}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full
            rounded-2xl
            bg-transparent
            py-5
            pl-16
            pr-16
            text-lg
            text-gray-800
            outline-none
            placeholder:text-gray-400
          "
        />

        {search && (
          <button
            onClick={() => onChange("")}
            className="
              absolute
              right-5
              top-1/2
              -translate-y-1/2
              h-10
              w-10
              rounded-full
              bg-red-500
              text-white
              transition
              hover:scale-110
            "
          >
            ✕
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-gray-600">
        Popular searches: Frost Dragon • Owl • Shadow Dragon • Bat Dragon
      </p>
    </div>
  );
}