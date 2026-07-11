import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Shield, Wrench, Plus, Trash2, Check } from "lucide-react";
import { api, postJson } from "../api";
import Shell from "./Shell";
import Header from "./Header";
import CustomSelect from "./CustomSelect";
import { IconButton, TextButton, Input, SectionTitle } from "./UIComponents";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", userEmail: "", userPassword: "" });
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [availableTools, setAvailableTools] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    api("/api/available-tools")
      .then((data) => setAvailableTools(data.tools || []))
      .catch((err) => setMessage(err.message));
  }, []);

  function addTool() {
    if (!selectedTool || tools.some((tool) => tool.tool_name === selectedTool)) return;
    setTools([...tools, { tool_name: selectedTool, access_type: "User" }]);
    setSelectedTool("");
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    if (!form.userEmail.endsWith("@arithwise.com")) return setMessage("Email must be from @arithwise.com.");
    setBusy(true);
    try {
      const data = await postJson("/api/create_user", { ...form, tools });
      setToast(`User created: ${data.user.fullName} (ID ${data.user_id})`);
      setForm({ firstName: "", lastName: "", userEmail: "", userPassword: "" });
      setTools([]);
      setTimeout(() => {
        setToast("");
      }, 5000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell compact>
      <Header
        title="Create User"
        subtitle="Add a user and assign tool licenses."
        actions={<Link className="nav-button" to="/tools">Tools</Link>}
      />
      <form onSubmit={submit} className="rounded-lg border border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/90 p-5 shadow-soft transition-colors duration-300">
        <SectionTitle icon={<UserPlus size={20} />} title="Personal Information" />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="First Name" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} required />
          <Input label="Last Name" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} required />
        </div>

        <SectionTitle icon={<Shield size={20} />} title="Account Information" />
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Email Address" type="email" value={form.userEmail} onChange={(value) => setForm({ ...form, userEmail: value })} required />
          <Input label="Password" type="password" value={form.userPassword} onChange={(value) => setForm({ ...form, userPassword: value })} required />
        </div>

        <SectionTitle icon={<Wrench size={20} />} title="Tools Licenses" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <CustomSelect
            value={selectedTool}
            onChange={setSelectedTool}
            placeholder="Select tool"
            options={[
              { value: "", label: "Select tool" },
              ...availableTools.map((tool) => ({ value: tool.name, label: tool.name }))
            ]}
            className="flex-1 min-w-[200px]"
          />
          <TextButton type="button" onClick={addTool}><Plus size={18} /> Add</TextButton>
        </div>

        <div className="mt-4 grid gap-3">
          {tools.map((tool) => (
            <div key={tool.tool_name} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-3 sm:flex-row sm:items-center sm:justify-between transition-colors duration-300">
              <strong className="text-slate-900 dark:text-white">{tool.tool_name}</strong>
              <div className="flex flex-wrap items-center gap-3">
                {["User", "Developer", "Admin", "Superuser"].map((role) => (
                  <label key={role} className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <input
                      type="radio"
                      name={`role-${tool.tool_name}`}
                      checked={tool.access_type === role}
                      onChange={() => setTools(tools.map((item) => item.tool_name === tool.tool_name ? { ...item, access_type: role } : item))}
                    />
                    {role}
                  </label>
                ))}
                <IconButton title="Remove tool" onClick={() => setTools(tools.filter((item) => item.tool_name !== tool.tool_name))}><Trash2 size={16} /></IconButton>
              </div>
            </div>
          ))}
        </div>

        {message && <div className="mt-4 rounded-md border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{message}</div>}
        <TextButton type="submit" disabled={busy || tools.length === 0} className="mt-6"><UserPlus size={18} /> {busy ? "Creating..." : "Create User"}</TextButton>
      </form>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-teal-200 bg-white p-4 shadow-xl animate-fade-in-up">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <Check size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{toast}</p>
          </div>
          <button onClick={() => setToast("")} className="ml-2 text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}
    </Shell>
  );
}
