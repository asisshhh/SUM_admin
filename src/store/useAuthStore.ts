import { create } from "zustand";
import api from "../api/axios";

interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "staff" | "lab_tech";
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post<{ token: string; user: User }>("/login", { email, password });
      localStorage.setItem("token", res.data.token);
      set({ user: res.data.user, token: res.data.token });
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message || "Login failed");
      }
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
}));
