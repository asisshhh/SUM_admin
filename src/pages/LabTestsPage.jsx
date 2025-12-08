import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { FlaskConical, Search, Plus, Edit2, Trash2, Home, Star, X, Check, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/***************************************************************
 * PAGINATION
 ***************************************************************/
function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 20)));
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

/***************************************************************
 * LAB TEST FORM MODAL
 ***************************************************************/
function LabTestFormModal({ test, categories, onClose }) {
  const qc = useQueryClient();
  const isNew = !test?.id;

  const [form, setForm] = useState({
    code: test?.code || "",
    name: test?.name || "",
    description: test?.description || "",
    sampleType: test?.sampleType || "",
    sampleVolume: test?.sampleVolume || "",
    preparation: test?.preparation || "",
    normalRange: test?.normalRange || "",
    unit: test?.unit || "",
    method: test?.method || "",
    price: test?.price || "",
    discountPrice: test?.discountPrice || "",
    mrp: test?.mrp || "",
    turnaroundTime: test?.turnaroundTime || "",
    homeCollection: test?.homeCollection ?? true,
    popular: test?.popular ?? false,
    displayOrder: test?.displayOrder || 0,
    active: test?.active ?? true,
    categoryId: test?.categoryId || ""
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.code?.trim()) errs.code = "Test code is required";
    if (!form.name?.trim()) errs.name = "Test name is required";
    if (!form.price || parseFloat(form.price) <= 0) errs.price = "Valid price is required";
    if (form.discountPrice && parseFloat(form.discountPrice) > parseFloat(form.price)) {
      errs.discountPrice = "Discount price cannot be greater than price";
    }
    return errs;
  };

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
  };

  const handleBlur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const save = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        return (await api.post("/lab-tests", data)).data;
      }
      return (await api.put(`/lab-tests/${test.id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-tests"] });
      onClose();
    }
  });

  const handleSubmit = () => {
    const errs = validate();
    setTouched({ code: true, name: true, price: true });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      ...form,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
      mrp: form.mrp ? parseFloat(form.mrp) : null,
      displayOrder: parseInt(form.displayOrder) || 0,
      categoryId: form.categoryId ? parseInt(form.categoryId) : null
    };

    save.mutate(payload);
  };

  const inputClass = (field) =>
    `input ${touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FlaskConical className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isNew ? "Add New Lab Test" : "Edit Lab Test"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {save.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {save.error?.response?.data?.error || "Failed to save lab test"}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Test Code <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("code")}
                value={form.code}
                onChange={(e) => updateField("code", e.target.value.toUpperCase())}
                onBlur={() => handleBlur("code")}
                placeholder="e.g. CBC001"
              />
              {touched.code && errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Test Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("name")}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="e.g. Complete Blood Count"
              />
              {touched.name && errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Test description..."
            />
          </div>

          {/* Category & Sample Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <select
                className="select"
                value={form.categoryId}
                onChange={(e) => updateField("categoryId", e.target.value)}>
                <option value="">Select Category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Sample Type</label>
              <input
                className="input"
                value={form.sampleType}
                onChange={(e) => updateField("sampleType", e.target.value)}
                placeholder="e.g. Blood, Urine"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Sample Volume</label>
              <input
                className="input"
                value={form.sampleVolume}
                onChange={(e) => updateField("sampleVolume", e.target.value)}
                placeholder="e.g. 3ml"
              />
            </div>
          </div>

          {/* Pricing - Highlighted Section */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center gap-2">
              💰 Pricing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className={inputClass("price")}
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  onBlur={() => handleBlur("price")}
                  placeholder="500"
                  min="0"
                  step="0.01"
                />
                {touched.price && errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Discount Price (₹)</label>
                <input
                  type="number"
                  className={inputClass("discountPrice")}
                  value={form.discountPrice}
                  onChange={(e) => updateField("discountPrice", e.target.value)}
                  placeholder="450"
                  min="0"
                  step="0.01"
                />
                {touched.discountPrice && errors.discountPrice && (
                  <p className="text-xs text-red-500">{errors.discountPrice}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">MRP (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={form.mrp}
                  onChange={(e) => updateField("mrp", e.target.value)}
                  placeholder="600"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Turnaround Time</label>
              <input
                className="input"
                value={form.turnaroundTime}
                onChange={(e) => updateField("turnaroundTime", e.target.value)}
                placeholder="e.g. 24 hrs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Normal Range</label>
              <input
                className="input"
                value={form.normalRange}
                onChange={(e) => updateField("normalRange", e.target.value)}
                placeholder="e.g. 4.5-11.0"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Unit</label>
              <input
                className="input"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
                placeholder="e.g. x10³/µL"
              />
            </div>
          </div>

          {/* Preparation & Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Preparation Instructions</label>
              <input
                className="input"
                value={form.preparation}
                onChange={(e) => updateField("preparation", e.target.value)}
                placeholder="e.g. 8-12 hours fasting"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Method</label>
              <input
                className="input"
                value={form.method}
                onChange={(e) => updateField("method", e.target.value)}
                placeholder="e.g. Flow Cytometry"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.homeCollection}
                onChange={(e) => updateField("homeCollection", e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              <Home size={16} className="text-emerald-600" />
              <span className="text-sm">Home Collection</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => updateField("popular", e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <Star size={16} className="text-amber-500" />
              <span className="text-sm">Popular</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              <Check size={16} className="text-green-600" />
              <span className="text-sm">Active</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={save.isPending}>
            {save.isPending ? "Saving..." : isNew ? "Create Test" : "Update Test"}
          </button>
        </div>
      </div>
    </div>
  );
}

/***************************************************************
 * MAIN PAGE
 ***************************************************************/
export default function LabTestsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: "",
    categoryId: "",
    active: "all",
    popular: "all",
    homeCollection: "all",
    sortBy: "displayOrder",
    sortOrder: "asc"
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ["test-categories-all"],
    queryFn: async () => (await api.get("/test-categories", { params: { pageSize: 100 } })).data
  });
  const categories = categoriesData?.items || [];

  // Fetch lab tests
  const { data, isLoading } = useQuery({
    queryKey: ["lab-tests", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
      );
      return (await api.get("/lab-tests", { params })).data;
    }
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/lab-tests/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-tests"] }),
    onError: (err) => alert(err.response?.data?.error || "Delete failed")
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const onChange = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value, page: 1 }));

  const handleDelete = async (test) => {
    const ok = await confirm({
      title: "Delete Lab Test",
      message: `Are you sure you want to delete "${test.name}"?`,
      danger: true
    });
    if (ok) del.mutate(test.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <FlaskConical className="text-emerald-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Lab Tests Management</h1>
            <p className="text-sm text-slate-500">Manage lab tests, pricing, and categories</p>
          </div>
        </div>
        <button
          className="btn bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
          onClick={() => setEditing({})}>
          <Plus size={18} />
          Add Lab Test
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
                placeholder="Code, name, description..."
              />
              {searchInput !== debouncedSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Category Filter */}
          <div className="min-w-[160px]">
            <label className="text-sm text-slate-600 mb-1 block">Category</label>
            <select name="categoryId" className="select" value={filters.categoryId} onChange={onChange}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="min-w-[120px]">
            <label className="text-sm text-slate-600 mb-1 block">Status</label>
            <select name="active" className="select" value={filters.active} onChange={onChange}>
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Popular */}
          <div className="min-w-[120px]">
            <label className="text-sm text-slate-600 mb-1 block">Popular</label>
            <select name="popular" className="select" value={filters.popular} onChange={onChange}>
              <option value="all">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No lab tests found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold">Code</th>
                <th className="p-3 text-left font-semibold">Test Name</th>
                <th className="p-3 text-left font-semibold">Category</th>
                <th className="p-3 text-right font-semibold">Price</th>
                <th className="p-3 text-right font-semibold">Discount</th>
                <th className="p-3 text-center font-semibold">TAT</th>
                <th className="p-3 text-center font-semibold">Status</th>
                <th className="p-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b hover:bg-slate-50 transition">
                  <td className="p-3">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{t.code}</span>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-slate-800">{t.name}</div>
                    <div className="flex gap-2 mt-1">
                      {t.homeCollection && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Home size={10} /> Home
                        </span>
                      )}
                      {t.popular && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star size={10} /> Popular
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-slate-600">{t.category?.name || "—"}</td>
                  <td className="p-3 text-right font-semibold">₹{t.price?.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {t.discountPrice ? (
                      <span className="text-emerald-600 font-medium">₹{t.discountPrice?.toLocaleString()}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-center text-slate-600">{t.turnaroundTime || "—"}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {t.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                        onClick={() => setEditing(t)}
                        title="Edit">
                        <Edit2 size={16} className="text-slate-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                        onClick={() => handleDelete(t)}
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
        page={data?.page || 1}
        pageSize={data?.pageSize || 15}
        total={total}
        onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
      />

      {editing && (
        <LabTestFormModal
          test={editing}
          categories={categories}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

