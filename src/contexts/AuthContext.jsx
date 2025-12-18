import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [accessiblePaths, setAccessiblePaths] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.isSuperAdmin || false;

  // Check if user can access a path
  const canAccess = useCallback(
    (path) => {
      if (isSuperAdmin) return true;
      if (!path) return false;
      const normalized = path === "/" ? "/" : path.replace(/\/$/, "");
      return accessiblePaths.some(
        (ap) => normalized === ap || normalized.startsWith(ap + "/")
      );
    },
    [accessiblePaths, isSuperAdmin]
  );

  // Get permission for a path
  const getPermission = useCallback(
    (path) => {
      if (isSuperAdmin)
        return {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true
        };
      const normalized = path === "/" ? "/" : path.replace(/\/$/, "");
      const perm = permissions.find((p) => p.path === normalized);
      return (
        perm || {
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false
        }
      );
    },
    [permissions, isSuperAdmin]
  );

  // Load user on mount
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/auth/me");
      if (response.data.success) {
        setUser(response.data.user);
        setPermissions(response.data.permissions || []);
        setAccessiblePaths(response.data.accessiblePaths || []);
      }
    } catch (error) {
      console.error("Failed to load user:", error);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Login
  const login = useCallback(async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    if (response.data.success) {
      localStorage.setItem("token", response.data.token);
      setUser(response.data.user);
      setPermissions(response.data.permissions || []);
      setAccessiblePaths(response.data.accessiblePaths || []);
      return response.data;
    }
    throw new Error(response.data.error || "Login failed");
  }, []);

  // Logout
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setPermissions([]);
    setAccessiblePaths([]);
  }, []);

  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.data.success) {
        setPermissions(response.data.permissions || []);
        setAccessiblePaths(response.data.accessiblePaths || []);
      }
    } catch (error) {
      console.error("Failed to refresh permissions:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        accessiblePaths,
        loading,
        isSuperAdmin,
        canAccess,
        getPermission,
        login,
        logout,
        refreshPermissions
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
