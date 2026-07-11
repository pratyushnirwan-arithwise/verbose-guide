import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, Moon, Sun, LogOut, ArrowRight } from "lucide-react";
import { api } from "../api";
import Shell from "./Shell";
import Header from "./Header";
import { IconButton, TextButton, Loading } from "./UIComponents";
import DynamicIcon from "./DynamicIcon";

export default function ToolsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, tools: [], user_id: null, superadmin: false });
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [health, setHealth] = useState({});

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  useEffect(() => {
    api("/api/tools")
      .then((data) => setState({ loading: false, ...data }))
      .catch(() => navigate("/"));
  }, [navigate]);

  useEffect(() => {
    api("/api/tools/health")
      .then((data) => {
        if (data.success) {
          setHealth(data.health);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  async function logout() {
    await api("/api/logout");
    navigate("/");
  }

  const getHref = (template, userId, accessType) => {
    if (!template) return "";
    return template
      .replace("{userId}", userId)
      .replace("{accessType}", accessType);
  };

  if (state.loading) return <Loading />;

  return (
    <Shell>
      <Header
        title="Welcome to Arithwise"
        subtitle="Explore our cutting-edge tech solutions designed to innovate and transform."
        actions={
          <>
            {state.superadmin && (
              <Link className="nav-button" to="/dashboard">
                <Globe size={18} /> Dashboard
              </Link>
            )}
            <IconButton title="Toggle Theme" className="rounded-full" onClick={toggleTheme}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </IconButton>
            <button className="nav-button" onClick={logout}>
              <LogOut size={18} /> Logout
            </button>
          </>
        }
      />
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {state.tools.map((tool) => {
          const status = health[tool.tool_name] || "checking";
          return (
            <article key={tool.tool_name} className="relative overflow-hidden rounded-lg border border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/90 shadow-soft flex flex-col justify-between transition-colors duration-300">
              <div>
                <div className="absolute top-3 right-3 z-10">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status === "online"
                    ? "bg-emerald-100/95 text-emerald-800 dark:bg-emerald-950/95 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50"
                    : status === "offline"
                      ? "bg-rose-100/95 text-rose-800 dark:bg-rose-950/95 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50"
                      : "bg-slate-100/95 text-slate-650 dark:bg-slate-800/95 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"
                    } backdrop-blur-sm shadow-sm`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status === "online"
                      ? "bg-emerald-500 animate-pulse"
                      : status === "offline"
                        ? "bg-rose-500"
                        : "bg-slate-400"
                      }`} />
                    {status === "online" ? "Online" : status === "offline" ? "Offline" : "Checking"}
                  </span>
                </div>
                <div className={`bg-gradient-to-r ${tool.color_gradient || "from-slate-500 to-slate-600"} p-6 flex justify-center items-center`}>
                  <DynamicIcon name={tool.logo_name} className="text-white" size={32} />
                </div>
                <div className="p-5">
                  <div className="mb-3">
                    <h2 className="text-xl font-semibold leading-none text-slate-950 dark:text-white">{tool.tool_name}</h2>
                  </div>
                  <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {tool.description || "Tool details are not available yet."}
                  </p>
                </div>
              </div>
              <div className="p-5 pt-0 flex items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-350 border border-slate-300/80 dark:border-slate-700/80">
                  {tool.access_type}
                </span>
                <TextButton
                  type="button"
                  className={`w-auto bg-gradient-to-r ${tool.color_gradient || "from-slate-500 to-slate-600"} hover:brightness-95`}
                  onClick={() => {
                    const href = getHref(tool.href, state.user_id, tool.access_type);
                    if (href) window.open(href, "_blank", "noreferrer");
                  }}
                >
                  Get Started <ArrowRight size={18} />
                </TextButton>
              </div>
            </article>
          );
        })}
      </section>
    </Shell>
  );
}
