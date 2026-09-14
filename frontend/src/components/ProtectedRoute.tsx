import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { authService } from "../services/authService";
import { consumerService, type ConsumerUser } from "../services/consumerService";
import type { UserProfile } from "../types/platform";
import { Shield, Loader2, UserCheck } from "lucide-react";

interface ProtectedRouteProps {
  allowedRole?: "admin" | "inspector" | "consumer";
}

export default function ProtectedRoute({ allowedRole }: ProtectedRouteProps) {
  const [officerUser, setOfficerUser] = useState<UserProfile | null>(null);
  const [consumerUser, setConsumerUser] = useState<ConsumerUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        if (allowedRole === "consumer") {
          const user = await consumerService.getCurrentUser();
          if (isMounted) {
            setConsumerUser(user);
            setLoading(false);
          }
        } else {
          const currentUser = await authService.getCurrentUser();
          if (isMounted) {
            setOfficerUser(currentUser);
            setLoading(false);
          }
        }
      } catch {
        if (isMounted) {
          setOfficerUser(null);
          setConsumerUser(null);
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [allowedRole]);

  if (loading) {
    const isCitizen = allowedRole === "consumer";
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "12px",
            backgroundColor: isCitizen ? "#047857" : "#1e293b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
          }}
        >
          {isCitizen ? <UserCheck size={28} /> : <Shield size={28} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#475569", fontSize: "0.9rem", fontWeight: 600 }}>
          <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} />
          <span>{isCitizen ? "Verifying Citizen Portal session..." : "Verifying enforcement credentials..."}</span>
        </div>
      </div>
    );
  }

  // Consumer path
  if (allowedRole === "consumer") {
    if (!consumerUser) {
      consumerService.clearSession();
      return <Navigate to="/user/login" replace />;
    }
    return <Outlet />;
  }

  // Officer / Admin path
  if (!officerUser || !officerUser.is_active) {
    authService.clearSession();
    return <Navigate to="/login" replace />;
  }

  // Role protection check
  if (allowedRole && officerUser.role?.toLowerCase() !== allowedRole.toLowerCase()) {
    if (officerUser.role?.toLowerCase() === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (officerUser.role?.toLowerCase() === "inspector") {
      return <Navigate to="/inspector" replace />;
    }
    authService.clearSession();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}