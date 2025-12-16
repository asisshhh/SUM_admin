import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  AlertCircle,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare
} from "lucide-react";
import { Pagination } from "../components/shared";
import { toast } from "react-toastify";
import GrievanceModal from "../components/grievances/GrievanceModal";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Status badge component
const StatusBadge = ({ status }) => {
  const styles = {
    OPEN: "bg-blue-100 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700 border-yellow-200",
    RESOLVED: "bg-green-100 text-green-700 border-green-200",
    CLOSED: "bg-gray-100 text-gray-700 border-gray-200"
  };

  const icons = {
    OPEN: Clock,
    IN_PROGRESS: Clock,
    RESOLVED: CheckCircle,
    CLOSED: XCircle
  };

  const Icon = icons[status] || Clock;
  const label = status?.replace(/_/g, " ") || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.OPEN}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

// Priority badge component
const PriorityBadge = ({ priority }) => {
  const styles = {
    LOW: "bg-gray-100 text-gray-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-100 text-red-700"
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[priority] || styles.MEDIUM}`}>
      {priority}
    </span>
  );
};

export default function GrievancesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    status: "all",
    priority: "all",
    department: "",
    assignedTo: "",
    userId: "",
    search: ""
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch grievances
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["grievances", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(
          ([_, v]) => v !== "" && v !== "all" && v !== null && v !== undefined
        )
      );
      return (await api.get("/grievances", { params })).data;
    }
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["grievances-stats"],
    queryFn: async () => (await api.get("/grievances/stats/overview")).data,
    refetchInterval: 60000 // Refresh stats every minute
  });

  const stats = statsData?.stats || {};
  const grievances = data?.grievances || [];
  const pagination = data?.pagination || {};

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ["departments-all"],
    queryFn: async () => (await api.get("/departments", { params: { pageSize: 100 } })).data,
    staleTime: 5 * 60 * 1000
  });

  const departments = useMemo(() => departmentsData?.items || [], [departmentsData]);

  // Close/Delete mutation
  const closeMutation = useMutation({
    mutationFn: (id) => api.delete(`/grievances/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      qc.invalidateQueries({ queryKey: ["grievances-stats"] });
      toast.success("Grievance closed successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to close grievance");
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

  const handleView = useCallback((grievance) => {
    setSelectedGrievance(grievance);
    setIsModalOpen(true);
  }, []);

  const handleClose = useCallback(async (grievance) => {
    const ok = await confirm({
      title: "Close Grievance",
      message: `Are you sure you want to close this grievance? This action cannot be undone.`,
      danger: true
    });
    if (ok) closeMutation.mutate(grievance.id);
  }, [confirm, closeMutation]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedGrievance(null);
  }, []);

  const handleUpdateSuccess = useCallback(() => {
    refetch();
    qc.invalidateQueries({ queryKey: ["grievances-stats"] });
  }, [refetch, qc]);

  // Get unique departments from grievances for filter
  const uniqueDepartments = useMemo(() => {
    const deptSet = new Set();
    grievances.forEach((g) => {
      if (g.department) deptSet.add(g.department);
    });
    return Array.from(deptSet).sort();
  }, [grievances]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Grievances</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and track all patient grievances
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats.total !== undefined && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {stats.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <MessageSquare className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Open</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {stats.byStatus?.open || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {stats.byStatus?.inProgress || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="text-yellow-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Resolved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {stats.byStatus?.resolved || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Closed</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">
                  {stats.byStatus?.closed || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <XCircle className="text-gray-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={18} className="text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by subject, description, or department..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Priority
            </label>
            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="all">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Department
            </label>
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To (User ID) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assigned To (User ID)
            </label>
            <input
              type="number"
              name="assignedTo"
              value={filters.assignedTo}
              onChange={handleFilterChange}
              placeholder="Enter user ID"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* User ID (Submitter) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Submitted By (User ID)
            </label>
            <input
              type="number"
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
              placeholder="Enter user ID"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Assigned To
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
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-slate-500">Loading grievances...</p>
                    </div>
                  </td>
                </tr>
              ) : grievances.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="text-slate-400" size={48} />
                      <p className="text-sm text-slate-500">No grievances found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                grievances.map((grievance) => (
                  <tr
                    key={grievance.id}
                    className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      #{grievance.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {grievance.subject}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {grievance.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {grievance.user ? (
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {grievance.user.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {grievance.user.phone || grievance.user.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {grievance.department || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={grievance.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PriorityBadge priority={grievance.priority} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {grievance.assignee ? (
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {grievance.assignee.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {grievance.assignee.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(grievance.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleView(grievance)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View/Edit">
                          <Eye size={16} />
                        </button>
                        {grievance.status !== "CLOSED" && (
                          <button
                            onClick={() => handleClose(grievance)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Close">
                            <Trash2 size={16} />
                          </button>
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
        <GrievanceModal
          grievance={selectedGrievance}
          onClose={handleModalClose}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
}

