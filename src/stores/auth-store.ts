import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiClient } from "@/lib/api-client";
import { setClientCookie, removeClientCookie } from "@/lib/cookies";
import { registerAuthSessionInvalidationHandler } from "@/lib/auth-session";

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "CUSTOMER" | "STAFF" | "ADMIN";
  loyaltyPoints: number;
  isActive?: boolean;
  pets?: Array<{
    id: string;
    name: string;
    species: "DOG" | "CAT";
    breed: string;
    weightKg: number;
    avatarUrl?: string | null;
  }>;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  googleLogin: (payload: { idToken: string; providerAccountId: string; email: string; name: string; avatarUrl?: string }) => Promise<AuthUser>;
  sendEmailOtp: (email: string) => Promise<{ message: string; email: string; developmentOtpCode?: string }>;
  loginWithEmailOtp: (email: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<AuthUser | null>;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,



      sendEmailOtp: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiClient.post<{ message: string; email: string; developmentOtpCode?: string }>("/auth/email-otp/send", { email });
          set({ isLoading: false });
          return res;
        } catch (err: any) {
          const errorMsg = err.message || "Gửi mã OTP qua email thất bại.";
          set({ isLoading: false, error: errorMsg });
          throw err;
        }
      },

      loginWithEmailOtp: async (email: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiClient.post<{
            message: string;
            user: AuthUser;
            tokens: { accessToken: string; refreshToken: string };
          }>("/auth/email-otp/login", { email, code });

          const { user, tokens } = res;
          if (typeof window !== "undefined") {
            localStorage.setItem("petcare_token", tokens.accessToken);
            localStorage.setItem("petcare_refresh_token", tokens.refreshToken);
            localStorage.setItem("petcare_user", JSON.stringify(user));
            setClientCookie("petcare_token", tokens.accessToken);
            setClientCookie("petcare_role", user.role);
          }

          set({
            user,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return user;
        } catch (err: any) {
          const errorMsg = err.message || "Đăng nhập bằng mã OTP thất bại.";
          set({ isLoading: false, error: errorMsg });
          throw err;
        }
      },



      googleLogin: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiClient.post<{
            user: AuthUser;
            tokens: { accessToken: string; refreshToken: string };
          }>("/auth/oauth/google", payload);

          const { user, tokens } = res;

          if (typeof window !== "undefined") {
            localStorage.setItem("petcare_token", tokens.accessToken);
            localStorage.setItem("petcare_refresh_token", tokens.refreshToken);
            localStorage.setItem("petcare_user", JSON.stringify(user));
            setClientCookie("petcare_token", tokens.accessToken);
            setClientCookie("petcare_role", user.role);
          }

          set({
            user,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return user;
        } catch (err: any) {
          const errorMsg =
            err.message || "Đăng nhập Google không thành công. Vui lòng thử lại.";
          set({ isLoading: false, error: errorMsg });
          throw err;
        }
      },

      logout: async () => {
        try {
          const token = get().token;
          if (token) {
            await apiClient.post("/auth/logout").catch(() => {});
          }
        } finally {
          if (typeof window !== "undefined") {
            localStorage.removeItem("petcare_token");
            localStorage.removeItem("petcare_refresh_token");
            localStorage.removeItem("petcare_user");
            removeClientCookie("petcare_token");
            removeClientCookie("petcare_role");
          }
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      fetchProfile: async () => {
        const token = get().token;
        if (!token) return null;

        try {
          const user = await apiClient.get<AuthUser>("/users/me");
          set({ user, isAuthenticated: true });
          if (typeof window !== "undefined") {
            localStorage.setItem("petcare_user", JSON.stringify(user));
            setClientCookie("petcare_role", user.role);
          }
          return user;
        } catch {
          // Token expired or invalid
          await get().logout();
          return null;
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "petcare_auth_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window !== "undefined" && state) {
          if (state.token && state.isAuthenticated) {
            setClientCookie("petcare_token", state.token);
            if (state.user?.role) {
              setClientCookie("petcare_role", state.user.role);
            }
          }
        }
      },
    }
  )
);

registerAuthSessionInvalidationHandler(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
});
