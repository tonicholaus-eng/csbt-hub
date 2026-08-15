export default function ValuesLoading() {
  return <div className="mx-auto min-h-[55vh] max-w-7xl animate-pulse px-4 py-8 sm:px-6"><div className="h-10 w-72 rounded-xl bg-slate-200/70 dark:bg-white/10"/><div className="mt-5 h-36 rounded-[28px] bg-slate-200/55 dark:bg-white/5"/><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({length:10},(_,i)=><div key={i} className="h-52 rounded-2xl bg-slate-200/45 dark:bg-white/5"/>)}</div></div>;
}
