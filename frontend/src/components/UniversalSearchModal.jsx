import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../api";

export default function UniversalSearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [data, setData] = useState({ employees: [], tools: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      api("/api/employees").catch(() => ({ names: [] })),
      api("/api/available-tools").catch(() => ({ tools: [] }))
    ]).then(([empData, toolsData]) => {
      setData({
        employees: empData.names || [],
        tools: toolsData.tools || []
      });
      setLoading(false);
    });
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const list = [];

    data.employees.forEach(name => {
      if (name.toLowerCase().includes(q)) {
        list.push({ type: "employee", title: name, subtitle: "Configure access permissions" });
      }
    });

    data.tools.forEach(tool => {
      if (tool.name.toLowerCase().includes(q)) {
        list.push({ type: "tool", title: tool.name, subtitle: tool.description });
      }
    });

    const actions = [
      { type: "action", title: "Go to Dashboard", subtitle: "Superuser admin panel", handler: () => navigate("/dashboard") },
      { type: "action", title: "Go to Tools page", subtitle: "User tools directory", handler: () => navigate("/tools") },
      { type: "action", title: "Create new user account", subtitle: "Register a new user", handler: () => navigate("/signup") },
      {
        type: "action", title: "Toggle Light/Dark mode", subtitle: "Change theme style", handler: () => {
          const theme = localStorage.getItem("theme") === "light" ? "dark" : "light";
          localStorage.setItem("theme", theme);
          if (theme === "dark") document.documentElement.classList.add("dark");
          else document.documentElement.classList.remove("dark");
        }
      }
    ];

    actions.forEach(act => {
      if (act.title.toLowerCase().includes(q) || act.subtitle.toLowerCase().includes(q)) {
        list.push(act);
      }
    });

    return list.slice(0, 8);
  }, [query, data, navigate]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeys = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex(prev => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[index]) {
          triggerResult(results[index]);
        }
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [isOpen, index, results]);

  const triggerResult = (res) => {
    onClose();
    if (res.type === "employee") {
      navigate(`/dashboard?employee=${encodeURIComponent(res.title)}`);
    } else if (res.type === "tool") {
      navigate("/tools");
    } else if (res.type === "action") {
      res.handler();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-[15vh] backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
        <div className="relative border-b border-slate-100 dark:border-slate-800/80 p-4">
          <Search className="absolute left-4 top-4 text-slate-400 dark:text-slate-500" size={20} />
          <input
            autoFocus
            className="w-full bg-transparent pl-8 pr-12 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none text-base"
            placeholder="Search employees, tools, actions... (ESC to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="absolute right-4 top-4 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">ESC</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {loading && <div className="p-4 text-center text-sm text-slate-500">Loading search catalog...</div>}
          {!loading && results.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              {query ? "No matches found." : "Type to search..."}
            </div>
          )}
          {results.map((res, i) => (
            <button
              key={i}
              onClick={() => triggerResult(res)}
              className={`flex w-full flex-col rounded-lg p-3 text-left transition-colors ${i === index
                ? "bg-brand/10 text-brand dark:bg-blue-950/40 dark:text-blue-400"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-350"
                }`}
            >
              <span className="font-semibold text-sm">{res.title}</span>
              <span className="text-xs text-slate-500 dark:text-slate-550">{res.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
