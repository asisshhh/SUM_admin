import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { Building2, Search, Plus, Edit2, Trash2, Users, ChevronLeft, ChevronRight, X, AlertCircle } from "lucide-react";

// Custom hook for debounced value
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function Pager({ page, total, pageSize, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 10)));
  const start = Math.min((page - 1) * pageSize + 1, total || 0);
  const end = Math.min(page * pageSize, total || 0);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> of{" "}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}>
          <ChevronLeft size={18} />
        </button>
        <span className="px-3 py-1 text-sm font-medium bg-slate-100 rounded-lg">
          {page} / {pages}
        </span>
        <button
          className="p-2 rounded-lg border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function DepartmentFormModal({ initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    active: initial?.active ?? true,
    iconUrl: initial?.iconUrl || "",
    displayOrder: initial?.displayOrder ?? ""
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validation rules
  const validate = () => {
    const newErrors = {};

    // Name validation (required, 2-100 chars)
    if (!form.name.trim()) {
      newErrors.name = "Department name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (form.name.trim().length > 100) {
      newErrors.name = "Name cannot exceed 100 characters";
    }

    // Description validation (optional, max 500 chars)
    if (form.description && form.description.length > 500) {
      newErrors.description = "Description cannot exceed 500 characters";
    }

    // Icon URL validation (optional, must be valid URL if provided)
    if (form.iconUrl && form.iconUrl.trim()) {
      try {
        new URL(form.iconUrl);
      } catch {
        newErrors.iconUrl = "Please enter a valid URL";
      }
    }

    // Display Order validation (optional, must be >= 0)
    if (form.displayOrder !== "" && form.displayOrder !== null) {
      const order = Number(form.displayOrder);
      if (isNaN(order) || order < 0) {
        newErrors.displayOrder = "Display order must be 0 or greater";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    validate();
  };

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const inputClass = (field) =>
    `input ${touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""}`;

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        active: form.active,
        iconUrl: form.iconUrl.trim() || null,
        displayOrder: form.displayOrder !== "" ? Number(form.displayOrder) : null
      };

      if (isEdit) {
        return (await api.put(`/departments/${initial.id}`, payload)).data;
      }
      return (await api.post(`/departments`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      onClose();
    },
    onError: (error) => {
      console.error("Save error:", error);
      alert(error.response?.data?.error || "Failed to save department");
    }
  });

  const handleSubmit = () => {
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(form).forEach((key) => (allTouched[key] = true));
    setTouched(allTouched);

    if (validate()) {
      save.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Building2 className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isEdit ? "Edit Department" : "Add New Department"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {save.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {save.error?.response?.data?.error || "Failed to save department"}
            </div>
          )}

          {/* Name - Required */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass("name")}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="e.g. Cardiology"
            />
            {touched.name && errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className={inputClass("description")}
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="Department description..."
            />
            {touched.description && errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
            <p className="text-xs text-slate-400">{form.description.length}/500 characters</p>
          </div>

          {/* Active & Display Order Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                className="select"
                value={String(form.active)}
                onChange={(e) => updateField("active", e.target.value === "true")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Display Order</label>
              <input
                type="number"
                className={inputClass("displayOrder")}
                value={form.displayOrder}
                onChange={(e) => updateField("displayOrder", e.target.value)}
                onBlur={() => handleBlur("displayOrder")}
                placeholder="0"
                min="0"
              />
              {touched.displayOrder && errors.displayOrder && (
                <p className="text-xs text-red-500">{errors.displayOrder}</p>
              )}
            </div>
          </div>

          {/* Icon URL - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Icon URL</label>
            <input
              className={inputClass("iconUrl")}
              value={form.iconUrl}
              onChange={(e) => updateField("iconUrl", e.target.value)}
              onBlur={() => handleBlur("iconUrl")}
              placeholder="https://..."
            />
            {touched.iconUrl && errors.iconUrl && (
              <p className="text-xs text-red-500">{errors.iconUrl}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={save.isPending}>
            {save.isPending ? "Saving..." : isEdit ? "Update Department" : "Create Department"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  // Separate search input state for immediate UI update
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    active: ""
  });
  const [showForm, setShowForm] = useState(null);

  // Update filters.search when debounced value changes
  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ["departments", filters],
    queryFn: async () => {
      // Remove empty string values before sending to API
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "")
      );
      return (await api.get("/departments", { params })).data;
    }
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/departments/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
    onError: (error) => {
      console.error("Delete error:", error);
      alert(error.response?.data?.error || "Failed to delete department");
    }
  });

  const items = data?.items || [];
  const page = data?.page || 1;
  const total = data?.total || 0;
  const pageSize = data?.pageSize || filters.pageSize;

  const onChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Building2 className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Departments Management</h1>
            <p className="text-sm text-slate-500">Organize hospital departments and specializations</p>
          </div>
        </div>
        <button
          className="btn bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
          onClick={() => setShowForm({})}>
          <Plus size={18} />
          Add Department
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-600 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                className="input pl-10 pr-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search departments..."
              />
              {searchInput !== debouncedSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-[140px]">
            <label className="text-sm text-slate-600 mb-1 block">Status</label>
            <select
              className="select"
              name="active"
              value={filters.active}
              onChange={onChange}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
            Loading departments...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Building2 className="mx-auto mb-2 text-slate-300" size={40} />
            <p>No departments found</p>
            <p className="text-sm mt-1">
              {filters.search || filters.active
                ? "Try adjusting your filters."
                : "Add a new department to get started."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold">Department</th>
                <th className="p-3 text-left font-semibold">Description</th>
                <th className="p-3 text-center font-semibold">Doctors</th>
                <th className="p-3 text-center font-semibold">Status</th>
                <th className="p-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b hover:bg-slate-50 transition">
                  <td className="p-3">
                    <Link
                      className="flex items-center gap-3 group"
                      to={`/departments/${d.id}`}>
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        {d.iconUrl ? (
                          <img src={d.iconUrl} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          <Building2 size={18} className="text-indigo-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 group-hover:text-indigo-600 transition">
                          {d.name}
                        </div>
                        {d.displayOrder !== null && (
                          <div className="text-xs text-slate-400">Order: {d.displayOrder}</div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">
                    {d.description || "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      <Users size={12} />
                      {d.doctorCount || 0}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      d.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {d.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                        onClick={() => setShowForm(d)}
                        title="Edit">
                        <Edit2 size={16} className="text-slate-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Confirm delete",
                            message: `Delete department "${d.name}"? ${d.doctorCount > 0 ? `This department has ${d.doctorCount} doctor(s). They will need to be reassigned.` : ""}`,
                            danger: true
                          });
                          if (!ok) return;
                          del.mutate(d.id);
                        }}
                        disabled={del.isPending}
                        title="Delete">
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pager
        page={page}
        total={total}
        pageSize={pageSize}
        onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
      />

      {showForm && (
        <DepartmentFormModal
          initial={showForm.id ? showForm : null}
          onClose={() => setShowForm(null)}
        />
      )}
    </div>
  );
}
