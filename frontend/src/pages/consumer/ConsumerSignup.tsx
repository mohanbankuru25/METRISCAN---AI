import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, UserPlus, Mail, User, Phone, Lock, AlertCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { consumerService } from "../../services/consumerService";
import { useLanguage } from "../../i18n/LanguageContext";
import { LanguageSelector } from "../../components/common/LanguageSelector";

export default function ConsumerSignup() {
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.full_name.trim() || !formData.username.trim() || !formData.email.trim() || !formData.password) {
      setError(t("common.error", "Please complete all required fields."));
      return;
    }

    if (formData.password.length < 6) {
      setError(t("common.error", "Password must be at least 6 characters long."));
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError(t("common.error", "Passwords do not match."));
      return;
    }

    try {
      setLoading(true);
      await consumerService.signup({
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        password: formData.password,
      });
      navigate("/user", { replace: true });
    } catch (err: any) {
      setError(err.message || t("common.error", "Failed to create citizen account. Please check your details."));
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
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>{t("nav.citizenBadge", "Citizen")} {t("auth.signUpTitle", "Registration")}</div>
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LanguageSelector variant="compact" />

            <Link
              to="/user/login"
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
              <span>{t("auth.citizenSignInBtn", "Existing Login")}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Registration Container */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div
          style={{
            maxWidth: "480px",
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
              <UserPlus size={28} color="#a7f3d0" />
            </div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>{t("auth.signUpTitle", "Create Free Citizen Account")}</h1>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#d1fae5" }}>
              {t("landing.citizenDivision", "Join the consumer empowerment initiative for packaged commodity safety")}
            </p>
          </div>

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

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  {t("auth.fullNameLabel", "Full Name")} *
                </label>
                <div style={{ position: "relative" }}>
                  <User size={17} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    required
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem 0.6rem 2.4rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    {t("auth.usernameLabel", "Username")} *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                    placeholder="e.g. ramesh_s"
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
                    {t("auth.phoneLabel", "Mobile Number")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Phone size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+91 98765..."
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.85rem 0.6rem 2.1rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  {t("auth.emailLabel", "Email Address")} *
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={17} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="ramesh@example.com"
                    required
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem 0.6rem 2.4rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.88rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    {t("auth.passwordLabel", "Password")} *
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      placeholder="Min 6 chars"
                      required
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.85rem 0.6rem 2.1rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                    {t("auth.confirmPasswordLabel", "Confirm Password")} *
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                      type="password"
                      value={formData.confirm_password}
                      onChange={(e) => handleChange("confirm_password", e.target.value)}
                      placeholder="Repeat password"
                      required
                      style={{
                        width: "100%",
                        padding: "0.6rem 0.85rem 0.6rem 2.1rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.88rem",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "0.75rem",
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
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                    <span>{t("auth.registering", "Registering Account...")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("auth.registerBtn", "Complete Registration")}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: "1.25rem", textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                {t("auth.hasAccount", "Already registered?")}{" "}
                <Link to="/user/login" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>
                  {t("auth.citizenSignInBtn", "Sign in here")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
