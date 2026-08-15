export default function AppLoading() {
  return <div className="mx-auto min-h-[55vh] max-w-6xl animate-pulse px-4 py-10 sm:px-6"><div className="h-10 w-56 rounded-2xl bg-slate-200/70 dark:bg-white/10"/><div className="mt-5 h-44 rounded-[28px] bg-slate-200/60 dark:bg-white/5"/><div className="mt-5 grid gap-4 md:grid-cols-3">{[0,1,2].map((n)=><div key={n} className="h-32 rounded-2xl bg-slate-200/50 dark:bg-white/5"/>)}</div></div>;
}
