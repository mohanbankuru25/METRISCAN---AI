import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { adminService } from "../../services/adminService";
import type { ComplianceRule } from "../../types/platform";
import {
  BookOpen,
  ShieldCheck,
  ArrowLeft,
  Search,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Edit2,
  Eye,
  Sliders,
  AlertTriangle,
  Scale,
  Upload,
  Trash2,
  Check,
} from "lucide-react";

const CATEGORIES = [
  "ALL",
  "MRP",
  "NET_QUANTITY",
  "MANUFACTURER",
  "CONSUMER_CARE",
  "DATE",
  "ORIGIN",
  "GENERAL"
];

export function AdminRules() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);
  const [viewingRule, setViewingRule] = useState<ComplianceRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<ComplianceRule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncingSeed, setSyncingSeed] = useState(false);

  // Document upload & extraction modal states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [extractedDocData, setExtractedDocData] = useState<{
    upload_id: string;
    document_name: string;
    storage_path: string;
    upload_date: string;
    rules_detected_count: number;
    pages_count?: number;
    candidate_rules: any[];
  } | null>(null);
  const [confirmingRules, setConfirmingRules] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const data = await adminService.uploadRuleDocument(file);
      setExtractedDocData(data);
      await fetchRules();
    } catch (err: any) {
      alert("Failed to extract rules from document: " + (err.message || "Document error"));
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const updateCandidateRule = (index: number, field: string, value: any) => {
    if (!extractedDocData) return;
    const updated = [...extractedDocData.candidate_rules];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedDocData({ ...extractedDocData, candidate_rules: updated });
  };

  const removeCandidateRule = (index: number) => {
    if (!extractedDocData) return;
    const updated = extractedDocData.candidate_rules.filter((_, i) => i !== index);
    setExtractedDocData({
      ...extractedDocData,
      candidate_rules: updated,
      rules_detected_count: updated.length,
    });
  };

  const handleApproveCandidate = async (index: number) => {
    if (!extractedDocData) return;
    const rule = extractedDocData.candidate_rules[index];
    try {
      if (rule.id) {
        await adminService.approveRule(rule.id);
      } else {
        await adminService.createComplianceRule({ ...rule, status: "APPROVED", active: true });
      }
      removeCandidateRule(index);
      await fetchRules();
    } catch (err: any) {
      alert("Failed to approve candidate rule: " + (err?.message || "Error"));
    }
  };

  const handleRejectCandidate = async (index: number) => {
    if (!extractedDocData) return;
    const rule = extractedDocData.candidate_rules[index];
    try {
      if (rule.id) {
        await adminService.rejectRule(rule.id);
      }
      removeCandidateRule(index);
      await fetchRules();
    } catch (err: any) {
      alert("Failed to reject candidate rule: " + (err?.message || "Error"));
    }
  };

  const addMissingRule = () => {
    if (!extractedDocData) return;
    const newIdx = extractedDocData.candidate_rules.length + 1;
    const newRule = {
      rule_code: `RULE_MANUAL_${newIdx}`,
      rule_number: String(newIdx),
      rule_name: "Mandatory Statutory Rule",
      title: "Mandatory Statutory Rule",
      description: "Specification and requirement under Legal Metrology Rules, 2011",
      requirement: "Specification and requirement under Legal Metrology Rules, 2011",
      category: "GENERAL",
      field_name: "declaration",
      condition_type: "field_presence",
      operator: "exists",
      expected_value: "",
      severity: "MANDATORY",
      mandatory: true,
      active: false,
      is_enabled: false,
      status: "DRAFT",
      source_page: 1,
      source_document_name: extractedDocData.document_name,
      automation_type: "AUTOMATED",
      effective_from: new Date().toISOString().substring(0, 10),
      effective_to: null,
    };
    setExtractedDocData({
      ...extractedDocData,
      candidate_rules: [...extractedDocData.candidate_rules, newRule],
      rules_detected_count: extractedDocData.candidate_rules.length + 1,
    });
  };

  const handleConfirmExtractedRules = async () => {
    if (!extractedDocData || !extractedDocData.candidate_rules.length) return;
    setConfirmingRules(true);
    try {
      for (const rule of extractedDocData.candidate_rules) {
        if (rule.id) {
          await adminService.approveRule(rule.id);
        } else {
          await adminService.createComplianceRule({ ...rule, status: "APPROVED", active: true });
        }
      }
      alert(`Success: ${extractedDocData.candidate_rules.length} statutory rules approved and activated into Supabase!`);
      setExtractedDocData(null);
      await fetchRules();
    } catch (err: any) {
      alert("Failed to approve rules: " + (err.message || "Network error"));
    } finally {
      setConfirmingRules(false);
    }
  };

  const handleApproveRule = async (ruleId: string) => {
    try {
      const updated = await adminService.approveRule(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
    } catch (err: any) {
      alert("Failed to approve rule: " + (err?.message || "Error"));
    }
  };

  const handleRejectRule = async (ruleId: string) => {
    try {
      const updated = await adminService.rejectRule(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
    } catch (err: any) {
      alert("Failed to reject rule: " + (err?.message || "Error"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteComplianceRule(ruleToDelete.id);
      setRules((prev) => prev.filter((r) => r.id !== ruleToDelete.id));
      setRuleToDelete(null);
    } catch (err: any) {
      alert("Failed to delete rule: " + (err?.message || "Error"));
    } finally {
      setDeleting(false);
    }
  };

  const handleSeedStandardRules = async () => {
    setSyncingSeed(true);
    try {
      const res = await adminService.seedDefaultRules();
      alert(`Standard Legal Metrology Rules Synced: ${res.seeded_count} newly seeded, ${res.skipped_existing_count} already active.`);
      await fetchRules();
    } catch (err: any) {
      alert("Failed to sync standard rules: " + (err?.message || "Error"));
    } finally {
      setSyncingSeed(false);
    }
  };

  // Form state
  const [formData, setFormData] = useState<Partial<ComplianceRule>>({
    rule_code: "",
    title: "",
    description: "",
    category: "MRP",
    field_name: "mrp",
    condition_type: "presence",
    operator: "exists",
    expected_value: "",
    severity: "MANDATORY",
    legal_act: "Legal Metrology (Packaged Commodities) Rules, 2011",
    penalty_clause: "Rule 32 / Section 36(1)",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getComplianceRules();
      setRules(data);
    } catch (err: any) {
      console.error("Failed to load compliance rules:", err);
      setError(err?.message || "Failed to load rules from Supabase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggleStatus = async (rule: ComplianceRule) => {
    try {
      const updated = await adminService.updateRuleStatus(rule.id, !rule.is_active);
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err: any) {
      alert("Failed to update rule status: " + (err?.message || "Network error"));
    }
  };

  const openCreateModal = () => {
    setFormData({
      rule_code: "",
      title: "",
      rule_name: "",
      description: "",
      requirement: "",
      category: "MRP",
      field_name: "mrp",
      condition_type: "presence",
      operator: "exists",
      expected_value: "",
      severity: "MANDATORY",
      legal_act: "Legal Metrology (Packaged Commodities) Rules, 2011",
      penalty_clause: "Rule 32 / Section 36(1)",
      is_active: true,
      active: true,
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (rule: ComplianceRule) => {
    setEditingRule(rule);
    setFormData({
      ...rule,
      title: rule.title || rule.rule_name || "",
      rule_name: rule.rule_name || rule.title || "",
      description: rule.description || rule.requirement || "",
      requirement: rule.requirement || rule.description || "",
      is_active: rule.is_active ?? rule.active ?? true,
      active: rule.active ?? rule.is_active ?? true,
    });
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const ruleCode = (formData.rule_code || "").trim();
    const ruleTitle = (formData.title || formData.rule_name || "").trim();
    const ruleDesc = (formData.description || formData.requirement || "").trim();

    if (!ruleCode) {
      setFormError("Rule code is required (e.g. RULE_6_1_A)");
      return;
    }
    if (!ruleTitle) {
      setFormError("Rule title is required");
      return;
    }
    if (!ruleDesc) {
      setFormError("Description is required");
      return;
    }

    const isActive = formData.is_active ?? formData.active ?? true;
    const rulePayload = {
      ...formData,
      rule_code: ruleCode,
      title: ruleTitle,
      rule_name: ruleTitle,
      description: ruleDesc,
      requirement: ruleDesc,
      active: isActive,
      is_active: isActive,
    };

    setSubmitting(true);
    try {
      if (editingRule) {
        const updated = await adminService.updateComplianceRule(editingRule.id, rulePayload);
        setRules((prev) => prev.map((r) => (r.id === editingRule.id ? updated : r)));
        setEditingRule(null);
      } else {
        const created = await adminService.createComplianceRule(rulePayload);
        setRules((prev) => [created, ...prev]);
        setShowCreateModal(false);
      }
    } catch (err: any) {
      setFormError(err?.message || "Failed to save rule in Supabase");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered rules
  const filteredRules = rules.filter((r) => {
    const q = search.toLowerCase();
    const ruleTitle = (r.title || r.rule_name || "").toLowerCase();
    const ruleDesc = (r.description || r.requirement || "").toLowerCase();
    const ruleAct = (r.legal_act || "").toLowerCase();
    const ruleRef = (r.statutory_reference || "").toLowerCase();
    const ruleDoc = (r.source_document_name || "").toLowerCase();
    const isActive = r.active ?? r.is_active ?? true;
    const ruleStatus = (r.status || "APPROVED").toUpperCase();

    const matchesSearch =
      !search ||
      r.rule_code.toLowerCase().includes(q) ||
      (r.rule_number && r.rule_number.toLowerCase().includes(q)) ||
      ruleTitle.includes(q) ||
      ruleDesc.includes(q) ||
      ruleAct.includes(q) ||
      ruleRef.includes(q) ||
      ruleDoc.includes(q);

    const matchesSeverity = severityFilter === "ALL" || r.severity === severityFilter;
    const matchesCategory = categoryFilter === "ALL" || r.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === "ACTIVE") {
      matchesStatus = isActive && ruleStatus === "APPROVED";
    } else if (statusFilter === "INACTIVE") {
      matchesStatus = !isActive || ruleStatus === "REJECTED";
    } else if (statusFilter === "DRAFT") {
      matchesStatus = ruleStatus === "DRAFT";
    } else if (statusFilter === "APPROVED") {
      matchesStatus = ruleStatus === "APPROVED";
    }

    return matchesSearch && matchesSeverity && matchesCategory && matchesStatus;
  });

  const totalCount = rules.length;
  const activeCount = rules.filter((r) => (r.active ?? r.is_active ?? true) && r.status !== "DRAFT").length;
  const draftCount = rules.filter((r) => r.status === "DRAFT").length;
  const mandatoryCount = rules.filter((r) => r.severity === "MANDATORY" || r.severity === "CRITICAL").length;
  const warningCount = rules.filter((r) => r.severity === "WARNING" || r.severity === "HIGH").length;

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BookOpen size={24} color="#1e3a8a" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a", fontWeight: 700 }}>
                  Statutory Rule Configuration Engine
                </h1>
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                Legal Metrology (Packaged Commodities) Rules, 2011 — Dynamic Regulatory Rules &amp; Evaluation Logic.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/admin")} className="btn btn-secondary btn-sm">
                <ArrowLeft size={14} />
                <span>Dashboard</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileSelected}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", backgroundColor: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}
                disabled={uploadingDoc}
                title="Upload PDF, DOCX, or DOC statutory rules document"
              >
                {uploadingDoc ? <Loader2 size={15} className="spin-animate" /> : <Upload size={15} />}
                <span>{uploadingDoc ? "Extracting Rules..." : "Upload Rule Document"}</span>
              </button>
              <button
                onClick={handleSeedStandardRules}
                className="btn btn-secondary btn-sm"
                title="Sync standard Legal Metrology rules (LM-01 to LM-34)"
                disabled={syncingSeed}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
              >
                {syncingSeed ? <Loader2 size={14} className="spin-animate" /> : <Scale size={14} />}
                <span>Sync Baseline Rules</span>
              </button>
              <button onClick={openCreateModal} className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Plus size={16} />
                <span>Create New Rule</span>
              </button>
              <button
                onClick={fetchRules}
                className="btn btn-secondary btn-sm"
                title="Refresh Rules"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "1rem",
              marginTop: "1.25rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid #e2e8f0"
            }}
          >
            <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Rules</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "0.2rem" }}>{totalCount}</div>
            </div>
            <div style={{ padding: "0.75rem 1rem", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600, textTransform: "uppercase" }}>Active / Enforced</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#15803d", marginTop: "0.2rem" }}>{activeCount}</div>
            </div>
            {draftCount > 0 ? (
              <div style={{ padding: "0.75rem 1rem", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a" }}>
                <div style={{ fontSize: "0.75rem", color: "#92400e", fontWeight: 600, textTransform: "uppercase" }}>Pending Review (Drafts)</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#b45309", marginTop: "0.2rem" }}>{draftCount}</div>
              </div>
            ) : (
              <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                <div style={{ fontSize: "0.75rem", color: "#991b1b", fontWeight: 600, textTransform: "uppercase" }}>Mandatory Clauses</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626", marginTop: "0.2rem" }}>{mandatoryCount}</div>
              </div>
            )}
            <div style={{ padding: "0.75rem 1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, textTransform: "uppercase" }}>High Priority</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", marginTop: "0.2rem" }}>{warningCount}</div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="panel-card" style={{ padding: "1rem 1.25rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            <div style={{ flex: "1 1 260px", position: "relative" }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rule code, number, title, requirement, or PDF..."
                className="form-input"
                style={{ paddingLeft: "2.25rem", width: "100%", fontSize: "0.875rem" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Filter size={14} color="#64748b" />
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-input"
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="form-input"
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
              >
                <option value="ALL">ALL SEVERITY</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="MANDATORY">MANDATORY</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
              >
                <option value="ALL">ALL STATUS</option>
                <option value="ACTIVE">ACTIVE / ENFORCED</option>
                <option value="DRAFT">DRAFT (PENDING REVIEW)</option>
                <option value="APPROVED">APPROVED ONLY</option>
                <option value="INACTIVE">DISABLED / INACTIVE</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ padding: "1rem", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: "0.875rem" }}>{error}</span>
            <button onClick={fetchRules} className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>
              Retry
            </button>
          </div>
        )}

        {/* Rules Table / Cards */}
        <div className="panel-card">
          <div className="panel-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="panel-card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} color="#1e3a8a" />
              <span>Configured Rules ({filteredRules.length})</span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
              Evaluated dynamically during inspector scanning &amp; compliance reports
            </span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", gap: "0.75rem" }}>
              <Loader2 size={32} className="spin-animate" color="#1e3a8a" />
              <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Loading regulatory compliance rules from Supabase...</span>
            </div>
          ) : filteredRules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
              <BookOpen size={48} color="#cbd5e1" style={{ margin: "0 auto 1rem", display: "block" }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No compliance rules found matching the criteria.</p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Try adjusting search parameters or create a new rule.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem" }}>
              {filteredRules.map((rule) => {
                const isCritical = rule.severity === "CRITICAL" || rule.severity === "MANDATORY";
                const isHigh = rule.severity === "HIGH" || rule.severity === "WARNING";
                const isDraft = rule.status === "DRAFT";
                const isRejected = rule.status === "REJECTED";

                return (
                  <div
                    key={rule.id}
                    style={{
                      padding: "1.25rem",
                      borderRadius: "10px",
                      border: isDraft
                        ? "1px solid #fde68a"
                        : rule.is_active
                        ? "1px solid #e2e8f0"
                        : "1px dashed #cbd5e1",
                      backgroundColor: isDraft
                        ? "#fffdf5"
                        : rule.is_active
                        ? "#ffffff"
                        : "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      opacity: isRejected ? 0.65 : rule.is_active || isDraft ? 1 : 0.75,
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "0.25rem 0.6rem",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            borderRadius: "6px",
                            fontFamily: "var(--font-mono)",
                            border: "1px solid #bfdbfe"
                          }}
                        >
                          {rule.rule_code}
                        </span>
                        {rule.rule_number && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.45rem",
                              borderRadius: "4px",
                              backgroundColor: "#e0f2fe",
                              color: "#0369a1",
                            }}
                          >
                            Rule {rule.rule_number}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: "#f1f5f9",
                            color: "#334155",
                            textTransform: "uppercase"
                          }}
                        >
                          {rule.category}
                        </span>
                        <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>{rule.title || rule.rule_name}</strong>
                      </div>

                      {/* Right badges & actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "6px",
                            backgroundColor: isCritical ? "#fef2f2" : isHigh ? "#fffbeb" : "#f1f5f9",
                            color: isCritical ? "#b91c1c" : isHigh ? "#b45309" : "#475569",
                            border: `1px solid ${isCritical ? "#fecaca" : isHigh ? "#fde68a" : "#e2e8f0"}`
                          }}
                        >
                          {rule.severity}
                        </span>

                        {isDraft ? (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "6px",
                              backgroundColor: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fde68a",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem"
                            }}
                          >
                            <AlertCircle size={12} />
                            DRAFT — REVIEW REQUIRED
                          </span>
                        ) : isRejected ? (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "6px",
                              backgroundColor: "#f1f5f9",
                              color: "#64748b",
                              border: "1px solid #cbd5e1"
                            }}
                          >
                            REJECTED
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "6px",
                              backgroundColor: rule.is_active ? "#ecfdf5" : "#f1f5f9",
                              color: rule.is_active ? "#047857" : "#64748b",
                              border: `1px solid ${rule.is_active ? "#a7f3d0" : "#cbd5e1"}`,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem"
                            }}
                          >
                            {rule.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {rule.is_active ? "ENFORCED" : "DISABLED"}
                          </span>
                        )}

                        {isDraft && (
                          <>
                            <button
                              onClick={() => handleApproveRule(rule.id)}
                              className="btn btn-sm"
                              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", backgroundColor: "#166534", color: "#ffffff", borderColor: "#166534", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                              title="Approve and activate this rule"
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectRule(rule.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", color: "#b91c1c", borderColor: "#fecaca", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                              title="Reject draft rule"
                            >
                              <X size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setViewingRule(rule)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "0.3rem 0.5rem" }}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(rule)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "0.3rem 0.5rem" }}
                          title="Edit Rule"
                        >
                          <Edit2 size={14} />
                        </button>
                        {!isDraft && (
                          <button
                            onClick={() => handleToggleStatus(rule)}
                            className={`btn btn-sm ${rule.is_active ? "btn-secondary" : "btn-primary"}`}
                            style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                          >
                            {rule.is_active ? "Disable" : "Enable"}
                          </button>
                        )}
                        <button
                          onClick={() => setRuleToDelete(rule)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "0.3rem 0.5rem", color: "#dc2626", borderColor: "#fee2e2" }}
                          title="Delete / Deactivate Rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: "0.875rem", color: "#334155", margin: 0, lineHeight: 1.5 }}>
                      {rule.requirement || rule.description}
                    </p>

                    {/* Metadata strip */}
                    <div
                      style={{
                        display: "flex",
                        gap: "1.25rem",
                        fontSize: "0.75rem",
                        color: "#64748b",
                        background: "#f8fafc",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        border: "1px solid #f1f5f9",
                        flexWrap: "wrap"
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: "#475569" }}>Field Evaluated:</span>{" "}
                        <code style={{ background: "#e2e8f0", padding: "0.1rem 0.35rem", borderRadius: "3px" }}>
                          {rule.field_name || "declaration"}
                        </code>
                      </div>
                      <div>
                        <span style={{ fontWeight: 600, color: "#475569" }}>Condition:</span>{" "}
                        <span>{rule.condition_type} ({rule.operator || "exists"})</span>
                      </div>
                      {rule.automation_type && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#475569" }}>Automation:</span>{" "}
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>{rule.automation_type}</span>
                        </div>
                      )}
                      {rule.source_document_name && (
                        <div>
                          <span style={{ fontWeight: 600, color: "#475569" }}>Source Document:</span>{" "}
                          <span style={{ color: "#1e3a8a", fontWeight: 600 }}>{rule.source_document_name}</span>
                          {rule.source_page ? <span> (Page {rule.source_page})</span> : null}
                        </div>
                      )}
                      <div>
                        <span style={{ fontWeight: 600, color: "#475569" }}>Legal Reference:</span>{" "}
                        <span>{rule.statutory_reference || rule.legal_act || "Legal Metrology Rules, 2011"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* VIEW RULE MODAL */}
      {viewingRule && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="panel-card" style={{ maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Scale size={20} color="#1e3a8a" />
                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>Statutory Rule Specification</h3>
              </div>
              <button onClick={() => setViewingRule(null)} className="btn btn-secondary btn-sm" style={{ padding: "0.25rem" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.875rem" }}>
              <div>
                <span style={{ fontWeight: 700, color: "#64748b" }}>Rule Code:</span>
                <div style={{ fontWeight: 800, color: "#1e3a8a", fontFamily: "var(--font-mono)", fontSize: "1rem" }}>{viewingRule.rule_code}</div>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: "#64748b" }}>Title:</span>
                <div style={{ fontWeight: 600, color: "#0f172a" }}>{viewingRule.title}</div>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: "#64748b" }}>Description:</span>
                <div style={{ color: "#334155", lineHeight: 1.5 }}>{viewingRule.description}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Category:</span>
                  <div>{viewingRule.category}</div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Severity:</span>
                  <div style={{ fontWeight: 700, color: viewingRule.severity === "MANDATORY" ? "#dc2626" : "#d97706" }}>{viewingRule.severity}</div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Evaluated Field:</span>
                  <div><code>{viewingRule.field_name || "N/A"}</code></div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Condition &amp; Operator:</span>
                  <div>{viewingRule.condition_type} ({viewingRule.operator})</div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Expected Value / Regex:</span>
                  <div><code>{viewingRule.expected_value || "(Field Presence)"}</code></div>
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: "#64748b" }}>Enforcement Status:</span>
                  <div style={{ fontWeight: 700, color: viewingRule.is_active ? "#15803d" : "#64748b" }}>
                    {viewingRule.is_active ? "ACTIVE (Enforced)" : "DISABLED"}
                  </div>
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: "#64748b" }}>Legal Act:</span>
                <div style={{ color: "#0f172a" }}>{viewingRule.legal_act}</div>
              </div>
              <div>
                <span style={{ fontWeight: 700, color: "#64748b" }}>Penalty Clause:</span>
                <div style={{ color: "#b91c1c", fontWeight: 600 }}>{viewingRule.penalty_clause}</div>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setViewingRule(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(showCreateModal || editingRule) && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="panel-card" style={{ maxWidth: "650px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sliders size={20} color="#1e3a8a" />
                <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>
                  {editingRule ? "Edit Compliance Rule" : "Create New Statutory Rule"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRule(null);
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.25rem" }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "0.85rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertTriangle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Rule Code <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.rule_code || ""}
                    onChange={(e) => setFormData({ ...formData, rule_code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                    placeholder="e.g. RULE_6_1_A"
                    className="form-input"
                    required
                    style={{ width: "100%", fontFamily: "var(--font-mono)" }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Category <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    value={formData.category || "MRP"}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-input"
                    style={{ width: "100%" }}
                  >
                    {CATEGORIES.filter((c) => c !== "ALL").map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                  Rule Title <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Maximum Retail Price (MRP) Declaration"
                  className="form-input"
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                  Description <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Detailed explanation of statutory requirement..."
                  className="form-input"
                  required
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Evaluated Field
                  </label>
                  <select
                    value={formData.field_name || "mrp"}
                    onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                    className="form-input"
                    style={{ width: "100%" }}
                  >
                    <option value="mrp">mrp</option>
                    <option value="net_quantity">net_quantity</option>
                    <option value="manufacturer_details">manufacturer_details</option>
                    <option value="consumer_care">consumer_care</option>
                    <option value="country_of_origin">country_of_origin</option>
                    <option value="mfg_date">mfg_date</option>
                    <option value="expiry_date">expiry_date</option>
                    <option value="unit_sale_price">unit_sale_price</option>
                    <option value="generic_name">generic_name</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Condition Type
                  </label>
                  <select
                    value={formData.condition_type || "presence"}
                    onChange={(e) => setFormData({ ...formData, condition_type: e.target.value })}
                    className="form-input"
                    style={{ width: "100%" }}
                  >
                    <option value="presence">Presence (Exists)</option>
                    <option value="contains">Contains Substring</option>
                    <option value="equals">Exact Equals</option>
                    <option value="regex">Regex Match</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Severity
                  </label>
                  <select
                    value={formData.severity || "MANDATORY"}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                    className="form-input"
                    style={{ width: "100%" }}
                  >
                    <option value="MANDATORY">MANDATORY</option>
                    <option value="WARNING">WARNING</option>
                    <option value="OPTIONAL">OPTIONAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                  Expected Value / Pattern (Optional)
                </label>
                <input
                  type="text"
                  value={formData.expected_value || ""}
                  onChange={(e) => setFormData({ ...formData, expected_value: e.target.value })}
                  placeholder="e.g. ₹ or regex pattern if condition is regex"
                  className="form-input"
                  style={{ width: "100%", fontFamily: "var(--font-mono)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Legal Act Reference
                  </label>
                  <input
                    type="text"
                    value={formData.legal_act || ""}
                    onChange={(e) => setFormData({ ...formData, legal_act: e.target.value })}
                    className="form-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Statutory Penalty Clause
                  </label>
                  <input
                    type="text"
                    value={formData.penalty_clause || ""}
                    onChange={(e) => setFormData({ ...formData, penalty_clause: e.target.value })}
                    className="form-input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="rule_is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="rule_is_active" style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                  Enable Rule Immediately (Active in Real-Time OCR Pipeline)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingRule(null);
                  }}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Loader2 size={16} className="spin-animate" />
                      Saving to Supabase...
                    </span>
                  ) : editingRule ? (
                    "Update Statutory Rule"
                  ) : (
                    "Create Statutory Rule"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* REVIEW EXTRACTED RULES POPUP / MODAL */}
      {extractedDocData && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: "1rem" }}>
          <div className="panel-card" style={{ maxWidth: "1280px", width: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", padding: "1.5rem" }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem", marginBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <ShieldCheck size={24} color="#166534" />
                  <h2 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a", fontWeight: 800 }}>
                    Review Extracted Statutory Rules
                  </h2>
                </div>
                <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", fontSize: "0.825rem", color: "#475569", flexWrap: "wrap" }}>
                  <span><strong>Document:</strong> {extractedDocData.document_name}</span>
                  <span><strong>Upload Date:</strong> {extractedDocData.upload_date}</span>
                  <span style={{ color: "#166534", fontWeight: 700 }}>
                    <strong>Detected Rules:</strong> {extractedDocData.rules_detected_count}
                  </span>
                  {extractedDocData.pages_count && (
                    <span><strong>Pages Parsed:</strong> {extractedDocData.pages_count}</span>
                  )}
                  <span style={{ color: "#b45309", fontSize: "0.78rem" }}>
                    * Rules are saved as DRAFT. Review &amp; approve to activate for compliance scanning.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setExtractedDocData(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.3rem" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Extracted Rules Table */}
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "1rem" }}>
              <table className="gov-table" style={{ fontSize: "0.825rem", minWidth: "1150px" }}>
                <thead style={{ position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 2 }}>
                  <tr>
                    <th style={{ width: "120px" }}>Rule Code</th>
                    <th style={{ width: "55px", textAlign: "center" }}>Page</th>
                    <th style={{ width: "160px" }}>Rule Name</th>
                    <th>Requirement / Description</th>
                    <th style={{ width: "105px" }}>Category</th>
                    <th style={{ width: "100px" }}>Field</th>
                    <th style={{ width: "95px" }}>Condition</th>
                    <th style={{ width: "75px" }}>Expected</th>
                    <th style={{ width: "65px" }}>Op</th>
                    <th style={{ width: "95px" }}>Automation</th>
                    <th style={{ width: "90px" }}>Severity</th>
                    <th style={{ width: "50px", textAlign: "center" }}>Active</th>
                    <th style={{ width: "105px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedDocData.candidate_rules.map((rule, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          value={rule.rule_code}
                          onChange={(e) => updateCandidateRule(idx, "rule_code", e.target.value)}
                          className="mono"
                          style={{ width: "100%", padding: "0.25rem 0.4rem", fontSize: "0.78rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0369a1", backgroundColor: "#e0f2fe", padding: "0.15rem 0.35rem", borderRadius: "4px" }}>
                          P.{rule.source_page || 1}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={rule.rule_name || rule.title || ""}
                          onChange={(e) => {
                            updateCandidateRule(idx, "rule_name", e.target.value);
                            updateCandidateRule(idx, "title", e.target.value);
                          }}
                          style={{ width: "100%", padding: "0.25rem 0.4rem", fontSize: "0.78rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </td>
                      <td>
                        <textarea
                          rows={2}
                          value={rule.requirement || rule.description || ""}
                          onChange={(e) => {
                            updateCandidateRule(idx, "description", e.target.value);
                            updateCandidateRule(idx, "requirement", e.target.value);
                          }}
                          style={{ width: "100%", padding: "0.25rem 0.4rem", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px", resize: "vertical" }}
                        />
                      </td>
                      <td>
                        <select
                          value={rule.category}
                          onChange={(e) => updateCandidateRule(idx, "category", e.target.value)}
                          style={{ width: "100%", padding: "0.25rem 0.3rem", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        >
                          {CATEGORIES.filter((c) => c !== "ALL").map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={rule.field_name || "declaration"}
                          onChange={(e) => updateCandidateRule(idx, "field_name", e.target.value)}
                          style={{ width: "100%", padding: "0.25rem 0.4rem", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </td>
                      <td>
                        <select
                          value={rule.condition_type}
                          onChange={(e) => updateCandidateRule(idx, "condition_type", e.target.value)}
                          style={{ width: "100%", padding: "0.25rem 0.3rem", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        >
                          <option value="field_presence">presence</option>
                          <option value="text_match">text_match</option>
                          <option value="dimension">dimension</option>
                          <option value="contrast">contrast</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={rule.expected_value || ""}
                          onChange={(e) => updateCandidateRule(idx, "expected_value", e.target.value)}
                          placeholder="val"
                          style={{ width: "100%", padding: "0.25rem 0.3rem", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        />
                      </td>
                      <td>
                        <select
                          value={rule.operator || "exists"}
                          onChange={(e) => updateCandidateRule(idx, "operator", e.target.value)}
                          style={{ width: "100%", padding: "0.25rem 0.2rem", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        >
                          <option value="exists">exists</option>
                          <option value="contains">contains</option>
                          <option value="gte">&gt;=</option>
                          <option value="lte">&lt;=</option>
                          <option value="regex">regex</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={rule.automation_type || "AUTOMATED"}
                          onChange={(e) => updateCandidateRule(idx, "automation_type", e.target.value)}
                          style={{ width: "100%", padding: "0.25rem 0.2rem", fontSize: "0.72rem", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: 600 }}
                        >
                          <option value="AUTOMATED">AUTOMATED</option>
                          <option value="HYBRID">HYBRID</option>
                          <option value="MANUAL">MANUAL</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={rule.severity}
                          onChange={(e) => updateCandidateRule(idx, "severity", e.target.value)}
                          style={{ width: "100%", padding: "0.25rem 0.3rem", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px", fontWeight: 700, color: rule.severity === "MANDATORY" ? "#dc2626" : "#d97706" }}
                        >
                          <option value="MANDATORY">MANDATORY</option>
                          <option value="HIGH">HIGH</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="LOW">LOW</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={rule.active}
                          onChange={(e) => updateCandidateRule(idx, "active", e.target.checked)}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                          <button
                            onClick={() => handleApproveCandidate(idx)}
                            className="btn btn-sm"
                            style={{ padding: "0.2rem 0.35rem", backgroundColor: "#166534", color: "#fff", borderColor: "#166534" }}
                            title="Approve and activate this candidate rule"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => handleRejectCandidate(idx)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.2rem 0.35rem", color: "#b91c1c", borderColor: "#fecaca" }}
                            title="Reject candidate rule"
                          >
                            <X size={12} />
                          </button>
                          <button
                            onClick={() => removeCandidateRule(idx)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: "0.2rem 0.35rem" }}
                            title="Remove from queue"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <button
                onClick={addMissingRule}
                className="btn btn-secondary btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Plus size={14} />
                <span>+ Add Missing Rule</span>
              </button>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setExtractedDocData(null)}
                  className="btn btn-secondary btn-sm"
                  disabled={confirmingRules}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmExtractedRules}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: "#166534", borderColor: "#166534", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  disabled={confirmingRules || !extractedDocData.candidate_rules.length}
                >
                  {confirmingRules ? (
                    <>
                      <Loader2 size={14} className="spin-animate" />
                      <span>Saving &amp; Activating in Supabase...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Confirm &amp; Activate All Rules ({extractedDocData.candidate_rules.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {ruleToDelete && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: "1rem" }}>
          <div className="panel-card" style={{ maxWidth: "480px", width: "100%", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a", fontWeight: 700 }}>
                  Delete Compliance Rule
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  {ruleToDelete.rule_code} — {ruleToDelete.title || ruleToDelete.rule_name}
                </span>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#475569", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
              Are you sure you want to delete this rule? This rule will be deactivated and no longer evaluated for future inspections. Historical inspection reports remain intact.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setRuleToDelete(null)}
                className="btn btn-secondary btn-sm"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn btn-danger btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 size={14} className="spin-animate" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
