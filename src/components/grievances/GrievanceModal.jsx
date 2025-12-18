import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import {
  X,
  Save,
  UserPlus,
  AlertCircle,
  Calendar,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp
} from "lucide-react";
import { toast } from "react-toastify";

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
    IN_PROGRESS: TrendingUp,
    RESOLVED: CheckCircle,
    CLOSED: XCircle
  };

  const Icon = icons[status] || Clock;
  const label = status?.replace(/_/g, " ") || status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
        styles[status] || styles.OPEN
      }`}>
      <Icon size={14} />
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
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
        styles[priority] || styles.MEDIUM
      }`}>
      {priority}
    </span>
  );
};

export default function GrievanceModal({ grievance, onClose, onSuccess }) {
  const qc = useQueryClient();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState("");

  const [form, setForm] = useState({
    subject: "",
    description: "",
    department: "",
    status: "OPEN",
    priority: "MEDIUM",
    assignedTo: null
  });

  // Fetch assignable users (admin staff)
  const { data: assignableUsersData } = useQuery({
    queryKey: ["assignable-users"],
    queryFn: async () => (await api.get("/users/assignable")).data,
    staleTime: 5 * 60 * 1000
  });

  const assignableUsers = assignableUsersData?.users || [];

  // Fetch full grievance details
  const { data: fullGrievance, isLoading } = useQuery({
    queryKey: ["grievance", grievance?.id],
    queryFn: async () =>
      (await api.get(`/grievances/${grievance.id}`)).data.grievance,
    enabled: !!grievance?.id
  });

  useEffect(() => {
    if (fullGrievance) {
      setForm({
        subject: fullGrievance.subject || "",
        description: fullGrievance.description || "",
        department: fullGrievance.department || "",
        status: fullGrievance.status || "OPEN",
        priority: fullGrievance.priority || "MEDIUM",
        assignedTo: fullGrievance.assignedTo || null
      });
      setAssignUserId(fullGrievance.assignedTo?.toString() || "");
    }
  }, [fullGrievance]);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return (await api.put(`/grievances/${grievance.id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      qc.invalidateQueries({ queryKey: ["grievance", grievance.id] });
      qc.invalidateQueries({ queryKey: ["grievances-stats"] });
      toast.success("Grievance updated successfully");
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update grievance");
    }
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async (userId) => {
      return (
        await api.post(`/grievances/${grievance.id}/assign`, {
          assignedTo: Number(userId)
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grievances"] });
      qc.invalidateQueries({ queryKey: ["grievance", grievance.id] });
      toast.success("Grievance assigned successfully");
      setShowAssignModal(false);
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to assign grievance");
    }
  });

  const handleSave = () => {
    const updateData = {
      subject: form.subject,
      description: form.description,
      department: form.department,
      status: form.status,
      priority: form.priority,
      assignedTo: form.assignedTo ? Number(form.assignedTo) : null
    };
    updateMutation.mutate(updateData);
  };

  const handleAssign = () => {
    if (!assignUserId || assignUserId === "") {
      toast.error("Please enter a user ID");
      return;
    }
    assignMutation.mutate(assignUserId);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const grievanceData = fullGrievance || grievance;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <AlertCircle className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Grievance Details
                </h2>
                <p className="text-sm text-slate-500">
                  ID: #{grievanceData?.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Status and Priority */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Status
                  </label>
                  <StatusBadge status={grievanceData?.status} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Priority
                  </label>
                  <PriorityBadge priority={grievanceData?.priority} />
                </div>
              </div>

              {/* User Information */}
              {grievanceData?.user && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <User size={16} />
                    Submitted By
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Name</p>
                      <p className="text-sm font-medium text-slate-900">
                        {grievanceData.user.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                        <Phone size={14} />
                        {grievanceData.user.phone || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                        <Mail size={14} />
                        {grievanceData.user.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">User ID</p>
                      <p className="text-sm font-medium text-slate-900">
                        #{grievanceData.user.id}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignee Information */}
              {grievanceData?.assignee && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <UserPlus size={16} />
                    Assigned To
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Name</p>
                      <p className="text-sm font-medium text-slate-900">
                        {grievanceData.assignee.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
                        <Mail size={14} />
                        {grievanceData.assignee.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Role</p>
                      <p className="text-sm font-medium text-slate-900">
                        {grievanceData.assignee.role}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => update("department", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter department"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => update("priority", e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Assigned To
                  </label>
                  <select
                    value={form.assignedTo || ""}
                    onChange={(e) =>
                      update("assignedTo", e.target.value || null)
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">-- Unassigned --</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role}) - {user.phone || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description"
                />
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar size={12} />
                    Created At
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {grievanceData?.createdAt
                      ? new Date(grievanceData.createdAt).toLocaleString(
                          "en-IN"
                        )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                    <Calendar size={12} />
                    Updated At
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {grievanceData?.updatedAt
                      ? new Date(grievanceData.updatedAt).toLocaleString(
                          "en-IN"
                        )
                      : "N/A"}
                  </p>
                </div>
                {grievanceData?.resolvedAt && (
                  <div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                      <CheckCircle size={12} />
                      Resolved At
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(grievanceData.resolvedAt).toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <UserPlus size={16} />
              Assign to User
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  updateMutation.isPending || !form.subject || !form.description
                }
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {updateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">
                Assign Grievance
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">-- Select User --</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role}) - {user.phone || user.email}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Select an admin user to assign this grievance to
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assignMutation.isPending || !assignUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
