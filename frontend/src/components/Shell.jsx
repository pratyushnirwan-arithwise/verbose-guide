import { useEffect, useState } from "react";
import UniversalSearchModal from "./UniversalSearchModal";

export default function Shell({ children, compact = false }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 text-ink dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_30%),linear-gradient(135deg,rgba(15,118,110,0.10),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_30%)]" />
      <div className={`relative mx-auto w-full ${compact ? "max-w-5xl" : "max-w-7xl"} px-4 py-6 sm:px-6 lg:px-8`}>
        {children}
      </div>
      <UniversalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </main>
  );
}
