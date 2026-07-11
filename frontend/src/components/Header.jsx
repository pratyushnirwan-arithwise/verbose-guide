export default function Header({ title, subtitle, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 rounded-lg border border-white/70 bg-white/85 p-4 shadow-soft backdrop-blur md:flex-row md:items-center md:justify-between dark:border-slate-800/80 dark:bg-slate-900/85 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <img src="/Logo_PNG_1.png" alt="Arithwise" className="h-12 w-12 bg-[#fae8ff] dark:bg-purple-950/40 p-1 border border-[#f5d0fe] dark:border-purple-900/40 rounded-lg object-contain" />
        <div>
          <h1 className="text-2xl font-bold tracking-normal text-slate-950 dark:text-white">{title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </header>
  );
}
