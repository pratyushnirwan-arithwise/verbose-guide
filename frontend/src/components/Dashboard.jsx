import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  UserPlus,
  Globe,
  Search,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Info,
  Save,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { api, postJson } from "../api";
import Shell from "./Shell";
import Header from "./Header";
import CustomSelect from "./CustomSelect";
import { IconButton, TextButton, Input, Loading } from "./UIComponents";
import DynamicIcon from "./DynamicIcon";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState({ names: [], tools: [] });
  const [details, setDetails] = useState({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");

  const [activeTab, setActiveTab] = useState("employees");
  const [availableTools, setAvailableTools] = useState([]);
  const [toolFilter, setToolFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showToolModal, setShowToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [toolForm, setToolForm] = useState({ name: "", description: "", href: "", logo_name: "Globe", color_gradient: "from-blue-500 to-indigo-600" });

  const [bulkTool, setBulkTool] = useState("");
  const [bulkAction, setBulkAction] = useState("grant");
  const [bulkRole, setBulkRole] = useState("User");
  const [bulkMessage, setBulkMessage] = useState("");

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  useEffect(() => {
    Promise.all([
      api("/api/dashboard"),
      api("/api/employees"),
      api("/api/employees/details"),
      api("/api/available-tools")
    ])
      .then(([dashboardData, employeesData, detailsData, toolsData]) => {
        setStats(dashboardData.stats);
        setEmployees(employeesData);
        setDetails(detailsData);
        if (toolsData.success) {
          setAvailableTools(toolsData.tools || []);
        }
      })
      .catch(() => navigate("/tools"));
  }, [navigate]);

  useEffect(() => {
    const employeeParam = searchParams.get("employee");
    if (employeeParam) {
      setSelected(employeeParam);
      setShowEmployeeModal(true);
      setIsSelectMode(false);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const suggestions = employees.names.filter((name) => name.toLowerCase().includes(search.toLowerCase())).slice(0, 6);
  const selectedAccess = details[selected.toLowerCase()] || {};

  const filteredEmployees = useMemo(() => {
    if (!employees || !employees.names) return [];
    return employees.names.filter((name) => {
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
      const employeeDetails = details[name.toLowerCase()] || {};
      const userTools = Object.keys(employeeDetails);

      let matchesTool = true;
      if (toolFilter) {
        matchesTool = userTools.includes(toolFilter);
      }

      let matchesRole = true;
      if (roleFilter) {
        matchesRole = Object.values(employeeDetails).includes(roleFilter);
      }

      return matchesSearch && matchesTool && matchesRole;
    });
  }, [employees, search, details, toolFilter, roleFilter]);

  const allFilteredSelected = useMemo(() => {
    if (filteredEmployees.length === 0) return false;
    return filteredEmployees.every(name => selectedEmployees.includes(name));
  }, [filteredEmployees, selectedEmployees]);

  const handleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedEmployees(selectedEmployees.filter(name => !filteredEmployees.includes(name)));
    } else {
      const nextSelected = [...selectedEmployees];
      filteredEmployees.forEach(name => {
        if (!nextSelected.includes(name)) nextSelected.push(name);
      });
      setSelectedEmployees(nextSelected);
    }
  };

  const toggleEmployeeSelect = (name) => {
    if (selectedEmployees.includes(name)) {
      setSelectedEmployees(selectedEmployees.filter(item => item !== name));
    } else {
      setSelectedEmployees([...selectedEmployees, name]);
    }
  };

  async function handleBulkUpdate() {
    if (!bulkTool) {
      setBulkMessage("Please select a tool.");
      return;
    }
    setBulkMessage("");
    try {
      const data = await postJson("/api/admin/bulk_update_access", {
        employees: selectedEmployees,
        tool: bulkTool,
        action: bulkAction,
        access_type: bulkRole
      });
      if (data.success) {
        setSelectedEmployees([]);
        setBulkMessage("Bulk update applied successfully!");
        const [dashboardData, employeesData, detailsData] = await Promise.all([
          api("/api/dashboard"),
          api("/api/employees"),
          api("/api/employees/details")
        ]);
        setStats(dashboardData.stats);
        setEmployees(employeesData);
        setDetails(detailsData);
      } else {
        setBulkMessage(data.error || "Error applying bulk update.");
      }
    } catch (err) {
      setBulkMessage(err.message);
    }
  }

  async function updateAccess(toolName, accessType) {
    const key = selected.toLowerCase();
    if (accessType === "") {
      const nextAccess = { ...selectedAccess };
      delete nextAccess[toolName];
      setDetails({ ...details, [key]: nextAccess });
      try {
        await postJson("/api/delete_access", { employee: selected, tool: toolName });
        setMessage("Access removed.");
      } catch (err) {
        setMessage(err.message);
      }
      return;
    }

    setDetails({ ...details, [key]: { ...selectedAccess, [toolName]: accessType } });
  }

  async function saveAccess() {
    setMessage("");
    try {
      await postJson("/api/save_access", { [selected]: selectedAccess });
      setMessage("Access saved.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function handleToolSubmit(e) {
    e.preventDefault();
    try {
      let res;
      if (editingTool) {
        res = await postJson("/api/admin/tools/update", {
          tool_id: editingTool.tool_id,
          ...toolForm
        });
      } else {
        res = await postJson("/api/admin/tools/create", toolForm);
      }
      if (res.success) {
        setShowToolModal(false);
        setEditingTool(null);
        const [toolsData, dashboardData, employeesData, detailsData] = await Promise.all([
          api("/api/available-tools"),
          api("/api/dashboard"),
          api("/api/employees"),
          api("/api/employees/details")
        ]);
        if (toolsData.success) setAvailableTools(toolsData.tools || []);
        setStats(dashboardData.stats);
        setEmployees(employeesData);
        setDetails(detailsData);
      } else {
        alert(res.message || "Failed to save tool.");
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteTool(toolId) {
    if (!window.confirm("Are you sure you want to delete this tool? All employee accesses to this tool will also be deleted.")) return;
    try {
      const res = await postJson("/api/admin/tools/delete", { tool_id: toolId });
      if (res.success) {
        const [toolsData, dashboardData, employeesData, detailsData] = await Promise.all([
          api("/api/available-tools"),
          api("/api/dashboard"),
          api("/api/employees"),
          api("/api/employees/details")
        ]);
        if (toolsData.success) setAvailableTools(toolsData.tools || []);
        setStats(dashboardData.stats);
        setEmployees(employeesData);
        setDetails(detailsData);
      } else {
        alert(res.message || "Failed to delete tool.");
      }
    } catch (err) {
      alert(err.message);
    }
  }

  if (!stats) return <Loading />;

  return (
    <Shell>
      <Header
        title="Dashboard"
        subtitle="Manage employees, tools, and access levels."
        actions={
          <div className="flex gap-2">
            <Link className="nav-button" to="/signup">
              <UserPlus size={18} /> Create User
            </Link>
            <Link className="nav-button" to="/tools">
              <Globe size={18} /> Tools
            </Link>
          </div>
        }
      />

      {/* Tabs Layout */}
      <div className="mt-6 flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => { setActiveTab("employees"); setSelected(""); }}
          className={`pb-2 text-sm font-semibold transition-all ${activeTab === "employees"
            ? "border-b-2 border-brand text-brand dark:text-blue-500"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
        >
          Employees Access
        </button>
        <button
          onClick={() => { setActiveTab("tools"); setSelected(""); }}
          className={`pb-2 text-sm font-semibold transition-all ${activeTab === "tools"
            ? "border-b-2 border-brand text-brand dark:text-blue-500"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
            }`}
        >
          Tools Registry
        </button>
      </div>

      <section className="mt-4">
        <div className="rounded-lg border border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/90 p-5 shadow-soft transition-colors duration-300">
          {activeTab === "employees" ? (
            <>
              {/* Filter Controls Row */}
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 text-slate-400 dark:text-slate-555" size={18} />
                  <input className="field pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee..." />
                  {search && suggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-soft">
                      {suggestions.map((name) => (
                        <button
                          key={name}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-200"
                          onClick={() => {
                            setSelected(name);
                            setShowEmployeeModal(true);
                            setSearch("");
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <CustomSelect
                    value={toolFilter}
                    onChange={setToolFilter}
                    placeholder="Filter by Tool (All)"
                    options={[
                      { value: "", label: "Filter by Tool (All)" },
                      ...availableTools.map(tool => ({ value: tool.name, label: tool.name }))
                    ]}
                  />
                </div>
                <div>
                  <CustomSelect
                    value={roleFilter}
                    onChange={setRoleFilter}
                    placeholder="Filter by Role (All)"
                    options={[
                      { value: "", label: "Filter by Role (All)" },
                      { value: "User", label: "User" },
                      { value: "Developer", label: "Developer" },
                      { value: "Admin", label: "Admin" },
                      { value: "Superuser", label: "Superuser" }
                    ]}
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Employees ({filteredEmployees.length} shown)
                  </h3>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectMode(!isSelectMode);
                        setSelectedEmployees([]);
                      }}
                      className={`text-xs px-3 py-1 rounded-md font-semibold border transition-all ${isSelectMode
                        ? "bg-brand text-white border-brand hover:bg-blue-700"
                        : "bg-white text-slate-700 border-slate-200 hover:border-brand dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                        }`}
                    >
                      {isSelectMode ? "Exit Select Mode" : "Select Multiple"}
                    </button>
                    {isSelectMode && (
                      <button
                        onClick={handleSelectAll}
                        className="text-xs text-brand dark:text-blue-400 font-semibold hover:underline"
                      >
                        {allFilteredSelected ? "Deselect All" : "Select All Filtered"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2">
                  {filteredEmployees.map((name) => {
                    const initials = name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const employeeDetails = details[name.toLowerCase()] || {};
                    const userTools = Object.keys(employeeDetails);
                    const isSelectedEmployee = selectedEmployees.includes(name);

                    return (
                      <div
                        key={name}
                        onClick={() => {
                          if (!isSelectMode) {
                            setSelected(name);
                            setShowEmployeeModal(true);
                          }
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all duration-200 ${!isSelectMode ? "cursor-pointer hover:border-brand/35 hover:bg-blue-50/10 dark:hover:border-blue-900/35 dark:hover:bg-blue-950/5" : ""
                          } ${isSelectedEmployee
                            ? "border-brand/40 bg-blue-50/30 dark:border-blue-900/40 dark:bg-blue-950/10"
                            : "border-slate-100 bg-slate-50/50 dark:border-slate-800/50 dark:bg-slate-950/30"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelectMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEmployeeSelect(name);
                              }}
                              className="text-slate-400 hover:text-brand dark:text-slate-555 dark:hover:text-blue-400 transition-colors"
                            >
                              {isSelectedEmployee ? <CheckSquare size={20} className="text-brand dark:text-blue-500" /> : <Square size={20} />}
                            </button>
                          )}
                          <div className="flex items-center gap-3 text-left">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-brand dark:bg-blue-950 dark:text-blue-400">
                              {initials}
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {userTools.map((tool) => {
                            const role = employeeDetails[tool];
                            const matchedTool = availableTools.find((t) => t.name === tool);
                            const pillColor = matchedTool?.color_gradient || "from-slate-500 to-slate-600";
                            return (
                              <div
                                key={tool}
                                className="inline-flex items-center overflow-hidden rounded-full border border-slate-200/80 dark:border-slate-850/80 shadow-sm"
                              >
                                <span className={`bg-gradient-to-r ${pillColor} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white`}>
                                  {tool}
                                </span>
                                <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800">
                                  {role}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bulk Actions Panel */}
                {isSelectMode && selectedEmployees.length > 0 && (
                  <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20 animate-fade-in">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <SlidersHorizontal size={16} /> Bulk Access Updates ({selectedEmployees.length} selected)
                    </h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <CustomSelect
                        value={bulkTool}
                        onChange={setBulkTool}
                        placeholder="Select Tool"
                        options={[
                          { value: "", label: "Select Tool" },
                          ...availableTools.map(t => ({ value: t.name, label: t.name }))
                        ]}
                        className="w-48"
                      />
                      <CustomSelect
                        value={bulkAction}
                        onChange={setBulkAction}
                        placeholder="Select Action"
                        options={[
                          { value: "grant", label: "Grant Access" },
                          { value: "revoke", label: "Revoke Access" }
                        ]}
                        className="w-48"
                      />
                      {bulkAction === "grant" && (
                        <CustomSelect
                          value={bulkRole}
                          onChange={setBulkRole}
                          placeholder="Select Role"
                          options={[
                            { value: "User", label: "User" },
                            { value: "Developer", label: "Developer" },
                            { value: "Admin", label: "Admin" },
                            { value: "Superuser", label: "Superuser" }
                          ]}
                          className="w-48"
                        />
                      )}
                      <TextButton type="button" onClick={handleBulkUpdate}>Apply Changes</TextButton>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployees([])}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-350 ml-2"
                      >
                        Cancel
                      </button>
                    </div>
                    {bulkMessage && <p className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-400">{bulkMessage}</p>}
                  </div>
                )}
              </div>

              {/* Single Employee Access Editor Modal */}
              {showEmployeeModal && selected && (() => {
                const initials = selected
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                
                return (
                  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-6 animate-scale-in">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-brand dark:bg-blue-950 dark:text-blue-400">
                            {initials}
                          </div>
                          <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none mb-1">{selected}</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Manage application access and privileges</p>
                          </div>
                        </div>
                        <button
                          title="Close"
                          onClick={() => {
                            setSelected("");
                            setShowEmployeeModal(false);
                            setMessage("");
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-355 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400">
                            <tr>
                              <th className="px-4 py-3 font-semibold rounded-tl-xl">Tool</th>
                              <th className="px-4 py-3 font-semibold rounded-tr-xl">
                                <div className="flex items-center gap-1">
                                  Access Level
                                  <div className="relative group inline-block ml-1 align-middle">
                                    <Info size={14} className="text-slate-400 dark:text-slate-500 cursor-help hover:text-slate-600 dark:hover:text-slate-355 transition-colors" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-900 text-white text-[11px] p-3 rounded-lg shadow-xl border border-slate-700/50 z-50 transition-all duration-200">
                                      <div className="space-y-1.5 leading-normal">
                                        <p><strong>User:</strong> Read-only/Standard privileges for regular day-to-day operations.</p>
                                        <p><strong>Developer:</strong> Write code, debug, manage environments.</p>
                                        <p><strong>Admin:</strong> Create/update items, manage normal team settings, configure dashboards.</p>
                                        <p><strong>Superuser:</strong> Full administrator access, manage billing, change security credentials, delete resources.</p>
                                      </div>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-4 border-transparent border-t-slate-900" />
                                    </div>
                                  </div>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {employees.tools.map((tool, idx) => {
                              const matchedTool = availableTools.find((t) => t.name === tool);
                              const pillColor = matchedTool?.color_gradient || "from-slate-500 to-slate-650";
                              const isLastRow = idx === employees.tools.length - 1;
                              
                              return (
                                <tr key={tool} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                                  <td className={`px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 ${isLastRow ? "rounded-bl-xl" : ""}`}>
                                    <div className="flex items-center gap-2.5">
                                      <span className={`inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r ${pillColor} shadow-sm`}></span>
                                      <span>{tool}</span>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3 ${isLastRow ? "rounded-br-xl" : ""}`}>
                                    <CustomSelect
                                      value={selectedAccess[tool] || ""}
                                      onChange={(val) => updateAccess(tool, val)}
                                      placeholder="No Access"
                                      options={[
                                        { value: "", label: "No Access" },
                                        { value: "User", label: "User" },
                                        { value: "Developer", label: "Developer" },
                                        { value: "Admin", label: "Admin" },
                                        { value: "Superuser", label: "Superuser" }
                                      ]}
                                      className="w-40"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex justify-end items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                        {message && (
                          <p className="mr-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 animate-fade-in">
                            {message}
                          </p>
                        )}
                        <button
                          type="button"
                          className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-850 transition-colors"
                          onClick={() => {
                            setSelected("");
                            setShowEmployeeModal(false);
                            setMessage("");
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveAccess}
                          className="bg-brand hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg shadow-sm transition-colors text-sm"
                        >
                          <Save size={18} /> Save Access
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            /* Tools Registry Manager */
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Dynamic Tool Registry ({availableTools.length} tools)
                </h3>
                <TextButton
                  type="button"
                  onClick={() => {
                    setEditingTool(null);
                    setToolForm({ name: "", description: "", href: "", logo_name: "Globe", color_gradient: "from-blue-500 to-indigo-600" });
                    setShowToolModal(true);
                  }}
                >
                  <Plus size={18} /> Add Tool
                </TextButton>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Logo</th>
                      <th className="px-3 py-2">Tool Name</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Redirect URL Template</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableTools.map((tool) => (
                      <tr key={tool.tool_id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r ${tool.color_gradient} text-white`}>
                            <DynamicIcon name={tool.logo_name} size={16} />
                          </div>
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{tool.name}</td>
                        <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{tool.description}</td>
                        <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 max-w-[220px] truncate">{tool.href}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingTool(tool);
                                setToolForm({
                                  name: tool.name,
                                  description: tool.description,
                                  href: tool.href,
                                  logo_name: tool.logo_name,
                                  color_gradient: tool.color_gradient
                                });
                                setShowToolModal(true);
                              }}
                              className="text-xs font-semibold text-brand dark:text-blue-400 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTool(tool.tool_id)}
                              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tool Add/Edit Modal */}
              {showToolModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 animate-fade-in">
                    <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">
                      {editingTool ? `Edit Tool: ${editingTool.name}` : "Create New Tool Registration"}
                    </h3>
                    <form onSubmit={handleToolSubmit} className="space-y-4">
                      <Input label="Tool Name (e.g. BUGSBEE)" value={toolForm.name} onChange={(val) => setToolForm({ ...toolForm, name: val.toUpperCase() })} required />
                      <div>
                        <label className="field-label">Description</label>
                        <textarea className="field" rows={2} value={toolForm.description} onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })} required />
                      </div>
                      <Input label="Redirect URL Template" value={toolForm.href} onChange={(val) => setToolForm({ ...toolForm, href: val })} placeholder="http://localhost:5174?sessionid={userId}&access_type={accessType}" required />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="field-label">Logo Icon</label>
                          <CustomSelect
                            value={toolForm.logo_name}
                            onChange={(val) => setToolForm({ ...toolForm, logo_name: val })}
                            placeholder="Globe (Default)"
                            options={[
                              { value: "Globe", label: "Globe (Default)" },
                              { value: "Users", label: "Users (HRMS)" },
                              { value: "ListTodo", label: "ListTodo (Workflow)" },
                              { value: "Bug", label: "Bug (Testing)" },
                              { value: "Shield", label: "Shield (Security)" },
                              { value: "Activity", label: "Activity (Analytics)" },
                              { value: "Settings", label: "Settings (Config)" },
                              { value: "Wrench", label: "Wrench (Tools)" }
                            ]}
                          />
                        </div>
                        <div>
                          <label className="field-label">Color Gradient Theme</label>
                          <CustomSelect
                            value={toolForm.color_gradient}
                            onChange={(val) => setToolForm({ ...toolForm, color_gradient: val })}
                            placeholder="Blue-Indigo Gradient"
                            options={[
                              { value: "from-blue-500 to-indigo-600", label: "Blue-Indigo Gradient" },
                              { value: "from-amber-500 to-orange-600", label: "Amber-Orange Gradient" },
                              { value: "from-emerald-500 to-teal-600", label: "Emerald-Teal Gradient" },
                              { value: "from-violet-500 to-purple-600", label: "Violet-Purple Gradient" },
                              { value: "from-rose-500 to-red-600", label: "Rose-Red Gradient" },
                              { value: "from-slate-500 to-slate-650", label: "Slate-Gray Gradient" }
                            ]}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <TextButton type="button" className="bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => { setShowToolModal(false); setEditingTool(null); }}>Cancel</TextButton>
                        <TextButton type="submit"><Save size={18} /> {editingTool ? "Update Tool" : "Create Tool"}</TextButton>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
