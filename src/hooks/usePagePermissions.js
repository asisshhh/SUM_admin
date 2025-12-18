import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Hook to get permissions for the current page
 * @returns {Object} Permission object with canView, canCreate, canEdit, canDelete
 */
export const usePagePermissions = () => {
  const location = useLocation();
  const { getPermission } = useAuth();

  // Get current path
  const currentPath = location.pathname;

  // Get permissions for current path
  const permission = getPermission(currentPath);

  return permission;
};

export default usePagePermissions;
