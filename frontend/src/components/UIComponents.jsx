import { Check, X } from "lucide-react";
import Shell from "./Shell";

export function IconButton({ title, children, className = "", ...props }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-brand hover:text-brand dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-blue-500 dark:hover:border-blue-500 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextButton({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Rule({ ok, children }) {
  return (
    <div className="flex items-center gap-2">
      <Check size={16} className={ok ? "text-mint dark:text-teal-400" : "text-slate-300 dark:text-slate-700"} />
      <span className="text-slate-600 dark:text-slate-400">{children}</span>
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 shadow-soft transition-all duration-300 transform scale-100 animate-scale-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          <button
            title="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Input({ label, value, onChange, type = "text", required = false }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className="field" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  );
}

export function SectionTitle({ icon, title }) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {icon}
      {title}
    </div>
  );
}

export function Kpi({ title, value, icon }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/90 px-4 py-3 shadow-soft transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/40 text-brand dark:text-blue-400">
          {icon}
        </div>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-350">{title}</span>
      </div>
      <strong className="text-xl font-bold text-slate-950 dark:text-white">{value}</strong>
    </article>
  );
}

export function Loading() {
  return (
    <Shell compact>
      <div className="grid min-h-[60vh] place-items-center">
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 px-5 py-4 shadow-soft text-slate-700 dark:text-slate-300">Loading...</div>
      </div>
    </Shell>
  );
}
