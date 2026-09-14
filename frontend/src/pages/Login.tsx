import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { Scale, Lock, User, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { LanguageSelector } from "../components/common/LanguageSelector";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setError(t("common.error", "Please enter your designated officer username."));
      return;
    }

    if (!password) {
      setError(t("common.error", "Please enter your password."));
      return;
    }

    setLoading(true);

    try {
      const { profile } = await authService.login(trimmedUsername, password);

      if (profile.role.toLowerCase() === "admin") {
        navigate("/admin");
      } else if (profile.role.toLowerCase() === "inspector") {
        navigate("/inspector");
      } else {
        setError(t("common.error", "Role authorization pending. Contact system administrator."));
      }
    } catch (err: any) {
      setError(err?.message || t("common.error", "Invalid credentials or unable to reach authorization service."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        {/* Return link & Language Selector */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <button
            onClick={() => navigate("/")}
            className="login-back-btn"
            type="button"
          >
            <ArrowLeft size={14} />
            <span>{t("auth.portalHome", "Portal Home")}</span>
          </button>
          <LanguageSelector variant="compact" />
        </div>

        {/* Brand Header */}
        <div className="login-header">
          <div className="login-emblem">
            <Scale size={28} />
          </div>
          <h1 className="login-title">{t("auth.officerLoginTitle", "METRISCAN Enforcement Portal")}</h1>
          <p className="login-subtitle">{t("auth.officerSubtitle", "Legal Metrology / Packaged Commodities")}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-error-box">
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="username">{t("auth.usernameLabel", "Officer Username")}</label>
            <div className="input-icon-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("auth.usernamePlaceholder", "e.g. admin or ravi.ins")}
                autoComplete="username"
                autoFocus
                disabled={loading}
                required
              />
            </div>
            <span className="input-hint">
              <code>admin</code>, <code>username.admin</code> or <code>username.ins</code>
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("auth.passwordLabel", "Security Password")}</label>
            <div className="input-icon-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder", "Enter password")}
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin-animate" />
                <span>{t("auth.signingIn", "Signing In...")}</span>
              </>
            ) : (
              <span>{t("auth.signInBtn", "Sign In")}</span>
            )}
          </button>
        </form>

        {/* Authentication Notice */}
        <div className="login-security-notice">
          <span>{t("landing.ministryBadge", "Authorized Government Personnel Only • Statutory Audit Enforced")}</span>
        </div>
      </div>
    </div>
  );
}