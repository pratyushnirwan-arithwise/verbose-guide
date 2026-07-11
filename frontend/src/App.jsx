import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import ToolsPage from "./components/ToolsPage";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";

export default function App() {
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "light";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
