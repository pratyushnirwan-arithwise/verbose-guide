import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./components/Login";
import ToolsPage from "./components/ToolsPage";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
// TEMPORARY OPTION 1 SELF-SIGNUP PAGE (Delete import & route below when done)
import SelfSignup from "./components/SelfSignup";

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
      {/* TEMPORARY EMPLOYEE SELF-REGISTRATION LINK */}
      <Route path="/join" element={<SelfSignup />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
