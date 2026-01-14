import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { Clock, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { toast } from "react-toastify";
import { Pagination } from "../components/shared";

const SERVICE_TYPES = [
  { value: "HOME_HEALTHCARE", label: "Home Healthcare" },
  { value: "LAB_TEST", label: "Lab Test" },
  { value: "HEALTH_PACKAGE", label: "Health Package" }
];

export default function SlotConfigurationsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    serviceType: "",
    isActive: "all"
  });

  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    serviceType: "",
    startTime: "",
    endTime: "",
    slotDurationMinutes: 20,
    bufferMinutes: 5,
    isActive: true
  });

  // Fetch slot configurations
  const { data, isLoading, error } = useQuery({
    queryKey: ["slot-configurations", filters],
    queryFn: async () => {
      const params = {
        page: filters.page,
        pageSize: filters.pageSize
      };
      if (filters.serviceType) params.serviceType = filters.serviceType;
      if (filters.isActive !== "all") {
        params.isActive = filters.isActive === "true";
      }
      const response = await api.get("/slot-configurations", { params });
      if (process.env.NODE_ENV === "development") {
        console.log("Slot configurations API response:", response.data);
      }
      return response.data;
    },
    refetchOnWindowFocus: true
  });

  // Handle different response structures
  const items = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.data && Array.isArray(data.data)) return data.data;
    if (data.configurations && Array.isArray(data.configurations)) return data.configurations;
    return [];
  }, [data]);

  const total = useMemo(() => {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (typeof data.total === "number") return data.total;
    if (typeof data.count === "number") return data.count;
    if (data.items && Array.isArray(data.items)) return data.items.length;
    return 0;
  }, [data]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/slot-configurations", data);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slot-configurations"] });
      toast.success("Slot configuration created successfully");
      setEditing(null);
      setFormData({
        serviceType: "",
        startTime: "",
        endTime: "",
        slotDurationMinutes: 20,
        bufferMinutes: 5,
        isActive: true
      });
    },
    onError: (err) => {
      console.error("Create slot configuration error:", err);
      toast.error(err.response?.data?.error || "Failed to create slot configuration");
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log("=== UPDATE REQUEST ===");
      console.log("ID:", id);
      console.log("Data being sent:", JSON.stringify(data, null, 2));
      console.log("Data types:", {
        serviceType: typeof data.serviceType,
        startTime: typeof data.startTime,
        endTime: typeof data.endTime,
        slotDurationMinutes: typeof data.slotDurationMinutes,
        bufferMinutes: typeof data.bufferMinutes,
        isActive: typeof data.isActive
      });
      try {
        const response = await api.put(`/slot-configurations/${id}`, data);
        console.log("Update response:", response.data);
        return response.data;
      } catch (error) {
        console.error("=== UPDATE ERROR DETAILS ===");
        console.error("Error:", error);
        console.error("Error response:", error.response);
        console.error("Error response data:", error.response?.data);
        console.error("Error response status:", error.response?.status);
        if (error.response?.data) {
          console.error("Full error response data:", JSON.stringify(error.response.data, null, 2));
        }
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slot-configurations"] });
      qc.invalidateQueries({ queryKey: ["slot-configuration", editing] });
      toast.success("Slot configuration updated successfully");
      setEditing(null);
      setFormData({
        serviceType: "",
        startTime: "",
        endTime: "",
        slotDurationMinutes: 20,
        bufferMinutes: 5,
        isActive: true
      });
    },
    onError: (err) => {
      console.error("Update slot configuration error:", err);
      console.error("Error response:", err.response);
      console.error("Error response data:", err.response?.data);
      console.error("Error response status:", err.response?.status);
      console.error("Error response headers:", err.response?.headers);
      console.error("Request data that failed:", { id: editing, data: formData });
      console.error("Full error object:", JSON.stringify(err.response?.data, null, 2));
      
      // Extract detailed error message
      let errorMessage = "Failed to update slot configuration";
      if (err.response?.data) {
        if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.errors) {
          // Handle validation errors
          const errors = err.response.data.errors;
          if (Array.isArray(errors)) {
            errorMessage = errors.join(", ");
          } else if (typeof errors === "object") {
            errorMessage = Object.entries(errors)
              .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
              .join("; ");
          } else {
            errorMessage = String(errors);
          }
        } else {
          // Try to stringify the whole response
          errorMessage = JSON.stringify(err.response.data, null, 2);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage, { autoClose: 7000 });
    }
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/slot-configurations/${id}`);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slot-configurations"] });
      toast.success("Slot configuration deleted successfully");
    },
    onError: (err) => {
      console.error("Delete slot configuration error:", err);
      toast.error(err.response?.data?.error || "Failed to delete slot configuration");
    }
  });

  // Fetch single configuration for editing
  const { data: editData, isLoading: isLoadingEdit } = useQuery({
    queryKey: ["slot-configuration", editing],
    queryFn: async () => {
      if (process.env.NODE_ENV === "development") {
        console.log("Fetching slot configuration for edit:", editing);
      }
      const response = await api.get(`/slot-configurations/${editing}`);
      if (process.env.NODE_ENV === "development") {
        console.log("Edit data response:", response.data);
      }
      return response.data;
    },
    enabled: !!editing && typeof editing === "number"
  });

  // Populate form when editing
  React.useEffect(() => {
    if (editData && editing && typeof editing === "number") {
      const config = editData.configuration || editData.data || editData;
      if (process.env.NODE_ENV === "development") {
        console.log("Populating form with config:", config);
      }
      setFormData({
        serviceType: config.serviceType || "",
        startTime: config.startTime || "",
        endTime: config.endTime || "",
        slotDurationMinutes: config.slotDurationMinutes || 20,
        bufferMinutes: config.bufferMinutes || 5,
        isActive: config.isActive !== undefined ? config.isActive : true
      });
    }
  }, [editData, editing]);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const handleFormChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? parseInt(value) || 0 : value
    }));
  }, []);

  const handleCreate = useCallback(() => {
    setEditing("new");
    setFormData({
      serviceType: "",
      startTime: "",
      endTime: "",
      slotDurationMinutes: 20,
      bufferMinutes: 5,
      isActive: true
    });
  }, []);

  const handleEdit = useCallback((id) => {
    setEditing(id);
  }, []);

  const handleCancel = useCallback(() => {
    setEditing(null);
    setFormData({
      serviceType: "",
      startTime: "",
      endTime: "",
      slotDurationMinutes: 20,
      bufferMinutes: 5,
      isActive: true
    });
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      console.log("Form submitted!", { editing, formData });
      
      if (!formData.serviceType) {
        toast.error("Please select a service type");
        return;
      }
      if (!formData.startTime || !formData.endTime) {
        toast.error("Please provide both start and end times");
        return;
      }
      if (formData.slotDurationMinutes <= 0) {
        toast.error("Slot duration must be greater than 0");
        return;
      }
      if (formData.bufferMinutes < 0) {
        toast.error("Buffer minutes cannot be negative");
        return;
      }

      if (editing === "new") {
        // For create, include all fields including serviceType
        const submitData = {
          serviceType: formData.serviceType,
          startTime: formData.startTime,
          endTime: formData.endTime,
          slotDurationMinutes: Number(formData.slotDurationMinutes),
          bufferMinutes: Number(formData.bufferMinutes),
          isActive: Boolean(formData.isActive)
        };
        console.log("Calling createMutation with data:", submitData);
        createMutation.mutate(submitData);
      } else if (typeof editing === "number") {
        // For update, exclude serviceType (it cannot be changed)
        const submitData = {
          startTime: formData.startTime,
          endTime: formData.endTime,
          slotDurationMinutes: Number(formData.slotDurationMinutes),
          bufferMinutes: Number(formData.bufferMinutes),
          isActive: Boolean(formData.isActive)
        };
        console.log("Calling updateMutation with id:", editing, "and data:", submitData);
        updateMutation.mutate({ id: editing, data: submitData });
      } else {
        console.error("Invalid editing state:", editing);
        toast.error("Invalid form state. Please try again.");
      }
    },
    [formData, editing, createMutation, updateMutation]
  );

  const handleDelete = useCallback(
    async (id) => {
      const ok = await confirm({
        title: "Delete Slot Configuration",
        message: "Are you sure you want to delete this slot configuration? This action cannot be undone.",
        danger: true
      });
      if (ok) {
        deleteMutation.mutate(id);
      }
    },
    [confirm, deleteMutation]
  );

  const getServiceTypeLabel = (type) => {
    return SERVICE_TYPES.find((st) => st.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-blue-600" size={28} />
            Slot Configurations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage time slot configurations for different services
          </p>
        </div>
        {!editing && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={18} />
            Add Slot Configuration
          </button>
        )}
      </div>

      {/* Filters */}
      {!editing && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Service Type
              </label>
              <select
                name="serviceType"
                value={filters.serviceType}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Services</option>
                {SERVICE_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                name="isActive"
                value={filters.isActive}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="all">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {editing && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              {editing === "new" ? "Create Slot Configuration" : "Edit Slot Configuration"}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          {isLoadingEdit && editing !== "new" ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
              Loading configuration...
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select Service Type</option>
                  {SERVICE_TYPES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleFormChange}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">Active</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Slot Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="slotDurationMinutes"
                  value={formData.slotDurationMinutes}
                  onChange={handleFormChange}
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Buffer Minutes <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="bufferMinutes"
                  value={formData.bufferMinutes}
                  onChange={handleFormChange}
                  required
                  min="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                onClick={(e) => {
                  console.log("Save button clicked!");
                  // Let the form handle submission
                }}
                disabled={createMutation.isLoading || updateMutation.isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Save size={18} />
                {createMutation.isLoading || updateMutation.isLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
            Loading slot configurations...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">
            <p>Failed to load slot configurations</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Clock className="mx-auto mb-2 text-slate-300" size={40} />
            <p>No slot configurations found</p>
            <p className="text-sm mt-1">
              {filters.serviceType || filters.isActive !== "all"
                ? "Try adjusting your filters."
                : "Add a new slot configuration to get started."}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">ID</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Service Type</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Time Range</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Slot Duration</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Buffer</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {items.map((config) => (
                  <tr key={config.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">#{config.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-800">
                        {getServiceTypeLabel(config.serviceType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700">
                        {config.startTime} - {config.endTime}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">
                        {config.slotDurationMinutes} min
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600">
                        {config.bufferMinutes} min
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {config.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(config.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            {total > 0 && (
              <div className="px-6 py-4 border-t border-slate-200">
                <Pagination
                  page={filters.page}
                  total={total}
                  pageSize={filters.pageSize}
                  onPage={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

