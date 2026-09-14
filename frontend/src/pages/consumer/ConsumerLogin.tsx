import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, UserCheck, Lock, AlertCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { consumerService } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";
import { LanguageSelector } from "../../components/common/LanguageSelector";

export default function ConsumerLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(t("common.error", "Please enter your username/email and password."));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await consumerService.login(username.trim(), password);
      navigate("/user", { replace: true });
    } catch (err: any) {
      setError(err.message || t("common.error", "Invalid credentials. Please verify your details."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
      {/* Tricolor Bar */}
      <div style={{ height: "4px", background: "linear-gradient(90deg, #ff9933 33.3%, #ffffff 33.3%, #ffffff 66.6%, #138808 66.6%)" }} />

      {/* Top Header */}
      <header style={{ borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff", padding: "0.85rem 1.5rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "linear-gradient(135deg, #059669, #0d9488)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>METRISCAN</div>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>{t("nav.citizenBadge", "Citizen")} {t("nav.citizenPortal", "Consumer Portal")}</div>
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LanguageSelector variant="compact" />

            <Link
              to="/login"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.8rem",
                color: "#475569",
                textDecoration: "none",
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={14} />
              <span>{t("nav.officerLogin", "Official Officer Portal")}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.07), 0 8px 10px -6px rgba(0,0,0,0.04)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          {/* Header Banner */}
          <div style={{ background: "linear-gradient(135deg, #065f46, #047857)", padding: "1.75rem", color: "#ffffff", textAlign: "center" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.15)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>
              <UserCheck size={28} color="#a7f3d0" />
            </div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>{t("auth.citizenLoginTitle", "Citizen Login")}</h1>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#d1fae5" }}>
              {t("auth.citizenSubtitle", "Verify packaged products, check allergens & report violations")}
            </p>
          </div>

          {/* Form Body */}
          <div style={{ padding: "1.75rem" }}>
            {error && (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>
                  {t("auth.citizenUsernameLabel", "Username or Registered Email")}
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                    <UserCheck size={18} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username or email"
                    required
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem 0.65rem 2.5rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.4rem" }}>
                  {t("auth.passwordLabel", "Password")}
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem 0.65rem 2.5rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.9rem",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 2px 8px rgba(5,150,105,0.35)",
                  transition: "background-color 0.15s",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                    <span>{t("auth.signingIn", "Signing In...")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("auth.citizenSignInBtn", "Enter Citizen Portal")}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Link to Signup */}
            <div style={{ marginTop: "1.5rem", textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                {t("auth.noAccount", "Don't have a citizen account?")}{" "}
                <Link to="/user/signup" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>
                  {t("auth.createAccount", "Create Free Account")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
