// ==============================================================================
// TEMPORARY SELF-REGISTRATION PAGE (OPTION 1)
// NOTE: You can delete this file and remove its route in App.jsx when done.
// ==============================================================================
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { postJson } from "../api";
import { Input, SectionTitle } from "./UIComponents";

export default function SelfSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", userEmail: "", userPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");

    if (!form.userEmail.toLowerCase().endsWith("@arithwise.com")) {
      return setMessage("Registration is strictly restricted to @arithwise.com employee emails.");
    }
    if (form.userPassword !== form.confirmPassword) {
      return setMessage("Passwords do not match.");
    }
    if (form.userPassword.length < 6) {
      return setMessage("Password must be at least 6 characters.");
    }

    setBusy(true);
    try {
      await postJson("/api/self_register", {
        firstName: form.firstName,
        lastName: form.lastName,
        userEmail: form.userEmail,
        userPassword: form.userPassword,
      });
      setSuccess(true);
    } catch (err) {
      setMessage(err.message || "Failed to create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dark min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-purple-500 selection:text-white">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-purple-500/30 mb-3">
            A
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Employee Onboarding</h1>
          <p className="text-sm text-slate-400 mt-1">
            Create your Arithwise account for instant access to <span className="text-teal-400 font-semibold">TRUEDAY</span>.
          </p>
        </div>

        {success ? (
          <div className="text-center py-6 animate-fade-in">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-white mb-2">Account Created!</h2>
            <p className="text-sm text-slate-300 mb-6">
              Your employee account has been set up with <span className="text-teal-400 font-semibold">TRUEDAY User Access</span>.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-200"
            >
              Sign In to Platform
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={form.firstName}
                onChange={(val) => setForm({ ...form, firstName: val })}
                required
              />
              <Input
                label="Last Name"
                value={form.lastName}
                onChange={(val) => setForm({ ...form, lastName: val })}
                required
              />
            </div>

            <Input
              label="Work Email (@arithwise.com)"
              type="email"
              value={form.userEmail}
              onChange={(val) => setForm({ ...form, userEmail: val })}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Password"
                type="password"
                value={form.userPassword}
                onChange={(val) => setForm({ ...form, userPassword: val })}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                value={form.confirmPassword}
                onChange={(val) => setForm({ ...form, confirmPassword: val })}
                required
              />
            </div>

            {message && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              <span>{busy ? "Creating Account..." : "Join Arithwise & TRUEDAY"}</span>
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
