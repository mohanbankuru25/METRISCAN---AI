import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { historyService } from "../services/historyService";
import type { ScanHistoryItem, ScanFilterOptions } from "../types/history";
import { History as HistoryIcon, Search, Filter, Eye, Trash2, ArrowUpDown, Plus } from "lucide-react";

export function History() {
  const navigate = useNavigate();

  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [filters, setFilters] = useState<ScanFilterOptions>({
    searchQuery: "",
    statusFilter: "ALL",
    categoryFilter: "ALL",
    sortBy: "newest",
  });

  const loadData = () => {
    const filtered = historyService.filterScans(filters);
    setScans(filtered);
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this scan record?")) {
      historyService.deleteScan(id);
      loadData();
    }
  };

  const getStatusBadge = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === "PASS") return <span className="badge badge-pass">✓ PASS</span>;
    if (s === "FAIL") return <span className="badge badge-fail">✕ FAIL</span>;
    return <span className="badge badge-review">⚠ REVIEW</span>;
  };

  return (
    <PageContainer>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Header */}
        <div className="panel-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <HistoryIcon size={24} color="#2563eb" />
                <h1 style={{ fontSize: "1.5rem", margin: 0, color: "#0f172a" }}>Inspection History</h1>
              </div>
              <p style={{ margin: "0.25rem 0 0", color: "#64748b" }}>
                Archive of analyzed packaged commodity declarations under Legal Metrology Rules, 2011.
              </p>
            </div>

            <button onClick={() => navigate("/scanner")} className="btn btn-blue">
              <Plus size={16} />
              <span>Scan New Product</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="panel-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem" }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Search product name, category..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem 0.55rem 2.25rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-sans)",
                  outline: "none"
                }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Filter size={15} color="#64748b" />
              <select
                value={filters.categoryFilter}
                onChange={(e) => setFilters({ ...filters, categoryFilter: e.target.value })}
                style={{
                  flex: 1,
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-sans)",
                  backgroundColor: "#ffffff"
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="Packaged Food">Packaged Food</option>
                <option value="Cosmetics">Cosmetics</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <ArrowUpDown size={15} color="#64748b" />
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as ScanFilterOptions["sortBy"] })}
                style={{
                  flex: 1,
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-sans)",
                  backgroundColor: "#ffffff"
                }}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="highest_score">Sort: Highest Score</option>
                <option value="lowest_score">Sort: Lowest Score</option>
              </select>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
            {["ALL", "PASS", "REVIEW", "FAIL"].map((st) => (
              <button
                key={st}
                onClick={() => setFilters({ ...filters, statusFilter: st })}
                className="btn btn-sm"
                style={{
                  backgroundColor: filters.statusFilter === st ? "#0f172a" : "#f1f5f9",
                  color: filters.statusFilter === st ? "#ffffff" : "#475569",
                  borderRadius: "9999px",
                  padding: "0.25rem 0.75rem",
                  border: "none"
                }}
              >
                {st === "ALL" ? "All Statuses" : st}
              </button>
            ))}
          </div>
        </div>

        {/* History Table */}
        <div className="panel-card">
          {scans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
              <HistoryIcon size={36} color="#cbd5e1" style={{ marginBottom: "0.75rem" }} />
              <h3 style={{ fontSize: "1.1rem", color: "#334155" }}>No Scan Records Found</h3>
              <p style={{ margin: "0.25rem 0 1.25rem", fontSize: "0.875rem" }}>
                Try adjusting your search query or filters.
              </p>
              <button onClick={() => setFilters({ searchQuery: "", statusFilter: "ALL", categoryFilter: "ALL", sortBy: "newest" })} className="btn btn-secondary btn-sm">
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Scan Date & Time</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr
                      key={scan.id}
                      onClick={() => navigate(`/history/${scan.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>{scan.productName}</td>
                      <td style={{ color: "#64748b" }}>{scan.category}</td>
                      <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        {new Date(scan.timestamp).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td style={{ fontWeight: 800, color: "#0f172a" }}>{scan.score}%</td>
                      <td>{getStatusBadge(scan.status)}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/history/${scan.id}`); }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "0.25rem 0.5rem" }}
                          >
                            <Eye size={13} />
                            <span>View Report</span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(scan.id, e)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: "0.25rem 0.5rem" }}
                            title="Delete scan"
                          >
                            <Trash2 size={13} />
                          </button>
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
    </PageContainer>
  );
}
