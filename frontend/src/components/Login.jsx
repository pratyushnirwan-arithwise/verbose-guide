import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Users, BarChart3, Wrench, UserPlus, KeyRound, ShieldCheck } from "lucide-react";
import { postJson, api } from "../api";
import Shell from "./Shell";
import { IconButton, TextButton, Modal, Rule } from "./UIComponents";

const gridCells = [
  { row: 0, col: 0 }, { row: 0, col: 2 }, { row: 0, col: 1 }, { row: 0, col: 3 },
  { row: 1, col: 1 }, { row: 1, col: 3 }, { row: 1, col: 0 }, { row: 1, col: 2 },
  { row: 2, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 3 }, { row: 2, col: 1 },
  { row: 3, col: 3 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 0 }
];

export default function Login() {
  const navigate = useNavigate();
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
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
        {/* Dot pattern top-left */}
        <svg className="absolute left-10 top-10 text-slate-300 dark:text-slate-700 opacity-20 hidden lg:block" width="120" height="80" fill="currentColor">
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.5" />
            </pattern>
          </defs>
          <rect width="120" height="80" fill="url(#dot-grid)" />
        </svg>

        {/* Dot pattern bottom-right */}
        <svg className="absolute right-10 bottom-10 text-slate-300 dark:text-slate-700 opacity-20 hidden lg:block" width="120" height="80" fill="currentColor">
          <defs>
            <pattern id="dot-grid-2" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.5" />
            </pattern>
          </defs>
          <rect width="120" height="80" fill="url(#dot-grid-2)" />
        </svg>

        {/* Floating diagonal tool names from DB */}
        {bgTools.map((tool, idx) => {
          const cell = gridCells[idx % gridCells.length];
          const col = cell.col;
          const row = cell.row;

          const left = col * 25 + 5 + (idx * 3) % 15;
          const top = row * 25 + 5 + (idx * 7) % 15;
          const size = 15 + (idx * 3) % 10; // 15px to 25px
          const opacity = 0.05 + (idx * 0.01) % 0.04; // 0.05 to 0.09

          return (
            <span
              key={tool.tool_id}
              className={`absolute font-semibold tracking-widest uppercase bg-gradient-to-r ${tool.color_gradient || "from-slate-500 to-slate-650"} bg-clip-text text-transparent`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                fontSize: `${size}px`,
                opacity: opacity,
                transform: "rotate(-15deg)",
                whiteSpace: "nowrap"
              }}
            >
              {tool.name}
            </span>
          );
        })}
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-3rem)] items-center justify-center py-6">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_450px] items-stretch max-w-4xl">
          {/* Left Side: Branding and Features */}
          <div className="hidden lg:flex flex-col justify-between py-2">
            <div className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="inline-block bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-4 shadow-soft">
                  <img src="/Logo_PNG_1.png" alt="Arithwise" className="h-16 w-16 object-contain" />
                </div>
                <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">ARITHS</h1>
              </div>
              <div>
                <p className="max-w-md text-base leading-6 text-slate-500 dark:text-slate-400">
                  Central access for Arithwise tools, people, roles, and platform dashboards.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Login Card */}
          <form onSubmit={submitLogin} className="rounded-2xl border border-white/70 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/90 p-8 shadow-soft backdrop-blur transition-colors duration-300">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sign in to your account to continue</p>
              </div>
              <div className="flex gap-4 pt-1">
                {["login", "register"].map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setMode(item)}
                    className={`pb-1 text-sm font-semibold capitalize relative transition-all ${mode === item
                      ? "text-brand dark:text-blue-400 font-semibold"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                  >
                    {item}
                    {mode === item && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand dark:bg-blue-500 rounded-full animate-fade-in" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <label className="field-label" htmlFor="email">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <Mail size={18} />
              </span>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="field pl-10"
                placeholder="name@arithwise.com"
                required
              />
            </div>
            {!emailValid && <p className="mt-2 text-sm text-red-650">Email must be @arithwise.com.</p>}

            <label className="field-label mt-4" htmlFor="password">Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <Lock size={18} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => {
                  setForm({ ...form, password: event.target.value });
                  setPasswordError(false);
                }}
                className={`field pl-10 pr-12 transition-all ${passwordError
                  ? "border-rose-500 bg-rose-50/10 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 animate-shake"
                  : ""
                  }`}
                placeholder="Enter your password"
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

            {mode === "login" && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) => setForm({ ...form, remember: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-800 dark:bg-slate-950 text-brand focus:ring-brand focus:ring-offset-0 cursor-pointer"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-brand dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  onClick={() => setReset({ ...reset, step: "email", email: form.email })}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

            <TextButton type="submit" disabled={busy} className="mt-6 w-full flex items-center justify-center gap-2 bg-brand hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg">
              {mode === "login" ? <Lock size={18} /> : <UserPlus size={18} />}
              {busy ? "Working..." : mode === "login" ? "Sign In" : "Add User"}
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
                    placeholder="name@arithwise.com"
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
                      placeholder="Enter new password"
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
                      placeholder="Confirm new password"
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
