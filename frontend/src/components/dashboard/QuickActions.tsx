import { useNavigate } from "react-router-dom";
import { Camera, Upload, History, Zap } from "lucide-react";

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="panel-card">
      <div className="panel-card-header" style={{ marginBottom: "0.85rem" }}>
        <div className="panel-card-title">
          <Zap size={18} color="#2563eb" />
          <span>Quick Actions</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.85rem" }}>
        <button
          onClick={() => navigate("/scanner", { state: { mode: "camera" } })}
          className="btn btn-primary"
          style={{ flexDirection: "column", padding: "1.1rem 0.75rem", gap: "0.5rem" }}
        >
          <Camera size={22} />
          <span>Scan via Camera</span>
        </button>

        <button
          onClick={() => navigate("/scanner", { state: { mode: "upload" } })}
          className="btn btn-blue"
          style={{ flexDirection: "column", padding: "1.1rem 0.75rem", gap: "0.5rem" }}
        >
          <Upload size={22} />
          <span>Upload Package Image</span>
        </button>

        <button
          onClick={() => navigate("/history")}
          className="btn btn-secondary"
          style={{ flexDirection: "column", padding: "1.1rem 0.75rem", gap: "0.5rem" }}
        >
          <History size={22} />
          <span>View Inspection History</span>
        </button>
      </div>
    </div>
  );
}
