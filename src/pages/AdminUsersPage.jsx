import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
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
import { Pagination } from "../components/shared";
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
    NURSE: "bg-pink-100 text-pink-700 border-pink-200"
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
    role: user?.role || "ADMIN"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const isEdit = !!user;

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

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!isEdit && !formData.password)
      newErrors.password = "Password is required";
    if (!isEdit && formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (isEdit) {
      updateMutation.mutate({ role: formData.role });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600">
          <h2 className="text-lg font-semibold text-white">
            {isEdit ? "Edit User Role" : "Create Staff User"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
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
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.password ? "border-red-500" : "border-slate-300"
                  }`}
                  placeholder="Enter password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="ADMIN">Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="DEPARTMENT_HEAD">Department Head</option>
              <option value="NURSE">Nurse</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Staff users can access the admin portal based on their role
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isEdit ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <UserCheck size={18} />
                  {isEdit ? "Update Role" : "Create User"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
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
      // Filter out patients on client side
      const filteredUsers = (response.data.users || []).filter(
        (u) => u.role !== "PATIENT"
      );
      return {
        ...response.data,
        users: filteredUsers,
        pagination: {
          ...response.data.pagination,
          total: filteredUsers.length
        }
      };
    }
  });

  const users = data?.users || [];
  const pagination = data?.pagination || {};

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

  // Stats
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const receptionistCount = users.filter(
    (u) => u.role === "RECEPTIONIST"
  ).length;
  const doctorCount = users.filter((u) => u.role === "DOCTOR").length;
  const nurseCount = users.filter((u) => u.role === "NURSE").length;

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
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition flex items-center gap-2 shadow-sm">
          <Plus size={18} />
          Add Staff
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Staff</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">
                {users.length}
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role
            </label>
            <select
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="DOCTOR">Doctor</option>
              <option value="RECEPTIONIST">Receptionist</option>
              <option value="DEPARTMENT_HEAD">Department Head</option>
              <option value="NURSE">Nurse</option>
            </select>
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
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Role">
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete">
                          <Trash2 size={16} />
                        </button>
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
