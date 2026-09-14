import { useState, useEffect, type FormEvent } from "react";
import { User, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Save } from "lucide-react";
import { consumerService, type ConsumerUser } from "../../services/consumerService";

export default function ConsumerProfile() {
  const [user, setUser] = useState<ConsumerUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    consumerService.getCurrentUser().then((u) => {
      if (isMounted && u) {
        setUser(u);
        setFullName(u.full_name || "");
        setPhone(u.phone || "");
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const updated = await consumerService.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      setUser(updated);
      setSuccess("Your citizen profile details have been successfully updated.");
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#64748b" }}>
        <Loader2 size={20} className="spin" style={{ animation: "spin 1s linear infinite" }} />
        <span>Loading account profile...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>Citizen Profile</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
          Manage your personal information and contact preferences for MetriScan citizen updates
        </p>
      </div>

      {success && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", color: "#166534", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", color: "#991b1b", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Card */}
      <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* User Summary Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", paddingBottom: "1.5rem", borderBottom: "1px solid #f1f5f9", marginBottom: "1.5rem" }}>
          <div style={{ width: "54px", height: "54px", borderRadius: "14px", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={28} />
          </div>
          <div>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>{user?.full_name}</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>@{user?.username}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.3rem", backgroundColor: "#ecfdf5", color: "#059669", padding: "0.3rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>
            <ShieldCheck size={14} />
            <span>Verified Citizen</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
              Registered Email (Immutable)
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                color: "#64748b",
                fontSize: "0.88rem",
                boxSizing: "border-box",
                cursor: "not-allowed",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
              Mobile Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765..."
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.65rem 1.25rem",
                borderRadius: "8px",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: "0.88rem",
                fontWeight: 700,
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(5,150,105,0.3)",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
