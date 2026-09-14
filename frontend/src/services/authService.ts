import type { UserProfile } from "../types/platform";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "metriscan_access_token";
const REFRESH_KEY = "metriscan_refresh_token";

let inMemoryUser: UserProfile | null = null;

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setSession(accessToken: string, refreshToken?: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_KEY, refreshToken);
    }
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem("profile");
    localStorage.removeItem("role");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    inMemoryUser = null;
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  },

  async login(username: string, password: string): Promise<{ profile: UserProfile; accessToken: string }> {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.detail || "Invalid username or password");
    }

    if (!data.profile || !data.profile.is_active) {
      throw new Error("This account is inactive. Please contact your system administrator.");
    }

    this.setSession(data.access_token, data.refresh_token);
    inMemoryUser = data.profile;

    return {
      profile: data.profile,
      accessToken: data.access_token,
    };
  },

  async getCurrentUser(forceRefresh = false): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) {
      inMemoryUser = null;
      return null;
    }

    if (inMemoryUser && !forceRefresh) {
      return inMemoryUser;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.clearSession();
        return null;
      }

      const data = await response.json();
      if (!data.profile || !data.profile.is_active) {
        this.clearSession();
        return null;
      }

      inMemoryUser = data.profile;
      return inMemoryUser;
    } catch {
      return inMemoryUser;
    }
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
      } catch {
        // Continue cleanup even if network request fails
      }
    }
    this.clearSession();
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
