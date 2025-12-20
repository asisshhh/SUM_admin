import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePagePermissions } from "../hooks/usePagePermissions";
import { UserCircle, Search, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { Pagination, SearchableDropdown } from "../components/shared";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function DriversPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { canCreate, canEdit, canDelete } = usePagePermissions();
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: "",
    available: "all",
    active: "all"
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch drivers
  const { data, isLoading } = useQuery({
    queryKey: ["drivers", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
      );
      return (await api.get("/drivers", { params })).data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/drivers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Driver deleted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete driver");
    }
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  // Handlers
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const handleDelete = useCallback(
    async (driver) => {
      const ok = await confirm({
        title: "Delete Driver",
        message: `Are you sure you want to delete "${driver.name}"? This will unassign them from all ambulances.`,
        danger: true
      });
      if (ok) deleteMutation.mutate(driver.id);
    },
    [confirm, deleteMutation]
  );

  const handleEdit = useCallback((driver) => {
    setEditing(driver);
    setIsModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditing(null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditing(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <UserCircle className="text-blue-600" size={32} />
            Drivers
          </h1>
          <p className="text-slate-500 mt-1">Manage ambulance drivers</p>
        </div>
        {canCreate && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus size={18} />
            Add Driver
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name, phone, or license..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <SearchableDropdown
            value={filters.available || "all"}
            options={[
              { value: "all", label: "All Availability" },
              { value: "true", label: "Available" },
              { value: "false", label: "Unavailable" }
            ]}
            onChange={(value) =>
              setFilters((f) => ({ ...f, available: value, page: 1 }))
            }
            placeholder="All Availability"
            className=""
          />
          <SearchableDropdown
            value={filters.active || "all"}
            options={[
              { value: "all", label: "All Status" },
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" }
            ]}
            onChange={(value) =>
              setFilters((f) => ({ ...f, active: value, page: 1 }))
            }
            placeholder="All Status"
            className=""
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No drivers found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Experience
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Ambulances
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">
                          {item.name}
                        </div>
                        {item.emergencyContact && (
                          <div className="text-xs text-slate-500">
                            Emergency: {item.emergencyContact}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600">{item.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600">
                          {item.licenseNumber}
                        </div>
                        {item.licenseExpiry && (
                          <div className="text-xs text-slate-500">
                            Expires:{" "}
                            {new Date(item.licenseExpiry).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600">
                          {item.experience ? `${item.experience} years` : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.rating ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                            ⭐ {item.rating}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-700">
                          {item._count?.ambulances || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.available
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                            {item.available ? "Available" : "Unavailable"}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.active
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                            {item.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                              <Edit size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
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
                  ))}
                </tbody>
              </table>
            </div>
            {total > filters.pageSize && (
              <div className="border-t border-slate-200 p-4">
                <Pagination
                  currentPage={filters.page}
                  totalPages={Math.ceil(total / filters.pageSize)}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <DriverFormModal
          editing={editing}
          onClose={handleCloseModal}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["drivers"] });
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}

// Form Modal Component
function DriverFormModal({ editing, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    licenseNumber: "",
    licenseExpiry: "",
    experience: "",
    rating: "",
    emergencyContact: "",
    available: true,
    active: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editing) {
      setFormData({
        name: editing.name || "",
        phone: editing.phone || "",
        licenseNumber: editing.licenseNumber || "",
        licenseExpiry: editing.licenseExpiry
          ? new Date(editing.licenseExpiry).toISOString().split("T")[0]
          : "",
        experience: editing.experience?.toString() || "",
        rating: editing.rating?.toString() || "",
        emergencyContact: editing.emergencyContact || "",
        available: editing.available !== undefined ? editing.available : true,
        active: editing.active !== undefined ? editing.active : true
      });
    }
  }, [editing]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        licenseExpiry: data.licenseExpiry || null,
        experience: data.experience ? Number(data.experience) : null,
        rating: data.rating ? Number(data.rating) : null
      };
      if (editing) {
        return api.put(`/drivers/${editing.id}`, payload);
      }
      return api.post("/drivers", payload);
    },
    onSuccess: () => {
      toast.success(
        editing ? "Driver updated successfully" : "Driver created successfully"
      );
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to save driver");
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.licenseNumber.trim())
      newErrors.licenseNumber = "License number is required";
    if (
      formData.rating &&
      (Number(formData.rating) < 0 || Number(formData.rating) > 5)
    ) {
      newErrors.rating = "Rating must be between 0 and 5";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">
            {editing ? "Edit Driver" : "Add Driver"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                License Number *
              </label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) =>
                  setFormData({ ...formData, licenseNumber: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.licenseNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.licenseNumber}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                License Expiry
              </label>
              <input
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) =>
                  setFormData({ ...formData, licenseExpiry: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Experience (years)
              </label>
              <input
                type="number"
                value={formData.experience}
                onChange={(e) =>
                  setFormData({ ...formData, experience: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rating (0-5)
              </label>
              <input
                type="number"
                value={formData.rating}
                onChange={(e) =>
                  setFormData({ ...formData, rating: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="5"
                step="0.1"
              />
              {errors.rating && (
                <p className="text-red-500 text-sm mt-1">{errors.rating}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Emergency Contact
            </label>
            <input
              type="tel"
              value={formData.emergencyContact}
              onChange={(e) =>
                setFormData({ ...formData, emergencyContact: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SearchableDropdown
                label="Availability"
                value={String(formData.available)}
                options={[
                  { value: "true", label: "Available" },
                  { value: "false", label: "Unavailable" }
                ]}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    available: value === "true"
                  })
                }
                placeholder="Select"
                className=""
              />
            </div>
            <div>
              <SearchableDropdown
                label="Status"
                value={String(formData.active)}
                options={[
                  { value: "true", label: "Active" },
                  { value: "false", label: "Inactive" }
                ]}
                onChange={(value) =>
                  setFormData({
                    ...formData,
                    active: value === "true"
                  })
                }
                placeholder="Select"
                className=""
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {mutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
