// AdminAssignAccess.js — Grant Access + Row-Level Access tabs
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

const adminHeaders = () => ({
    role: localStorage.getItem("role"),
    user: localStorage.getItem("user"),
});

const EMPTY_RLAC = {
    principalType: "USER",
    principalName: "",
    groupcode: "",
    clustercode: "",
    companycode: "",
    plantcode: "",
    isActive: true,
};

const fmtTs = (ts) => {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
};

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
    if (!toast) return null;
    const cfg = {
        success: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", icon: "✅" },
        warning: { bg: "#fffbeb", color: "#92400e", border: "#fde68a", icon: "⚠️" },
        error: { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5", icon: "❌" },
    }[toast.type] || { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0", icon: "✅" };
    return (
        <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 2000,
            padding: "12px 20px", borderRadius: "12px", fontWeight: 600, fontSize: "13.5px",
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)", animation: "fadeIn 0.25s ease"
        }}>
            {cfg.icon} {toast.message}
        </div>
    );
}

// ─── TAB 1: Grant Access ───────────────────────────────────────────────────────
function GrantAccessTab() {
    const [catalogs, setCatalogs] = useState([]);
    const [schemas, setSchemas] = useState([]);
    const [tables, setTables] = useState([]);
    const [loadingCatalogs, setLC] = useState(false);
    const [loadingSchemas, setLS] = useState(false);
    const [loadingTables, setLT] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [policies, setPolicies] = useState([]);
    const [loadingPolicies, setLP] = useState(false);
    const [form, setForm] = useState({ user: "", catalog: "", schema: "", table: "", privilege: "SELECT" });
    const [toast, setToast] = useState(null);

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Load catalogs on mount
    useEffect(() => {
        setLC(true);
        api.get("/access/catalogs", { headers: adminHeaders() })
            .then(r => setCatalogs(r.data?.catalogs || []))
            .catch(() => showToast("Failed to load catalogs", "error"))
            .finally(() => setLC(false));
    }, []);

    // Load schemas when catalog changes
    useEffect(() => {
        if (!form.catalog) { setSchemas([]); setTables([]); return; }
        setLS(true); setSchemas([]); setTables([]);
        setForm(f => ({ ...f, schema: "", table: "" }));
        api.get(`/access/schemas/${form.catalog}`, { headers: adminHeaders() })
            .then(r => setSchemas(r.data?.schemas || []))
            .catch(() => showToast("Failed to load schemas", "error"))
            .finally(() => setLS(false));
    }, [form.catalog]); // eslint-disable-line

    // Load tables when schema changes
    useEffect(() => {
        if (!form.schema) { setTables([]); return; }
        setLT(true); setTables([]);
        setForm(f => ({ ...f, table: "" }));
        api.get(`/access/tables/${form.catalog}/${form.schema}`, { headers: adminHeaders() })
            .then(r => setTables(r.data?.tables || []))
            .catch(() => showToast("Failed to load tables", "error"))
            .finally(() => setLT(false));
    }, [form.schema]); // eslint-disable-line

    // Load all policies for the table below
    const loadPolicies = useCallback(async () => {
        setLP(true);
        try {
            const r = await api.get("/access/policies-all", { headers: adminHeaders() });
            setPolicies(r.data?.result?.data_array || []);
        } catch { /* silent */ }
        finally { setLP(false); }
    }, []);

    useEffect(() => { loadPolicies(); }, [loadPolicies]);

    const canSubmit = form.user && form.catalog && form.schema && form.table && form.privilege;

    const assign = async () => {
        if (!canSubmit) { showToast("Please fill in all fields", "error"); return; }
        setSubmitting(true);
        try {
            const res = await api.post("/access/assign", form, { headers: adminHeaders() });
            if (res.data.success) {
                if (res.data.warning) {
                    showToast(res.data.message, "warning");
                } else {
                    showToast("Access granted successfully");
                    setForm({ user: "", catalog: "", schema: "", table: "", privilege: "SELECT" });
                    setSchemas([]); setTables([]);
                }
                loadPolicies(); // Refresh the table below
            } else {
                showToast("Failed to assign access", "error");
            }
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to assign access", "error");
        } finally { setSubmitting(false); }
    };

    const inputStyle = {
        width: "100%", padding: "9px 12px", fontSize: 13,
        border: "1px solid #d1d5db", borderRadius: 8, boxSizing: "border-box",
        background: "#fff", color: "#111827",
    };
    const labelStyle = { fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 };

    return (
        <>
            <Toast toast={toast} />

            {/* Form */}
            <div style={{
                background: "#fff", borderRadius: "18px", padding: "28px",
                boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9",
                marginTop: 20, maxWidth: 700
            }}>
                <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "12px", marginBottom: "20px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Grant Databricks Privilege</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>User Email</label>
                        <input type="email" placeholder="user@company.com" value={form.user}
                            onChange={e => setForm({ ...form, user: e.target.value })} disabled={submitting}
                            style={inputStyle} />
                    </div>

                    <div>
                        <label style={labelStyle}>Catalog {loadingCatalogs && <span style={{ color: "#9ca3af" }}> Loading...</span>}</label>
                        <select value={form.catalog} onChange={e => setForm({ ...form, catalog: e.target.value })} disabled={loadingCatalogs || submitting} style={inputStyle}>
                            <option value="">{loadingCatalogs ? "Loading..." : "Select catalog"}</option>
                            {catalogs.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Schema {loadingSchemas && <span style={{ color: "#9ca3af" }}> Loading...</span>}</label>
                        <select value={form.schema} onChange={e => setForm({ ...form, schema: e.target.value })} disabled={!form.catalog || loadingSchemas || submitting} style={inputStyle}>
                            <option value="">{!form.catalog ? "Select catalog first" : loadingSchemas ? "Loading..." : "Select schema"}</option>
                            {schemas.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Table {loadingTables && <span style={{ color: "#9ca3af" }}> Loading...</span>}</label>
                        <select value={form.table} onChange={e => setForm({ ...form, table: e.target.value })} disabled={!form.schema || loadingTables || submitting} style={inputStyle}>
                            <option value="">{!form.schema ? "Select schema first" : loadingTables ? "Loading..." : "Select table"}</option>
                            {tables.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Privilege</label>
                        <select value={form.privilege} onChange={e => setForm({ ...form, privilege: e.target.value })} disabled={submitting} style={inputStyle}>
                            <option value="SELECT">SELECT</option>
                            <option value="MODIFY">MODIFY</option>
                            <option value="ALL PRIVILEGES">ALL PRIVILEGES</option>
                        </select>
                    </div>
                </div>

                {canSubmit && (
                    <div style={{ margin: "20px 0 0", padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13px", color: "#334155", fontFamily: "monospace", wordBreak: "break-all" }}>
                        GRANT <span style={{ color: "#1d4ed8", fontWeight: 600 }}>{form.privilege}</span> ON TABLE <span style={{ color: "#0f172a", fontWeight: 600 }}>{form.catalog}.{form.schema}.{form.table}</span> TO `<span style={{ color: "#0f172a", fontWeight: 600 }}>{form.user}</span>`
                    </div>
                )}

                <div style={{ paddingTop: "24px" }}>
                    <button onClick={assign} disabled={!canSubmit || submitting} style={{
                        padding: "10px 24px", background: canSubmit ? "linear-gradient(135deg,#1e3a5f,#0f172a)" : "#e2e8f0",
                        color: canSubmit ? "#fff" : "#94a3b8", border: "none", borderRadius: "10px",
                        fontWeight: 600, fontSize: "13.5px", cursor: canSubmit ? "pointer" : "default",
                        boxShadow: canSubmit ? "0 4px 14px rgba(15,23,42,0.2)" : "none", transition: "all 0.2s"
                    }}>
                        {submitting ? "Granting..." : "Grant Access"}
                    </button>
                </div>
            </div>

            {/* Granted Access Table */}
            <div style={{
                background: "#fff", borderRadius: "18px", padding: "28px",
                boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9",
                marginTop: "24px"
            }}>
                <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "16px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                        Granted Access Policies ({policies.length})
                    </h3>
                    <button onClick={loadPolicies} disabled={loadingPolicies} style={{ padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                        {loadingPolicies ? "Loading..." : "Refresh"}
                    </button>
                </div>

                {loadingPolicies ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        <div style={{ width: "24px", height: "24px", border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }}></div>
                        <div style={{ fontSize: "13px" }}>Loading...</div>
                    </div>
                ) : policies.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af" }}>
                        <div style={{ fontSize: "24px", marginBottom: "16px" }}>📭</div>
                        <div style={{ fontSize: "13px" }}>No access policies found</div>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr>
                                    {["User", "Catalog", "Schema", "Table", "Privilege", "Status", "Created"].map(h => (
                                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {policies.map((p, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                        <td style={{ padding: "14px 16px", color: "#1e293b", fontWeight: 600 }}>{p[1]}</td>
                                        <td style={{ padding: "14px 16px" }}><code style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>{p[3]}</code></td>
                                        <td style={{ padding: "14px 16px" }}><code style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>{p[4]}</code></td>
                                        <td style={{ padding: "14px 16px" }}><code style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", color: "#475569" }}>{p[5]}</code></td>
                                        <td style={{ padding: "14px 16px" }}>
                                            <span style={{ display: "inline-block", background: "#dbeafe", color: "#1d4ed8", padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>{p[6]}</span>
                                        </td>
                                        <td style={{ padding: "14px 16px" }}>
                                            <span style={{
                                                display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                                                background: p[7] === "ACTIVE" ? "#dcfce7" : "#f1f5f9", color: p[7] === "ACTIVE" ? "#15803d" : "#64748b",
                                            }}>
                                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: p[7] === "ACTIVE" ? "#22c55e" : "#9ca3af" }} />
                                                {p[7] === "ACTIVE" ? "Granted" : "Pending"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "14px 16px", color: "#64748b", whiteSpace: "nowrap" }}>{fmtTs(p[8])}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

// ─── TAB 2: Row-Level Access Control ──────────────────────────────────────────
function RLACTab() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_RLAC);
    const [editMode, setEditMode] = useState(false);
    const [toast, setToast] = useState(null);
    const [search, setSearch] = useState("");

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get("/access/rlac-policies", { headers: adminHeaders() });
            setPolicies(res.data?.result?.data_array || []);
        } catch (err) {
            showToast("Failed to load RLAC policies: " + (err.response?.data?.error || err.message), "error");
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []); // eslint-disable-line

    const save = async () => {
        if (!form.principalName) { showToast("Principal Name is required", "error"); return; }
        setSaving(true);
        try {
            await api.post("/access/rlac-policies", form, { headers: adminHeaders() });
            showToast(editMode ? "Policy updated" : "Policy created");
            setForm(EMPTY_RLAC); setEditMode(false);
            load();
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to save policy", "error");
        } finally { setSaving(false); }
    };

    const del = async (row) => {
        if (!window.confirm(`Delete policy for ${row[1]}?`)) return; // eslint-disable-line
        try {
            await api.delete("/access/rlac-policies", { headers: adminHeaders(), data: { principalType: row[0], principalName: row[1] } });
            showToast("Policy deleted");
            load();
        } catch (err) {
            showToast(err.response?.data?.error || "Failed to delete", "error");
        }
    };

    const edit = (row) => {
        setForm({
            principalType: row[0] || "USER",
            principalName: row[1] || "",
            groupcode: row[2] || "",
            clustercode: row[3] || "",
            companycode: row[4] || "",
            plantcode: row[5] || "",
            isActive: row[6] === "true" || row[6] === true,
        });
        setEditMode(true);
    };

    const filtered = policies.filter(r =>
        (r[1] || "").toLowerCase().includes(search.toLowerCase()) ||
        (r[2] || "").toLowerCase().includes(search.toLowerCase())
    );

    const inputStyle = {
        width: "100%", padding: "8px 11px", border: "1px solid #d1d5db",
        borderRadius: 8, fontSize: 13, boxSizing: "border-box",
    };
    const labelStyle = { fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", display: "block", marginBottom: 4 };

    return (
        <>
            <Toast toast={toast} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginTop: 24, alignItems: "start" }}>

                {/* Add / Edit Form */}
                <div style={{ background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
                    <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "16px", marginBottom: "20px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{editMode ? "Edit Policy" : "Add RLAC Policy"}</h3>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                        <div>
                            <label style={labelStyle}>Principal Type</label>
                            <select value={form.principalType} onChange={e => setForm({ ...form, principalType: e.target.value })} style={inputStyle}>
                                <option value="USER">USER</option>
                                <option value="GROUP">GROUP</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Principal Name *</label>
                            <input style={inputStyle} placeholder="user@email.com or group-name" value={form.principalName} onChange={e => setForm({ ...form, principalName: e.target.value })} />
                        </div>
                        {[["groupcode", "Group Code"], ["clustercode", "Cluster Code"], ["companycode", "Company Code"], ["plantcode", "Plant Code"]].map(([key, label]) => (
                            <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input style={inputStyle} placeholder={label} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                            </div>
                        ))}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, gridColumn: "1 / -1", marginTop: "8px" }}>
                            <input type="checkbox" id="rlac-active" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#1e3a5f" }} />
                            <label htmlFor="rlac-active" style={{ fontSize: 13, color: "#374151", fontWeight: 500, cursor: "pointer" }}>Active Policy</label>
                        </div>
                        <div style={{ display: "flex", gap: 12, gridColumn: "1 / -1", marginTop: "12px" }}>
                            <button onClick={save} disabled={saving} style={{ padding: "10px 24px", background: "linear-gradient(135deg,#1e3a5f,#0f172a)", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 600, fontSize: "13.5px", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(15,23,42,0.2)" }}>
                                {saving ? "Saving..." : editMode ? "Update Policy" : "Add Policy"}
                            </button>
                            {editMode && (
                                <button onClick={() => { setForm(EMPTY_RLAC); setEditMode(false); }} style={{ padding: "10px 24px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "13.5px", fontWeight: 600, cursor: "pointer" }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Policy Table */}
                <div style={{ background: "#fff", borderRadius: "18px", padding: "28px", boxShadow: "0 1px 12px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
                    <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: "16px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>RLAC Policies ({filtered.length})</h3>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)}
                                style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", outline: "none" }} />
                            <button onClick={load} disabled={loading} style={{ padding: "8px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                                {loading ? "..." : "Refresh"}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                            <div style={{ width: "24px", height: "24px", border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }}></div>
                            <div style={{ fontSize: "13px" }}>Loading...</div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af" }}>
                            <div style={{ fontSize: "24px", marginBottom: "16px" }}>📭</div>
                            <div style={{ fontSize: "13px" }}>No RLAC policies found</div>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                <thead>
                                    <tr>
                                        {["Type", "Principal", "Group", "Cluster", "Company", "Plant", "Active", "Actions"].map(h => (
                                            <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((row, i) => (
                                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <td style={{ padding: "14px 16px" }}>
                                                <span style={{ background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>{row[0]}</span>
                                            </td>
                                            <td style={{ padding: "14px 16px", color: "#1e293b", fontWeight: 600 }}>{row[1]}</td>
                                            <td style={{ padding: "14px 16px", color: "#64748b" }}>{row[2] || "—"}</td>
                                            <td style={{ padding: "14px 16px", color: "#64748b" }}>{row[3] || "—"}</td>
                                            <td style={{ padding: "14px 16px", color: "#64748b" }}>{row[4] || "—"}</td>
                                            <td style={{ padding: "14px 16px", color: "#64748b" }}>{row[5] || "—"}</td>
                                            <td style={{ padding: "14px 16px" }}>
                                                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: (row[6] === "true" || row[6] === true) ? "#22c55e" : "#cbd5e1" }} />
                                            </td>
                                            <td style={{ padding: "14px 16px" }}>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <button onClick={() => edit(row)} style={{ padding: "4px 12px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>Edit</button>
                                                    <button onClick={() => del(row)} style={{ padding: "4px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function AdminAssignAccess() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("grant");

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: "40px 44px" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
            `}</style>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <button onClick={() => navigate("/dashboard")} style={{
                        background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 14px",
                        cursor: "pointer", color: "#64748b", fontSize: "13.5px", fontWeight: 600,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                    }}>
                        ← Dashboard
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>
                            Access Management
                        </h1>
                        <p style={{ margin: "5px 0 0", color: "#94a3b8", fontSize: "13.5px" }}>Grant Databricks privileges and manage row-level access</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", background: "#e2e8f0", borderRadius: "12px", padding: "6px", width: "fit-content", marginBottom: "24px" }}>
                {[["grant", "Grant Access"], ["rlac", "Row-Level Access"]].map(([id, label]) => (
                    <button key={id} onClick={() => setActiveTab(id)} style={{
                        padding: "8px 24px", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                        background: activeTab === id ? "#fff" : "transparent",
                        color: activeTab === id ? "#0f172a" : "#64748b",
                        boxShadow: activeTab === id ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}>
                        {label}
                    </button>
                ))}
            </div>

            <div style={{ animation: "fadeIn 0.3s ease" }}>
                {activeTab === "grant" && <GrantAccessTab />}
                {activeTab === "rlac" && <RLACTab />}
            </div>
        </div>
    );
}

export default AdminAssignAccess;
