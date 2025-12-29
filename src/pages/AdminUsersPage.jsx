import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePagePermissions } from "../hooks/usePagePermissions";
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import { Pagination, SearchableDropdown } from "../components/shared";
import { toast } from "react-toastify";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Role badge component
const RoleBadge = ({ role }) => {
  const styles = {
    ADMIN: "bg-purple-100 text-purple-700 border-purple-200",
    DOCTOR: "bg-blue-100 text-blue-700 border-blue-200",
    RECEPTIONIST: "bg-yellow-100 text-yellow-700 border-yellow-200",
    DEPARTMENT_HEAD: "bg-orange-100 text-orange-700 border-orange-200",
    NURSE: "bg-pink-100 text-pink-700 border-pink-200",
    HOME_HEALTHCARE_SPECIALIST: "bg-green-100 text-green-700 border-green-200"
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        styles[role] || "bg-gray-100 text-gray-700"
      }`}>
      <Shield size={12} />
      {role?.replace(/_/g, " ")}
    </span>
  );
};

// Create/Edit User Modal
const UserModal = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    password: "",
    confirmPassword: "",
    role: user?.role || "ADMIN",
    departmentId: user?.doctorProfile?.departmentId || ""
  });
  // Password change fields for edit mode
  const [passwordChange, setPasswordChange] = useState({
    newPassword: "",
    confirmNewPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [enablePasswordChange, setEnablePasswordChange] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!user;

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        password: "",
        confirmPassword: "",
        role: user.role || "ADMIN",
        departmentId: user.doctorProfile?.departmentId || ""
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "ADMIN",
        departmentId: ""
      });
    }
    // Always reset password fields for security
    setPasswordChange({
      newPassword: "",
      confirmNewPassword: ""
    });
    setEnablePasswordChange(false);
    setErrors({});
    // Reset all password visibility toggles
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  }, [user?.id]); // Reset when user ID changes

  // Fetch departments for doctor role
  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const response = await api.get("/departments", {
        params: { active: true }
      });
      return response.data;
    },
    enabled: formData.role === "DOCTOR"
  });

  const departments = departmentsData?.items || [];

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/users", data),
    onSuccess: () => {
      toast.success("User created successfully");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to create user");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/users/${user.id}/assign-role`, data),
    onSuccess: () => {
      toast.success("User role updated successfully");
      onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update user");
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.put(`/users/${user.id}/change-password`, data),
    onSuccess: () => {
      toast.success("Password changed successfully");
      // Reset password change fields
      setPasswordChange({
        newPassword: "",
        confirmNewPassword: ""
      });
      setEnablePasswordChange(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to change password.");
    }
  });

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";

    // Password validation for create mode
    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    // Password change validation for edit mode
    if (isEdit && enablePasswordChange) {
      if (!passwordChange.newPassword) {
        newErrors.newPassword = "New password is required";
      } else if (passwordChange.newPassword.length < 6) {
        newErrors.newPassword = "Password must be at least 6 characters";
      }

      if (!passwordChange.confirmNewPassword) {
        newErrors.confirmNewPassword = "Please confirm your new password";
      } else if (
        passwordChange.newPassword !== passwordChange.confirmNewPassword
      ) {
        newErrors.confirmNewPassword = "New passwords do not match";
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    // Validate department for doctors
    if (formData.role === "DOCTOR" && !formData.departmentId) {
      newErrors.departmentId = "Department is required for doctors";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (isEdit) {
      // If password change is enabled, change password first, then update role
      if (
        enablePasswordChange &&
        passwordChange.newPassword &&
        passwordChange.confirmNewPassword
      ) {
        changePasswordMutation.mutate(
          {
            newPassword: passwordChange.newPassword
          },
          {
            onSuccess: () => {
              // After password change succeeds, update role
              updateMutation.mutate(
                { role: formData.role },
                {
                  onSuccess: () => {
                    onSuccess();
                    onClose();
                  }
                }
              );
            }
          }
        );
      } else {
        // Just update role if password change is not enabled
        updateMutation.mutate({ role: formData.role });
      }
    } else {
      // Prepare data for creation, converting departmentId to number if present
      const createData = {
        ...formData,
        departmentId: formData.departmentId
          ? parseInt(formData.departmentId)
          : undefined
      };
      // Remove confirmPassword and departmentId if role is not DOCTOR
      delete createData.confirmPassword;
      if (createData.role !== "DOCTOR") {
        delete createData.departmentId;
      }
      createMutation.mutate(createData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = { ...formData, [name]: value };

    // Reset departmentId if role changes away from DOCTOR
    if (name === "role" && value !== "DOCTOR") {
      updatedFormData.departmentId = "";
    }

    setFormData(updatedFormData);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Clear confirm password error when password changes
    if (name === "password" && errors.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordChange((prev) => ({ ...prev, [name]: value }));

    // Clear errors when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Clear confirm password error when new password changes
    if (name === "newPassword" && errors.confirmNewPassword) {
      setErrors((prev) => ({ ...prev, confirmNewPassword: undefined }));
    }
  };

  const handleTogglePasswordChange = () => {
    setEnablePasswordChange(!enablePasswordChange);
    // Reset password change fields when toggling off
    if (enablePasswordChange) {
      setPasswordChange({
        newPassword: "",
        confirmNewPassword: ""
      });
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.newPassword;
        delete newErrors.confirmNewPassword;
        return newErrors;
      });
    }
  };

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    changePasswordMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md my-auto overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] min-h-0">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 flex-shrink-0">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white pr-2">
            {isEdit ? "Edit User Role" : "Create Staff User"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-1 hover:bg-white/20 rounded-lg transition flex-shrink-0 touch-manipulation"
            aria-label="Close modal">
            <X size={18} className="sm:w-5 sm:h-5 text-white" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto flex-1 min-h-0">
          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-6 space-y-4"
            noValidate>
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isEdit}
                className={`w-full px-4 py-2.5 text-base border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-slate-300"
                } ${isEdit ? "bg-slate-100" : ""}`}
                placeholder="Enter full name"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isEdit}
                className={`w-full px-4 py-2.5 text-base border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.phone ? "border-red-500" : "border-slate-300"
                } ${isEdit ? "bg-slate-100" : ""}`}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isEdit}
                className={`w-full px-4 py-2.5 text-base border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.email ? "border-red-500" : "border-slate-300"
                } ${isEdit ? "bg-slate-100" : ""}`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password (only for new users) */}
            {!isEdit && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 pr-10 text-base border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        errors.password ? "border-red-500" : "border-slate-300"
                      }`}
                      placeholder="Enter password (min 6 characters)"
                      aria-label="Password"
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password ? "password-error" : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 touch-manipulation"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }>
                      {showPassword ? (
                        <EyeOff
                          size={18}
                          className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                        />
                      ) : (
                        <Eye
                          size={18}
                          className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                        />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="password-error"
                      className="text-red-500 text-xs mt-1"
                      role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 pr-10 text-base border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        errors.confirmPassword
                          ? "border-red-500"
                          : "border-slate-300"
                      }`}
                      placeholder="Confirm your password"
                      aria-label="Confirm Password"
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={
                        errors.confirmPassword
                          ? "confirm-password-error"
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 touch-manipulation"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }>
                      {showConfirmPassword ? (
                        <EyeOff
                          size={18}
                          className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                        />
                      ) : (
                        <Eye
                          size={18}
                          className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                        />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p
                      id="confirm-password-error"
                      className="text-red-500 text-xs mt-1"
                      role="alert">
                      {errors.confirmPassword}
                    </p>
                  )}
                  {!errors.confirmPassword &&
                    formData.password &&
                    formData.confirmPassword &&
                    formData.password === formData.confirmPassword && (
                      <p className="text-green-600 text-xs mt-1">
                        ✓ Passwords match
                      </p>
                    )}
                </div>
              </>
            )}

            {/* Role */}
            <div>
              <SearchableDropdown
                label="Role *"
                value={formData.role || ""}
                options={[
                  { value: "ADMIN", label: "Admin" },
                  { value: "DOCTOR", label: "Doctor" },
                  { value: "RECEPTIONIST", label: "Receptionist" },
                  { value: "DEPARTMENT_HEAD", label: "Department Head" },
                  { value: "NURSE", label: "Nurse" },
                  {
                    value: "HOME_HEALTHCARE_SPECIALIST",
                    label: "Home Healthcare Specialist"
                  }
                ]}
                onChange={(value) =>
                  handleChange({ target: { name: "role", value } })
                }
                placeholder="Select Role"
                className=""
              />
              <p className="text-xs text-slate-500 mt-1">
                Staff users can access the admin portal based on their role
              </p>
            </div>

            {/* Department (only for doctors) */}
            {formData.role === "DOCTOR" && (
              <div>
                <SearchableDropdown
                  label="Department *"
                  value={formData.departmentId || ""}
                  options={[
                    { value: "", label: "Select Department" },
                    ...departments.map((dept) => ({
                      value: String(dept.id),
                      label: dept.name
                    }))
                  ]}
                  onChange={(value) =>
                    handleChange({ target: { name: "departmentId", value } })
                  }
                  placeholder="Select Department"
                  disabled={isEdit}
                  className={errors.departmentId ? "border-red-500" : ""}
                />
                {errors.departmentId && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.departmentId}
                  </p>
                )}
                {departments.length === 0 && !isEdit && (
                  <p className="text-xs text-amber-600 mt-1">
                    No departments available. Please create departments first.
                  </p>
                )}
              </div>
            )}

            {/* Password Change Section (only for edit mode) */}
            {isEdit && (
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Change Password
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Update user's password securely
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={enablePasswordChange}
                      onChange={handleTogglePasswordChange}
                      className="sr-only peer"
                      aria-label="Enable password change"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {enablePasswordChange && (
                  <div className="space-y-4 bg-slate-50 p-3 sm:p-4 rounded-lg">
                    {/* New Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="newPassword"
                          value={passwordChange.newPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-2.5 pr-10 text-base border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            errors.newPassword
                              ? "border-red-500"
                              : "border-slate-300"
                          }`}
                          placeholder="Enter new password (min 6 characters)"
                          aria-label="New Password"
                          aria-invalid={!!errors.newPassword}
                          aria-describedby={
                            errors.newPassword
                              ? "new-password-error"
                              : undefined
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 touch-manipulation"
                          aria-label={
                            showNewPassword ? "Hide password" : "Show password"
                          }>
                          {showNewPassword ? (
                            <EyeOff
                              size={18}
                              className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                            />
                          ) : (
                            <Eye
                              size={18}
                              className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                            />
                          )}
                        </button>
                      </div>
                      {errors.newPassword && (
                        <p
                          id="new-password-error"
                          className="text-red-500 text-xs mt-1"
                          role="alert">
                          {errors.newPassword}
                        </p>
                      )}
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Confirm New Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? "text" : "password"}
                          name="confirmNewPassword"
                          value={passwordChange.confirmNewPassword}
                          onChange={handlePasswordChange}
                          className={`w-full px-4 py-2.5 pr-10 text-base border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            errors.confirmNewPassword
                              ? "border-red-500"
                              : "border-slate-300"
                          }`}
                          placeholder="Confirm your new password"
                          aria-label="Confirm New Password"
                          aria-invalid={!!errors.confirmNewPassword}
                          aria-describedby={
                            errors.confirmNewPassword
                              ? "confirm-new-password-error"
                              : undefined
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmNewPassword(!showConfirmNewPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 touch-manipulation"
                          aria-label={
                            showConfirmNewPassword
                              ? "Hide password"
                              : "Show password"
                          }>
                          {showConfirmNewPassword ? (
                            <EyeOff
                              size={18}
                              className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                            />
                          ) : (
                            <Eye
                              size={18}
                              className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                            />
                          )}
                        </button>
                      </div>
                      {errors.confirmNewPassword && (
                        <p
                          id="confirm-new-password-error"
                          className="text-red-500 text-xs mt-1"
                          role="alert">
                          {errors.confirmNewPassword}
                        </p>
                      )}
                      {!errors.confirmNewPassword &&
                        passwordChange.newPassword &&
                        passwordChange.confirmNewPassword &&
                        passwordChange.newPassword ===
                          passwordChange.confirmNewPassword && (
                          <p className="text-green-600 text-xs mt-1">
                            ✓ New passwords match
                          </p>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition text-sm sm:text-base">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="hidden sm:inline">
                      {isEdit
                        ? enablePasswordChange && passwordChange.newPassword
                          ? "Updating..."
                          : "Updating Role..."
                        : "Creating..."}
                    </span>
                    <span className="sm:hidden">
                      {isEdit ? "Updating..." : "Creating..."}
                    </span>
                  </>
                ) : (
                  <>
                    <UserCheck size={18} />
                    <span className="hidden sm:inline">
                      {isEdit
                        ? enablePasswordChange && passwordChange.newPassword
                          ? "Update Role & Password"
                          : "Update Role"
                        : "Create User"}
                    </span>
                    <span className="sm:hidden">
                      {isEdit ? "Update" : "Create"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sticky Footer for Actions on Mobile (Alternative approach) */}
        {/* Actions are now inside scrollable area but will be visible when scrolled */}
      </div>
    </div>
  );
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { canCreate, canEdit, canDelete } = usePagePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    role: "",
    search: ""
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch staff users (excluding patients)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", filters],
    queryFn: async () => {
      const params = {
        ...filters,
        role: filters.role || undefined
      };
      Object.keys(params).forEach(
        (key) =>
          (params[key] === "" || params[key] === undefined) &&
          delete params[key]
      );
      const response = await api.get("/users", { params });
      // Backend now excludes PATIENT role by default, so no need to filter on client side
      return response.data;
    }
  });

  const users = data?.users || [];
  const pagination = data?.pagination || {};
  const stats = data?.stats || {
    total: 0,
    admin: 0,
    doctor: 0,
    receptionist: 0,
    nurse: 0,
    departmentHead: 0
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete user");
    }
  });

  // Handlers
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedUser(null);
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback((user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (user) => {
      const ok = await confirm({
        title: "Delete User",
        message: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
        danger: true
      });
      if (ok) deleteMutation.mutate(user.id);
    },
    [confirm, deleteMutation]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedUser(null);
  }, []);

  const handleSuccess = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }, [qc]);

  // Stats from backend (total counts, not just current page)
  const adminCount = stats.admin || 0;
  const receptionistCount = stats.receptionist || 0;
  const doctorCount = stats.doctor || 0;
  const nurseCount = stats.nurse || 0;
  const totalStaff = stats.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Staff Users</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage admins, doctors, receptionists, and other staff members
          </p>
        </div>
        {canCreate && (
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-2 shadow-sm">
            <Plus size={18} />
            Add Staff
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Staff</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {totalStaff}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Admins</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {adminCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Shield className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Doctors</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {doctorCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <UserCheck className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Receptionists</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {receptionistCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
              <UserCheck className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Nurses</p>
              <p className="text-2xl font-bold text-pink-600 mt-1">
                {nurseCount}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
              <UserCheck className="text-pink-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Staff
            </label>
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <SearchableDropdown
              label="Role"
              value={filters.role || ""}
              options={[
                { value: "", label: "All Roles" },
                { value: "ADMIN", label: "Admin" },
                { value: "DOCTOR", label: "Doctor" },
                { value: "RECEPTIONIST", label: "Receptionist" },
                { value: "DEPARTMENT_HEAD", label: "Department Head" },
                { value: "NURSE", label: "Nurse" }
              ]}
              onChange={(value) =>
                setFilters((f) => ({ ...f, role: value, page: 1 }))
              }
              placeholder="All Roles"
              className=""
            />
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <p className="text-sm text-slate-500">Loading staff...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="text-slate-400" size={48} />
                      <p className="text-sm text-slate-500">No staff found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      #{user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{user.phone}</div>
                      {user.email && (
                        <div className="text-xs text-slate-500">
                          {user.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(user.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Role">
                            <Edit size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete">
                            <Trash2 size={16} />
                          </button>
                        )}
                        {!canEdit && !canDelete && (
                          <span className="text-xs text-slate-400">
                            View only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="px-6 py-4 border-t border-slate-200">
            <Pagination
              page={pagination.page || 1}
              total={pagination.total || 0}
              pageSize={pagination.pageSize || 20}
              onPage={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <UserModal
          user={selectedUser}
          onClose={handleModalClose}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
