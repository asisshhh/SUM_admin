import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { DollarSign, Search, Plus, Edit, Trash2 } from "lucide-react";
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

export default function AmbulanceChargesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: "",
    ambulanceTypeId: "",
    chargeType: "",
    active: "all"
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch ambulance types for filter
  const { data: typesData } = useQuery({
    queryKey: ["ambulance-types-all"],
    queryFn: async () => (await api.get("/ambulance-types", { params: { pageSize: 100 } })).data,
    staleTime: 5 * 60 * 1000
  });

  const ambulanceTypes = useMemo(() => typesData?.items || [], [typesData]);

  // Fetch charges
  const { data, isLoading } = useQuery({
    queryKey: ["ambulance-charges", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
      );
      return (await api.get("/ambulance-charges", { params })).data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/ambulance-charges/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-charges"] });
      toast.success("Charge deleted successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to delete charge");
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

  const handleDelete = useCallback(async (charge) => {
    const ok = await confirm({
      title: "Delete Charge",
      message: `Are you sure you want to delete "${charge.name}"?`,
      danger: true
    });
    if (ok) deleteMutation.mutate(charge.id);
  }, [confirm, deleteMutation]);

  const handleEdit = useCallback((charge) => {
    setEditing(charge);
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
            <DollarSign className="text-blue-600" size={32} />
            Ambulance Charges
          </h1>
          <p className="text-slate-500 mt-1">Manage pricing and charges for ambulance types</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} />
          Add Charge
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search charges..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            name="ambulanceTypeId"
            value={filters.ambulanceTypeId}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Types</option>
            {ambulanceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            name="chargeType"
            value={filters.chargeType}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Charge Types</option>
            <option value="BASE_FARE_UPTO_30KM">Base Fare (Up to 30 KM)</option>
            <option value="PER_KM_ABOVE_30KM">Per KM (Above 30 KM)</option>
            <option value="PARAMEDIC_UPTO_100KM">Paramedic (Up to 100 KM)</option>
            <option value="PARAMEDIC_100_TO_500KM">Paramedic (100-500 KM)</option>
            <option value="PARAMEDIC_ABOVE_500KM">Paramedic (Above 500 KM)</option>
            <option value="ATTENDANT_SUPPORT_WITHIN_30KM">Attendant Support</option>
          </select>
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
          <div className="p-12 text-center text-slate-500">No charges found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase w-[140px]">Type</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase w-[180px]">Charge Type</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase min-w-[200px]">Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase w-[120px]">Distance</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase w-[100px]">Amount</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase w-[80px]">Unit</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase w-[90px]">Status</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800 text-xs">{item.ambulanceType?.name || "-"}</div>
                        <div className="text-xs text-slate-500">{item.ambulanceType?.code || ""}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs text-slate-600 truncate block max-w-[160px]" title={item.chargeType}>
                          {item.chargeType}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-[180px]" title={item.description}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-slate-600">
                          {item.distanceFrom !== null && item.distanceTo !== null
                            ? `${item.distanceFrom}-${item.distanceTo} km`
                            : item.distanceFrom !== null
                            ? `>${item.distanceFrom} km`
                            : "N/A"}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-semibold text-slate-800">₹{item.amount}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {item.unit}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded ${
                            item.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                          {item.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit">
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
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
        <ChargeFormModal
          editing={editing}
          ambulanceTypes={ambulanceTypes}
          onClose={handleCloseModal}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["ambulance-charges"] });
            handleCloseModal();
          }}
        />
      )}
    </div>
  );
}

// Form Modal Component
function ChargeFormModal({ editing, ambulanceTypes, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    ambulanceTypeId: "",
    chargeType: "",
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

  useEffect(() => {
    if (editing) {
      setFormData({
        ambulanceTypeId: editing.ambulanceTypeId?.toString() || "",
        chargeType: editing.chargeType || "",
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
  }, [editing]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        ambulanceTypeId: Number(data.ambulanceTypeId),
        distanceFrom: data.distanceFrom ? Number(data.distanceFrom) : null,
        distanceTo: data.distanceTo ? Number(data.distanceTo) : null,
        amount: Number(data.amount),
        displayOrder: Number(data.displayOrder) || 0
      };
      if (editing) {
        return api.put(`/ambulance-charges/${editing.id}`, payload);
      }
      return api.post("/ambulance-charges", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Charge updated successfully" : "Charge created successfully");
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to save charge");
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
    if (!formData.ambulanceTypeId) newErrors.ambulanceTypeId = "Ambulance type is required";
    if (!formData.chargeType) newErrors.chargeType = "Charge type is required";
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.amount || Number(formData.amount) <= 0) newErrors.amount = "Valid amount is required";

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
            {editing ? "Edit Charge" : "Add Charge"}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ambulance Type *</label>
              <select
                value={formData.ambulanceTypeId}
                onChange={(e) => setFormData({ ...formData, ambulanceTypeId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select Type</option>
                {ambulanceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.ambulanceTypeId && <p className="text-red-500 text-sm mt-1">{errors.ambulanceTypeId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Charge Type *</label>
              <select
                value={formData.chargeType}
                onChange={(e) => setFormData({ ...formData, chargeType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select Charge Type</option>
                <option value="BASE_FARE_UPTO_30KM">Base Fare (Up to 30 KM)</option>
                <option value="PER_KM_ABOVE_30KM">Per KM (Above 30 KM)</option>
                <option value="PARAMEDIC_UPTO_100KM">Paramedic (Up to 100 KM)</option>
                <option value="PARAMEDIC_100_TO_500KM">Paramedic (100-500 KM)</option>
                <option value="PARAMEDIC_ABOVE_500KM">Paramedic (Above 500 KM)</option>
                <option value="ATTENDANT_SUPPORT_WITHIN_30KM">Attendant Support</option>
              </select>
              {errors.chargeType && <p className="text-red-500 text-sm mt-1">{errors.chargeType}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Base Fare (Up to 30 KMs)"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Description of the charge..."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance From (km)</label>
              <input
                type="number"
                value={formData.distanceFrom}
                onChange={(e) => setFormData({ ...formData, distanceFrom: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance To (km)</label>
              <input
                type="number"
                value={formData.distanceTo}
                onChange={(e) => setFormData({ ...formData, distanceTo: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="30"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1500"
                min="0"
                step="0.01"
              />
              {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="FIXED">Fixed</option>
                <option value="PER_KM">Per KM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.value === "true" })}
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

