import { useNavigate } from "react-router-dom";
import { History, Eye, ArrowRight } from "lucide-react";
import type { ScanHistoryItem } from "../../types/history";

interface RecentScansProps {
  scans: ScanHistoryItem[];
}

export function RecentScans({ scans }: RecentScansProps) {
  const navigate = useNavigate();
  const recent = scans.slice(0, 5);

  const getStatusBadge = (status: string) => {
    const s = String(status).toUpperCase();
    if (s === "PASS") return <span className="badge badge-pass">✓ PASS</span>;
    if (s === "FAIL") return <span className="badge badge-fail">✕ FAIL</span>;
    return <span className="badge badge-review">⚠ REVIEW</span>;
  };

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <div className="panel-card-title">
          <History size={18} color="#2563eb" />
          <span>Recent Commodity Scans</span>
        </div>
        <button
          onClick={() => navigate("/history")}
          className="btn btn-secondary btn-sm"
          style={{ gap: "0.3rem" }}
        >
          <span>View All Scans</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {recent.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
          No scan records found. Perform a product scan to begin.
        </div>
      ) : (
        <div className="table-container">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Scan Date</th>
                <th>Score</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((scan) => (
                <tr key={scan.id}>
                  <td style={{ fontWeight: 600 }}>{scan.productName}</td>
                  <td style={{ color: "#64748b" }}>{scan.category}</td>
                  <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {new Date(scan.timestamp).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td style={{ fontWeight: 700, color: "#0f172a" }}>{scan.score}%</td>
                  <td>{getStatusBadge(scan.status)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => navigate(`/history/${scan.id}`)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: "0.25rem 0.6rem" }}
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
