import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Users, BarChart3, Wrench, UserPlus, KeyRound, ShieldCheck, Sun, Moon } from "lucide-react";
import { postJson, api } from "../api";
import Shell from "./Shell";
import { IconButton, TextButton, Modal, Rule } from "./UIComponents";
import DynamicIcon from "./DynamicIcon";
import LightPillar from "./reactbits/LightPillar";
import OrbitalSphere from "./OrbitalSphere";


const gridCells = [
  { row: 0, col: 0 }, { row: 0, col: 2 }, { row: 0, col: 1 }, { row: 0, col: 3 },
  { row: 1, col: 1 }, { row: 1, col: 3 }, { row: 1, col: 0 }, { row: 1, col: 2 },
  { row: 2, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 3 }, { row: 2, col: 1 },
  { row: 3, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 0 }
];

export default function Login() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "light" ? "dark" : "light"));

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState(() => ({
    email: localStorage.getItem("rememberedEmail") || "",
    password: localStorage.getItem("rememberedPassword") || "",
    remember: Boolean(localStorage.getItem("rememberedEmail")),
  }));
  const [reset, setReset] = useState({ step: "closed", email: "", code: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [otpVerifySuccess, setOtpVerifySuccess] = useState(false);
  const [greenCascadeIdx, setGreenCascadeIdx] = useState(-1);
  const [otpError, setOtpError] = useState(false);
  const [bgTools, setBgTools] = useState([]);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(0);

  const TAILWIND_COLOR_MAP = {
    blue: { 500: "#3b82f6", 600: "#2563eb" },
    indigo: { 500: "#6366f1", 600: "#4f46e5" },
    teal: { 500: "#14b8a6", 600: "#0d9488" },
    emerald: { 500: "#10b981", 600: "#059669" },
    violet: { 500: "#8b5cf6", 600: "#7c3aed" },
    purple: { 500: "#a855f7", 600: "#9333ea" },
    amber: { 500: "#f59e0b", 600: "#d97706" },
    orange: { 500: "#f97316", 600: "#ea580c" },
    rose: { 500: "#f43f5e", 600: "#e11d48" },
    red: { 500: "#ef4444", 600: "#dc2626" },
    sky: { 500: "#0ea5e9", 600: "#0284c7" },
    lime: { 500: "#84cc16", 600: "#65a30d" },
    cyan: { 500: "#06b6d4", 600: "#0891b2" },
    slate: { 500: "#64748b", 600: "#475569" },
    gray: { 500: "#9ca3af", 600: "#4b5563" },
    fuchsia: { 500: "#d946ef", 600: "#c084fc" },
    yellow: { 500: "#eab308", 600: "#ca8a04" }
  };

  function parseTailwindGradient(grad = "") {
    const fromMatch = grad.match(/from-([a-z]+)-(\d+)/i);
    const toMatch = grad.match(/to-([a-z]+)-(\d+)/i);

    const fromColorName = fromMatch ? fromMatch[1] : "slate";
    const fromWeight = fromMatch ? fromMatch[2] : "500";
    const toColorName = toMatch ? toMatch[1] : "slate";
    const toWeight = toMatch ? toMatch[2] : "600";

    const getHex = (name, weight) => {
      const pal = TAILWIND_COLOR_MAP[name] || TAILWIND_COLOR_MAP.slate;
      return pal[weight] || pal[500];
    };

    const c1 = getHex(fromColorName, fromWeight);
    const c2 = getHex(toColorName, toWeight);

    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return {
      from: c1,
      to: c2,
      bg: `linear-gradient(135deg, ${hexToRgba(c1, 0.08)}, ${hexToRgba(c2, 0.12)})`,
      hoverBg: `linear-gradient(135deg, ${hexToRgba(c1, 0.15)}, ${hexToRgba(c2, 0.22)})`,
      border: hexToRgba(c1, 0.3),
      hoverBorder: hexToRgba(c1, 0.55),
      accent: c1,
      dot: c1,
      glow: hexToRgba(c1, 0.35),
      glowBright: hexToRgba(c1, 0.25),
      iconBg: `linear-gradient(135deg, ${hexToRgba(c1, 0.18)}, ${hexToRgba(c2, 0.12)})`
    };
  }

  const finalNodes = bgTools.map((t) => ({
    name: t.name,
    logo_name: t.logo_name || "Globe",
    color_gradient: t.color_gradient || "",
    colors: parseTailwindGradient(t.color_gradient || ""),
  }));




  const otpRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  useEffect(() => {
    if (reset.step === "verify") {
      setTimeout(() => {
        otpRefs[0].current?.focus();
      }, 100);
    }
  }, [reset.step]);

  useEffect(() => {
    if (reset.code.length === 6 && reset.step === "verify" && !otpVerifySuccess && !otpError) {
      verifyCode(reset.code);
    }
  }, [reset.code, reset.step]);

  const handleOtpChange = (value, idx) => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      const currentCode = reset.code.split("");
      currentCode[idx] = "";
      setReset({ ...reset, code: currentCode.join("") });
      return;
    }
    const digit = cleaned[cleaned.length - 1];
    const currentCode = reset.code.split("").concat(Array(6).fill("")).slice(0, 6);
    currentCode[idx] = digit;
    const nextCode = currentCode.join("");
    setReset({ ...reset, code: nextCode });
    if (idx < 5 && digit) {
      otpRefs[idx + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (event, idx) => {
    if (event.key === "Backspace") {
      const currentCode = reset.code.split("");
      if (!currentCode[idx]) {
        if (idx > 0) {
          currentCode[idx - 1] = "";
          setReset({ ...reset, code: currentCode.join("") });
          otpRefs[idx - 1].current?.focus();
        }
      } else {
        currentCode[idx] = "";
        setReset({ ...reset, code: currentCode.join("") });
      }
      event.preventDefault();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      setReset({ ...reset, code: pastedData });
      const targetIdx = Math.min(pastedData.length, 5);
      otpRefs[targetIdx].current?.focus();
    }
  };

  useEffect(() => {
    api("/api/available-tools")
      .then((data) => {
        if (data.success && data.tools) {
          setBgTools(data.tools);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (bgTools.length === 0) return;
    const interval = setInterval(() => {
      setActiveHighlightIndex((prev) => (prev + 1) % bgTools.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [bgTools.length]);

  const emailValid = !form.email || form.email.endsWith("@arithwise.com");
  const passwordStrong =
    reset.password.length >= 6 &&
    reset.password.length <= 24 &&
    /[A-Z]/.test(reset.password) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(reset.password) &&
    reset.password === reset.confirm;

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setPasswordError(false);
    if (!emailValid) return setError("Email must be from @arithwise.com.");
    setBusy(true);
    try {
      if (mode === "register") {
        await postJson("/api/admin-login", { email: form.email, password: form.password });
        navigate("/signup");
        return;
      }

      await postJson("/api/login", { email: form.email, password: form.password });
      if (form.remember) {
        localStorage.setItem("rememberedEmail", form.email);
        localStorage.setItem("rememberedPassword", form.password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }
      navigate("/tools");
    } catch (err) {
      setPasswordError(false);
      setTimeout(() => {
        setPasswordError(true);
      }, 10);
    } finally {
      setBusy(false);
    }
  }

  async function sendResetCode() {
    setBusy(true);
    setError("");
    try {
      await postJson("/api/send_reset_password_email", { email: reset.email });
      localStorage.setItem("resetEmail", reset.email);
      setReset((value) => ({ ...value, code: "", step: "verify" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(overrideCode) {
    const codeToVerify = overrideCode || reset.code;
    if (codeToVerify.length !== 6) return;
    setBusy(true);
    setError("");
    setOtpError(false);
    try {
      await postJson("/api/verify_reset_code", { email: reset.email, code: codeToVerify });

      setOtpVerifySuccess(true);

      let current = 0;
      setGreenCascadeIdx(0);
      const interval = setInterval(() => {
        current += 1;
        if (current < 6) {
          setGreenCascadeIdx(current);
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setReset((value) => ({ ...value, step: "password" }));
            setOtpVerifySuccess(false);
            setGreenCascadeIdx(-1);
          }, 500);
        }
      }, 50);

    } catch (err) {
      setOtpError(true);
      setTimeout(() => {
        setReset((value) => ({ ...value, code: "" }));
        setOtpError(false);
        otpRefs[0].current?.focus();
      }, 600);
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setBusy(true);
    setError("");
    try {
      await postJson("/api/reset_password", { email: reset.email, password: reset.password });
      setReset({ step: "closed", email: "", code: "", password: "", confirm: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell compact>
      {/* Theme Toggle Button */}
      <div className="fixed top-4 right-4 z-50">
        <IconButton
          type="button"
          title="Toggle Theme"
          className="rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur border border-slate-200 dark:border-slate-800 shadow-md hover:scale-105 transition-all w-10 h-10 flex items-center justify-center"
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </IconButton>
      </div>

      {/* Full-height split layout */}
      <div className="login-split-layout">
        {/* LEFT: Dark branded panel */}
        <div className="login-left-panel">
          {/* LightPillar WebGL background */}
          <LightPillar
            topColor="#5227ff"
            bottomColor="#ff9ffc"
            intensity={1}
            rotationSpeed={0.3}
            glowAmount={0.002}
            pillarWidth={3}
            pillarHeight={0.4}
            noiseIntensity={0.5}
            pillarRotation={25}
            interactive={false}
            mixBlendMode="screen"
            quality="high"
          />
          {/* 3D OrbitalSphere — central sphere + tilted orbiting dots */}
          <OrbitalSphere />

          {/* Logo + Brand */}
          <div className="login-left-brand">
            <div className="login-logo-badge">A</div>
            <div>
              <div className="login-brand-name">Arithwise</div>
              <div className="login-brand-sub">ARITHS</div>
            </div>
          </div>

          {/* Center label */}
          <div className="login-center-label">
            <span className="login-center-a">A</span>
            <span className="login-center-text">PLATFORM</span>
          </div>

          {/* Tagline */}
          <div className="login-tagline">
            <p className="login-tagline-headline">Central access for tools, people &amp; dashboards.</p>
            <p className="login-tagline-body">One sign-in for every Arithwise workflow — roles, analytics, and platform ops.</p>
          </div>
        </div>

        {/* RIGHT: Login form panel */}
        <div className="login-right-panel">
          <form onSubmit={submitLogin} className="login-form-card">
            {/* Header */}
            <div className="login-form-header">
              <div>
                <h2 className="login-welcome">Welcome back</h2>
                <p className="login-subtitle">Sign in to your account to continue</p>
              </div>
            </div>

            {/* Pill tab toggle */}
            <div className="login-tab-toggle">
              {["login", "register"].map((item) => (
                <button
                  type="button"
                  key={item}
                  id={`tab-${item}`}
                  onClick={() => setMode(item)}
                  className={`login-tab-btn${mode === item ? " active" : ""}`}
                >
                  {item === "login" ? "Login" : "Register"}
                </button>
              ))}
            </div>

            {/* Email */}
            <label className="field-label" htmlFor="email">Email address</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="field"
                required
              />
            </div>
            {!emailValid && <p className="mt-2 text-sm text-red-500">Email must be @arithwise.com.</p>}

            {/* Password */}
            <label className="field-label mt-4" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => {
                  setForm({ ...form, password: event.target.value });
                  setPasswordError(false);
                }}
                className={`field pr-12 transition-all ${passwordError
                  ? "border-rose-500 bg-rose-50/10 focus:border-rose-500 animate-shake"
                  : ""
                  }`}
                required
              />
              <IconButton
                type="button"
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-1/2 -translate-y-1/2 border-0 shadow-none hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </IconButton>
            </div>

            {/* Remember me + Forgot */}
            {mode === "login" && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) => setForm({ ...form, remember: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand focus:ring-offset-0 cursor-pointer"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  onClick={() => setReset({ ...reset, step: "email", email: form.email })}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            {/* Sign in button */}
            <TextButton
              type="submit"
              disabled={busy}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-semibold py-3 rounded-lg transition-all"
            >
              {busy ? "Working..." : mode === "login" ? "Sign in" : "Add User"}
            </TextButton>

          </form>
        </div>
      </div>

      {reset.step !== "closed" && (
        <Modal title={reset.step === "email" ? "Reset Password" : reset.step === "verify" ? "Confirm Verification" : "Create New Password"} onClose={() => setReset({ step: "closed", email: "", code: "", password: "", confirm: "" })}>
          {reset.step === "email" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 mb-3 shadow-inner">
                  <KeyRound size={26} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Enter your email address below and we'll send you a 6-digit code to verify your identity.
                </p>
              </div>

              <div>
                <label className="field-label" htmlFor="reset-email">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <Mail size={18} />
                  </span>
                  <input
                    id="reset-email"
                    className="field pl-10"
                    type="email"
                    value={reset.email}
                    onChange={(event) => setReset({ ...reset, email: event.target.value })}
                    required
                  />
                </div>
              </div>

              <TextButton
                type="button"
                onClick={sendResetCode}
                disabled={busy || !reset.email}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-brand hover:bg-blue-700 text-white shadow-sm transition"
              >
                {busy ? "Sending Code..." : "Send Verification Code"}
              </TextButton>
            </div>
          )}
          {reset.step === "verify" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mb-3 shadow-inner">
                  <Mail size={26} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  We've sent a 6-digit confirmation code to <span className="font-semibold text-slate-800 dark:text-slate-200">{reset.email}</span>.
                </p>
              </div>

              <div className="space-y-3">
                <label className="field-label text-center block" htmlFor="verify-code">Verification Code</label>
                <div className="flex justify-between gap-2.5 py-1">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const val = reset.code[idx] || "";
                    const isGreen = otpVerifySuccess && idx <= greenCascadeIdx;
                    const isRed = otpError;

                    return (
                      <input
                        key={idx}
                        ref={otpRefs[idx]}
                        type="text"
                        maxLength={1}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={val}
                        disabled={busy || otpVerifySuccess}
                        onChange={(e) => handleOtpChange(e.target.value, idx)}
                        onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                        onPaste={handleOtpPaste}
                        className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all duration-150 outline-none ${isGreen
                          ? "border-emerald-500 bg-emerald-50/20 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450 ring-4 ring-emerald-100 dark:ring-emerald-950/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                          : isRed
                            ? "border-rose-500 bg-rose-55 text-rose-600 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-450 animate-shake"
                            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-brand focus:ring-4 focus:ring-blue-100 dark:focus:border-blue-500 dark:focus:ring-blue-950/50"
                          }`}
                      />
                    );
                  })}
                </div>
              </div>

              <TextButton
                type="button"
                onClick={verifyCode}
                disabled={busy || reset.code.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-brand hover:bg-blue-700 text-white shadow-sm transition"
              >
                {busy ? "Checking..." : "Verify Code"}
              </TextButton>
            </div>
          )}
          {reset.step === "password" && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-3 shadow-inner">
                  <ShieldCheck size={26} />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                  Your identity has been verified. Choose a strong new password.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="new-password">New Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                      <Lock size={18} />
                    </span>
                    <input
                      id="new-password"
                      className="field pl-10"
                      type="password"
                      value={reset.password}
                      onChange={(event) => setReset({ ...reset, password: event.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="confirm-password">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                      <Lock size={18} />
                    </span>
                    <input
                      id="confirm-password"
                      className="field pl-10"
                      type="password"
                      value={reset.confirm}
                      onChange={(event) => setReset({ ...reset, confirm: event.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/40 space-y-2">
                <div className="grid gap-2 text-sm text-slate-650 dark:text-slate-400">
                  <Rule ok={reset.password.length >= 6 && reset.password.length <= 24}>Between 6-24 characters</Rule>
                  <Rule ok={/[A-Z]/.test(reset.password)}>At least one uppercase letter</Rule>
                  <Rule ok={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(reset.password)}>At least one special character</Rule>
                  <Rule ok={reset.password && reset.password === reset.confirm}>Passwords match</Rule>
                </div>
              </div>

              <TextButton
                type="button"
                onClick={savePassword}
                disabled={busy || !passwordStrong}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-brand hover:bg-blue-700 text-white shadow-sm transition"
              >
                {busy ? "Saving..." : "Reset Password"}
              </TextButton>
            </div>
          )}
        </Modal>
      )}
    </Shell>
  );
}
