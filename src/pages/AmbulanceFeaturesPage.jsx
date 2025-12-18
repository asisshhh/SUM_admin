import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePagePermissions } from "../hooks/usePagePermissions";
import {
  Settings,
  Search,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { toast } from "react-toastify";
import { Pagination } from "../components/shared";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AmbulanceFeaturesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { canCreate, canEdit, canDelete } = usePagePermissions();
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState(new Set());

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: "",
    active: "all"
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch ambulance features
  const { data, isLoading } = useQuery({
    queryKey: ["ambulance-features", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
      );
      return (await api.get("/ambulance-features", { params })).data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/ambulance-features/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-features"] });
      toast.success("Feature deleted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete feature");
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
    async (feature) => {
      const ok = await confirm({
        title: "Delete Feature",
        message: `Are you sure you want to delete "${feature.name}"? This will also delete all associated pricing.`,
        danger: true
      });
      if (ok) deleteMutation.mutate(feature.id);
    },
    [confirm, deleteMutation]
  );

  const handleEdit = useCallback((feature) => {
    setEditing(feature);
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

  const toggleExpand = useCallback((featureId) => {
    setExpandedFeatures((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(featureId)) {
        newSet.delete(featureId);
      } else {
        newSet.add(featureId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Settings className="text-blue-600" size={32} />
            Ambulance Features
          </h1>
          <p className="text-slate-500 mt-1">
            Manage ambulance features and their pricing
          </p>
        </div>
        {canCreate && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus size={18} />
            Add Feature
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
              placeholder="Search features..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            name="active"
            value={filters.active}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No features found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-[50px]"></th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Pricing Rules
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
                  {items.map((item) => {
                    const isExpanded = expandedFeatures.has(item.id);
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="p-1 hover:bg-slate-200 rounded">
                              {isExpanded ? (
                                <ChevronDown
                                  size={16}
                                  className="text-slate-600"
                                />
                              ) : (
                                <ChevronRight
                                  size={16}
                                  className="text-slate-600"
                                />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">
                              {item.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-600 max-w-md truncate">
                              {item.description || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-medium text-slate-700">
                              {item._count?.pricing || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                item.active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                              {item.active ? "Active" : "Inactive"}
                            </span>
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
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-slate-50">
                              <FeaturePricingManager feature={item} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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
        <AmbulanceFeatureFormModal
          editing={editing}
          onClose={handleCloseModal}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["ambulance-features"] });
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}

// Feature Pricing Manager Component
function FeaturePricingManager({ feature }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editingPricing, setEditingPricing] = useState(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const { data: pricingData, isLoading } = useQuery({
    queryKey: ["ambulance-feature-pricing", feature.id],
    queryFn: async () => {
      const params = { featureId: feature.id, pageSize: 100 };
      return (await api.get("/ambulance-feature-pricing", { params })).data;
    }
  });

  const deletePricingMutation = useMutation({
    mutationFn: (id) => api.delete(`/ambulance-feature-pricing/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-feature-pricing"] });
      toast.success("Pricing rule deleted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete pricing rule");
    }
  });

  const pricingItems = pricingData?.items || [];

  const handleDeletePricing = useCallback(
    async (pricing) => {
      const ok = await confirm({
        title: "Delete Pricing Rule",
        message: `Are you sure you want to delete "${pricing.name}"?`,
        danger: true
      });
      if (ok) deletePricingMutation.mutate(pricing.id);
    },
    [confirm, deletePricingMutation]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Pricing Rules</h3>
        <button
          onClick={() => {
            setEditingPricing(null);
            setIsPricingModalOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
          <Plus size={14} />
          Add Pricing
        </button>
      </div>
      {isLoading ? (
        <div className="text-center text-slate-500 py-4">
          Loading pricing...
        </div>
      ) : pricingItems.length === 0 ? (
        <div className="text-center text-slate-500 py-4">
          No pricing rules defined
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                  Ambulance Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                  Distance Range
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase">
                  Amount
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">
                  Unit
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">
                  Status
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pricingItems.map((pricing) => (
                <tr key={pricing.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="text-xs text-slate-600">
                      {pricing.ambulanceType ? (
                        <span className="font-medium">
                          {pricing.ambulanceType.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">All Types</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">
                      {pricing.name}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs text-slate-600">
                      {pricing.distanceFrom !== null &&
                      pricing.distanceTo !== null
                        ? `${pricing.distanceFrom}-${pricing.distanceTo} km`
                        : pricing.distanceFrom !== null
                        ? `>${pricing.distanceFrom} km`
                        : pricing.distanceTo !== null
                        ? `<${pricing.distanceTo} km`
                        : "All distances"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-semibold text-slate-800">
                      ₹{pricing.amount}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {pricing.unit}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded ${
                        pricing.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {pricing.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setEditingPricing(pricing);
                          setIsPricingModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit">
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePricing(pricing)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pricing Form Modal */}
      {isPricingModalOpen && (
        <FeaturePricingFormModal
          feature={feature}
          editing={editingPricing}
          onClose={() => {
            setIsPricingModalOpen(false);
            setEditingPricing(null);
          }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["ambulance-feature-pricing"] });
            setIsPricingModalOpen(false);
            setEditingPricing(null);
          }}
        />
      )}
    </div>
  );
}

// Form Modal Component
function AmbulanceFeatureFormModal({ editing, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    displayOrder: 0,
    active: true,
    showInline: false
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editing) {
      setFormData({
        name: editing.name || "",
        description: editing.description || "",
        icon: editing.icon || "",
        displayOrder: editing.displayOrder || 0,
        active: editing.active !== undefined ? editing.active : true,
        showInline:
          editing.showInline !== undefined ? editing.showInline : false
      });
    }
  }, [editing]);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (editing) {
        return api.put(`/ambulance-features/${editing.id}`, data);
      }
      return api.post("/ambulance-features", data);
    },
    onSuccess: () => {
      toast.success(
        editing
          ? "Feature updated successfully"
          : "Feature created successfully"
      );
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to save feature");
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
            {editing ? "Edit Feature" : "Add Feature"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              placeholder="e.g., Paramedic Support"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description of the feature..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Icon URL
            </label>
            <input
              type="text"
              value={formData.icon}
              onChange={(e) =>
                setFormData({ ...formData, icon: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Icon URL (optional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value) || 0
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.active}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    active: e.target.value === "true"
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showInline}
                onChange={(e) =>
                  setFormData({ ...formData, showInline: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Show Inline
              </span>
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-6">
              Enable this to display the feature inline in the UI
            </p>
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

// Feature Pricing Form Modal
function FeaturePricingFormModal({ feature, editing, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    featureId: feature.id,
    ambulanceTypeId: "",
    name: "",
    description: "",
    distanceFrom: "",
    distanceTo: "",
    amount: "",
    unit: "FIXED",
    displayOrder: 0,
    active: true
  });
  const [errors, setErrors] = useState({});

  // Fetch ambulance types for dropdown
  const { data: typesData } = useQuery({
    queryKey: ["ambulance-types-all"],
    queryFn: async () =>
      (await api.get("/ambulance-types", { params: { pageSize: 100 } })).data,
    staleTime: 5 * 60 * 1000
  });

  const ambulanceTypes = useMemo(() => typesData?.items || [], [typesData]);

  useEffect(() => {
    if (editing) {
      setFormData({
        featureId: feature.id,
        ambulanceTypeId: editing.ambulanceTypeId?.toString() || "",
        name: editing.name || "",
        description: editing.description || "",
        distanceFrom: editing.distanceFrom?.toString() || "",
        distanceTo: editing.distanceTo?.toString() || "",
        amount: editing.amount?.toString() || "",
        unit: editing.unit || "FIXED",
        displayOrder: editing.displayOrder || 0,
        active: editing.active !== undefined ? editing.active : true
      });
    }
  }, [editing, feature]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        featureId: Number(data.featureId),
        ambulanceTypeId:
          data.ambulanceTypeId && data.ambulanceTypeId !== ""
            ? Number(data.ambulanceTypeId)
            : null,
        distanceFrom: data.distanceFrom ? Number(data.distanceFrom) : null,
        distanceTo: data.distanceTo ? Number(data.distanceTo) : null,
        amount: Number(data.amount),
        displayOrder: Number(data.displayOrder) || 0
      };
      if (editing) {
        return api.put(`/ambulance-feature-pricing/${editing.id}`, payload);
      }
      return api.post("/ambulance-feature-pricing", payload);
    },
    onSuccess: () => {
      toast.success(
        editing
          ? "Pricing rule updated successfully"
          : "Pricing rule created successfully"
      );
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to save pricing rule");
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
    if (!formData.amount || Number(formData.amount) <= 0)
      newErrors.amount = "Valid amount is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">
            {editing ? "Edit Pricing Rule" : "Add Pricing Rule"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">Feature: {feature.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ambulance Type
            </label>
            <select
              value={formData.ambulanceTypeId}
              onChange={(e) =>
                setFormData({ ...formData, ambulanceTypeId: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">All Types (Global Pricing)</option>
              {ambulanceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Leave empty for global pricing that applies to all ambulance types
            </p>
          </div>
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
              placeholder="e.g., Paramedic Charges (Upto 100 Kms)"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description of the pricing rule..."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Distance From (km)
              </label>
              <input
                type="number"
                value={formData.distanceFrom}
                onChange={(e) =>
                  setFormData({ ...formData, distanceFrom: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Distance To (km)
              </label>
              <input
                type="number"
                value={formData.distanceTo}
                onChange={(e) =>
                  setFormData({ ...formData, distanceTo: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="100 (leave empty for unlimited)"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1000"
                min="0"
                step="0.01"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="FIXED">Fixed</option>
                <option value="PER_KM">Per KM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value) || 0
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.active}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    active: e.target.value === "true"
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
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
