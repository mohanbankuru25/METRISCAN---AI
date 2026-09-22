import { useState, useEffect } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { inspectorService } from "../../services/inspectorService";
import type { ComplianceRule, RuleRequest } from "../../types/platform";
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Eye,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  Shield,
  Layers,
  FileText
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

const REQUEST_TYPES = [
  "Suggest Rule Change",
  "Report Incorrect Rule",
  "Request New Rule",
  "Report Missing Rule",
  "Applicability Concern",
  "Other"
];

export function InspectorRules() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: "rules" | "my_requests"
  const [activeTab, setActiveTab] = useState<"rules" | "my_requests">("rules");

  // Filters
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Detail Modal
  const [viewingRule, setViewingRule] = useState<ComplianceRule | null>(null);

  // "Send Request" Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    request_type: "Suggest Rule Change",
    rule_id: "",
    rule_code: "",
    subject: "",
    description: "",
    evidence_url: "",
  });

  // "My Requests" list
  const [myRequests, setMyRequests] = useState<RuleRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch statutory rules from Supabase (Source of truth)
  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inspectorService.getRules();
      setRules(data);
    } catch (err: any) {
      console.error("Failed to load compliance rules:", err);
      setError(err?.message || "Failed to load statutory rules from Supabase");
    } finally {
      setLoading(false);
    }
  };

  // Fetch my requests
  const fetchMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await inspectorService.getMyRuleRequests();
      setMyRequests(data);
    } catch (err) {
      console.error("Failed to load inspector rule requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchMyRequests();
  }, []);

  const openSendRequestModal = (preselectedRule?: ComplianceRule) => {
    setRequestForm({
      request_type: "Suggest Rule Change",
      rule_id: preselectedRule?.id || "",
      rule_code: preselectedRule?.rule_code || "",
      subject: preselectedRule ? `Suggestion regarding ${preselectedRule.rule_code}` : "",
      description: "",
      evidence_url: "",
    });
    setRequestError(null);
    setRequestSuccess(null);
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.subject.trim()) {
      setRequestError("Subject is required");
      return;
    }
    if (!requestForm.description.trim()) {
      setRequestError("Description is required");
      return;
    }

    setSubmittingRequest(true);
    setRequestError(null);
    try {
      const created = await inspectorService.submitRuleRequest({
        request_type: requestForm.request_type,
        rule_id: requestForm.rule_id || null,
        rule_code: requestForm.rule_code || null,
        subject: requestForm.subject.trim(),
        description: requestForm.description.trim(),
        evidence_url: requestForm.evidence_url.trim() || null,
      });

      setRequestSuccess("Your rule request has been submitted to Directorate Administration for review.");
      if (created) {
        setMyRequests((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
      }
      await fetchMyRequests();
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess(null);
      }, 1400);
    } catch (err: any) {
      setRequestError(err?.message || "Failed to submit rule request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Filtered rules
  const filteredRules = rules.filter((r) => {
    const q = search.toLowerCase();
    const ruleTitle = (r.title || r.rule_name || "").toLowerCase();
    const ruleDesc = (r.description || r.requirement || "").toLowerCase();
    const ruleAct = (r.legal_act || "").toLowerCase();
    const ruleRef = (r.statutory_reference || "").toLowerCase();
    const isActive = r.active ?? r.is_active ?? true;

    const matchesSearch =
      !search ||
      r.rule_code.toLowerCase().includes(q) ||
      (r.rule_number && r.rule_number.toLowerCase().includes(q)) ||
      ruleTitle.includes(q) ||
      ruleDesc.includes(q) ||
      ruleAct.includes(q) ||
      ruleRef.includes(q);

    const matchesSeverity = severityFilter === "ALL" || r.severity === severityFilter;
    const matchesCategory = categoryFilter === "ALL" || r.category === categoryFilter;

    let matchesStatus = true;
    if (statusFilter === "ACTIVE") {
      matchesStatus = isActive;
    } else if (statusFilter === "INACTIVE") {
      matchesStatus = !isActive;
    }

    return matchesSearch && matchesSeverity && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return { label: "RESOLVED", bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
      case "UNDER_REVIEW":
        return { label: "UNDER REVIEW", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
      case "REJECTED":
        return { label: "DISMISSED", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
      default:
        return { label: "PENDING REVIEW", bg: "#fffbeb", color: "#b45309", border: "#fde68a" };
    }
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header Banner */}
        <div className="panel-card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BookOpen size={24} color="#1e3a8a" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a", fontWeight: 700 }}>
                  Rules
                </h1>
              </div>
              <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
                View current Legal Metrology compliance rules. (Read-Only Enforcement Directory)
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                onClick={() => openSendRequestModal()}
                className="btn btn-primary btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" }}
                title="Send a rule suggestion, amendment, or issue report to Directorate Administration"
              >
                <Send size={14} />
                <span>SEND REQUEST</span>
              </button>
              <button
                onClick={() => {
                  fetchRules();
                  fetchMyRequests();
                }}
                className="btn btn-secondary btn-sm"
                title="Refresh latest rules from Supabase"
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? "spin-animate" : ""} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem" }}>
            <button
              onClick={() => setActiveTab("rules")}
              className="btn btn-sm"
              style={{
                backgroundColor: activeTab === "rules" ? "#eff6ff" : "transparent",
                color: activeTab === "rules" ? "#1d4ed8" : "#64748b",
                border: activeTab === "rules" ? "1px solid #bfdbfe" : "none",
                fontWeight: activeTab === "rules" ? 700 : 500,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <Layers size={14} />
              <span>Statutory Rules Catalog ({filteredRules.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("my_requests")}
              className="btn btn-sm"
              style={{
                backgroundColor: activeTab === "my_requests" ? "#eff6ff" : "transparent",
                color: activeTab === "my_requests" ? "#1d4ed8" : "#64748b",
                border: activeTab === "my_requests" ? "1px solid #bfdbfe" : "none",
                fontWeight: activeTab === "my_requests" ? 700 : 500,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              <MessageSquare size={14} />
              <span>My Requests ({myRequests.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: RULES CATALOG */}
        {activeTab === "rules" && (
          <>
            {/* Search & Filter Bar */}
            <div className="panel-card" style={{ padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                <div style={{ flex: "1 1 260px", position: "relative" }}>
                  <Search
                    size={16}
                    color="#94a3b8"
                    style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type="text"
                    placeholder="Search rules, clauses, requirements..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
                    <option value="ALL">ALL RULES</option>
                    <option value="ACTIVE">ACTIVE ONLY</option>
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

            {/* Rule Cards Listing */}
            <div className="panel-card">
              <div className="panel-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="panel-card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield size={18} color="#1e3a8a" />
                  <span>Statutory Compliance Rules ({filteredRules.length})</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                  Active rules are evaluated during package inspections
                </span>
              </div>

              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", gap: "0.75rem" }}>
                  <Loader2 size={32} className="spin-animate" color="#1e3a8a" />
                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Loading compliance rules from Supabase...</span>
                </div>
              ) : filteredRules.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                  <BookOpen size={48} color="#cbd5e1" style={{ margin: "0 auto 1rem", display: "block" }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No rules match the selected criteria.</p>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Adjust search term or category filters.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem" }}>
                  {filteredRules.map((rule) => {
                    const isCritical = rule.severity === "CRITICAL" || rule.severity === "MANDATORY";
                    const isHigh = rule.severity === "HIGH" || rule.severity === "WARNING";
                    const isActive = rule.active ?? rule.is_active ?? true;

                    return (
                      <div
                        key={rule.id}
                        style={{
                          padding: "1.25rem",
                          borderRadius: "10px",
                          border: isActive ? "1px solid #e2e8f0" : "1px dashed #cbd5e1",
                          backgroundColor: isActive ? "#ffffff" : "#f8fafc",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                          opacity: isActive ? 1 : 0.7,
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
                            <strong style={{ fontSize: "1.05rem", color: "#0f172a" }}>
                              {rule.title || rule.rule_name}
                            </strong>
                          </div>

                          {/* Right side status badges & Read-only action */}
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

                            <span
                              style={{
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                padding: "0.2rem 0.55rem",
                                borderRadius: "6px",
                                backgroundColor: isActive ? "#ecfdf5" : "#f1f5f9",
                                color: isActive ? "#047857" : "#64748b",
                                border: `1px solid ${isActive ? "#a7f3d0" : "#cbd5e1"}`,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem"
                              }}
                            >
                              {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                              {isActive ? "ENFORCED" : "DISABLED"}
                            </span>

                            <button
                              onClick={() => setViewingRule(rule)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                              title="View complete statutory details"
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>

                            <button
                              onClick={() => openSendRequestModal(rule)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", color: "#1e3a8a", borderColor: "#bfdbfe", backgroundColor: "#f0f9ff", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                              title="Report issue or suggest change for this specific rule"
                            >
                              <Send size={12} />
                              <span>Request</span>
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
                          <div>
                            <span style={{ fontWeight: 600, color: "#475569" }}>Legal Reference:</span>{" "}
                            <span>{rule.statutory_reference || rule.legal_act || "Legal Metrology Rules, 2011"}</span>
                          </div>
                          {rule.source_document_name && (
                            <div>
                              <span style={{ fontWeight: 600, color: "#475569" }}>Source:</span>{" "}
                              <span style={{ color: "#1e3a8a", fontWeight: 600 }}>{rule.source_document_name}</span>
                              {rule.source_page ? <span> (Page {rule.source_page})</span> : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: MY REQUESTS */}
        {activeTab === "my_requests" && (
          <div className="panel-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a", fontWeight: 700 }}>
                  My Submitted Rule Requests
                </h3>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Track requests submitted to Directorate Administration for rule updates, clarifications, or missing provisions.
                </p>
              </div>
              <button
                onClick={() => openSendRequestModal()}
                className="btn btn-primary btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Send size={13} />
                <span>New Request</span>
              </button>
            </div>

            {loadingRequests ? (
              <div style={{ padding: "2.5rem", textAlign: "center" }}>
                <Loader2 size={24} className="spin-animate" color="#1e3a8a" style={{ margin: "0 auto" }} />
                <span style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem", display: "block" }}>
                  Loading your requests...
                </span>
              </div>
            ) : myRequests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <MessageSquare size={40} color="#cbd5e1" style={{ margin: "0 auto 0.75rem", display: "block" }} />
                <p style={{ margin: 0, fontWeight: 600 }}>You haven't submitted any rule requests yet.</p>
                <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  Click "SEND REQUEST" at the top to suggest rule changes or report unclear statutory requirements.
                </p>
                <button
                  onClick={() => openSendRequestModal()}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: "1rem" }}
                >
                  Send Your First Request
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {myRequests.map((req) => {
                  const badge = getStatusBadge(req.status);
                  return (
                    <div
                      key={req.id}
                      style={{
                        padding: "1.25rem",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.65rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.5rem", backgroundColor: "#f1f5f9", borderRadius: "4px", color: "#334155" }}>
                            {req.request_type}
                          </span>
                          {req.rule_code && (
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.5rem", backgroundColor: "#eff6ff", color: "#1d4ed8", borderRadius: "4px" }}>
                              Rule: {req.rule_code}
                            </span>
                          )}
                          <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{req.subject}</strong>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              padding: "0.2rem 0.55rem",
                              borderRadius: "6px",
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      <p style={{ fontSize: "0.85rem", color: "#334155", margin: 0, lineHeight: 1.5 }}>
                        {req.description}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", color: "#64748b" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock size={12} />
                          Submitted: {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {req.evidence_url && (
                          <a
                            href={req.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2563eb", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
                          >
                            <FileText size={12} />
                            View Attached Evidence
                          </a>
                        )}
                      </div>

                      {/* Admin Response Section if present */}
                      {req.admin_response && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.75rem 1rem",
                            backgroundColor: "#f8fafc",
                            borderRadius: "6px",
                            borderLeft: `4px solid ${req.status === "RESOLVED" ? "#16a34a" : req.status === "REJECTED" ? "#dc2626" : "#2563eb"}`,
                            fontSize: "0.825rem",
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <CheckCircle2 size={14} color={req.status === "RESOLVED" ? "#16a34a" : "#2563eb"} />
                            <span>Directorate Administrator Response:</span>
                          </div>
                          <p style={{ margin: 0, color: "#334155", lineHeight: 1.4 }}>{req.admin_response}</p>
                          {req.reviewed_at && (
                            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "0.35rem" }}>
                              Reviewed on {new Date(req.reviewed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW FULL RULE DETAILS MODAL (READ-ONLY) */}
      {viewingRule && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="panel-card" style={{ maxWidth: "750px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 800, padding: "0.2rem 0.5rem", backgroundColor: "#eff6ff", color: "#1d4ed8", borderRadius: "4px" }}>
                    {viewingRule.rule_code}
                  </span>
                  {viewingRule.rule_number && (
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.45rem", borderRadius: "4px", backgroundColor: "#e0f2fe", color: "#0369a1" }}>
                      Rule {viewingRule.rule_number}
                    </span>
                  )}
                  <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: 800 }}>
                    {viewingRule.title || viewingRule.rule_name}
                  </h2>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem" }}>
                  {viewingRule.legal_act || "Legal Metrology (Packaged Commodities) Rules, 2011"}
                </div>
              </div>
              <button
                onClick={() => setViewingRule(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.35rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.875rem" }}>
              <div>
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "0.3rem" }}>
                  Statutory Requirement:
                </strong>
                <p style={{ margin: 0, backgroundColor: "#f8fafc", padding: "0.85rem", borderRadius: "6px", border: "1px solid #f1f5f9", color: "#334155", lineHeight: 1.5 }}>
                  {viewingRule.requirement || viewingRule.description}
                </p>
              </div>

              {viewingRule.applicability && (
                <div>
                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "0.3rem" }}>
                    Applicability Scope:
                  </strong>
                  <p style={{ margin: 0, backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #f1f5f9", color: "#334155" }}>
                    {viewingRule.applicability}
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Category</span>
                  <strong style={{ color: "#0f172a" }}>{viewingRule.category}</strong>
                </div>
                <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Severity</span>
                  <strong style={{ color: viewingRule.severity === "MANDATORY" ? "#dc2626" : "#d97706" }}>
                    {viewingRule.severity}
                  </strong>
                </div>
                <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Automation Type</span>
                  <strong style={{ color: "#0f172a" }}>{viewingRule.automation_type || "AUTOMATED"}</strong>
                </div>
                <div style={{ padding: "0.75rem", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Status in Scanner</span>
                  <strong style={{ color: (viewingRule.active ?? viewingRule.is_active ?? true) ? "#166534" : "#64748b" }}>
                    {(viewingRule.active ?? viewingRule.is_active ?? true) ? "Active & Enforced" : "Disabled"}
                  </strong>
                </div>
              </div>

              <div>
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "0.3rem" }}>
                  Technical Parameters:
                </strong>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #f1f5f9", fontSize: "0.8rem" }}>
                  <div><strong>Field:</strong> <code>{viewingRule.field_name || "declaration"}</code></div>
                  <div><strong>Condition:</strong> <span>{viewingRule.condition_type}</span></div>
                  <div><strong>Operator:</strong> <span>{viewingRule.operator || "exists"}</span></div>
                  {viewingRule.expected_value && <div><strong>Expected:</strong> <span>{viewingRule.expected_value}</span></div>}
                </div>
              </div>

              {viewingRule.statutory_reference && (
                <div>
                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "0.3rem" }}>
                    Statutory / Clause Reference:
                  </strong>
                  <div style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #f1f5f9", color: "#334155" }}>
                    {viewingRule.statutory_reference}
                  </div>
                </div>
              )}

              {viewingRule.source_document_name && (
                <div>
                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "0.3rem" }}>
                    Source Gazette Document:
                  </strong>
                  <div style={{ backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #f1f5f9", color: "#1e3a8a" }}>
                    {viewingRule.source_document_name} {viewingRule.source_page ? `(Page ${viewingRule.source_page})` : ""}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "1rem", marginTop: "1.25rem" }}>
              <button
                onClick={() => {
                  const r = viewingRule;
                  setViewingRule(null);
                  openSendRequestModal(r);
                }}
                className="btn btn-secondary btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#1e3a8a" }}
              >
                <Send size={13} />
                <span>Submit Request Regarding This Rule</span>
              </button>
              <button
                onClick={() => setViewingRule(null)}
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* "SEND REQUEST" MODAL */}
      {showRequestModal && (
        <div className="modal-backdrop" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: "1rem" }}>
          <div className="panel-card" style={{ maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.85rem", marginBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Send size={20} color="#1e3a8a" />
                  <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a", fontWeight: 700 }}>
                    Submit Rule Request
                  </h3>
                </div>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Send suggestions, reports of outdated requirements, or missing rules to Directorate Administration.
                </p>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: "0.35rem" }}
              >
                <X size={16} />
              </button>
            </div>

            {requestSuccess ? (
              <div style={{ padding: "2rem 1rem", textAlign: "center", color: "#166534" }}>
                <CheckCircle2 size={44} color="#16a34a" style={{ margin: "0 auto 0.75rem", display: "block" }} />
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Request Submitted!</h4>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569" }}>{requestSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {requestError && (
                  <div style={{ padding: "0.75rem", borderRadius: "6px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "0.825rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <AlertCircle size={16} />
                    <span>{requestError}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Request Type *
                  </label>
                  <select
                    value={requestForm.request_type}
                    onChange={(e) => setRequestForm({ ...requestForm, request_type: e.target.value })}
                    className="form-input"
                    style={{ width: "100%", fontSize: "0.85rem" }}
                    required
                  >
                    {REQUEST_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Related Statutory Rule (Optional)
                  </label>
                  <select
                    value={requestForm.rule_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const matchedRule = rules.find((r) => r.id === selectedId);
                      setRequestForm({
                        ...requestForm,
                        rule_id: selectedId,
                        rule_code: matchedRule?.rule_code || "",
                      });
                    }}
                    className="form-input"
                    style={{ width: "100%", fontSize: "0.85rem" }}
                  >
                    <option value="">-- No Specific Rule (General / New Requirement) --</option>
                    {rules.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.rule_code} — {r.title || r.rule_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={requestForm.subject}
                    onChange={(e) => setRequestForm({ ...requestForm, subject: e.target.value })}
                    placeholder="e.g., Mandatory font height requirement clarification"
                    className="form-input"
                    style={{ width: "100%", fontSize: "0.85rem" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Detailed Description / Proposed Change *
                  </label>
                  <textarea
                    rows={4}
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    placeholder="Describe the issue, statutory discrepancy, or proposed amendment..."
                    className="form-input"
                    style={{ width: "100%", fontSize: "0.85rem", resize: "vertical" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>
                    Supporting Evidence / Attachment Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={requestForm.evidence_url}
                    onChange={(e) => setRequestForm({ ...requestForm, evidence_url: e.target.value })}
                    placeholder="https://... or reference document link"
                    className="form-input"
                    style={{ width: "100%", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="btn btn-secondary btn-sm"
                    disabled={submittingRequest}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ display: "flex", alignItems: "center", gap: "0.35rem", backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" }}
                    disabled={submittingRequest}
                  >
                    {submittingRequest ? <Loader2 size={14} className="spin-animate" /> : <Send size={14} />}
                    <span>{submittingRequest ? "Submitting..." : "SEND REQUEST"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
