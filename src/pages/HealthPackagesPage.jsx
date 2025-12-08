import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { Package, Search, Plus, Edit2, Trash2, X, Check, AlertCircle, Star, Sparkles, FlaskConical, ChevronLeft, ChevronRight } from "lucide-react";

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
 * TEST SELECTOR COMPONENT - With internal data fetching
 ***************************************************************/
function TestSelector({ selectedIds, onChange, existingTests }) {
  const [searchInput, setSearchInput] = useState("");
  const [showSelected, setShowSelected] = useState(true);

  // Debounce search
  const debouncedSearch = useDebounce(searchInput, 300);

  // Fetch tests with search
  const { data: testsData, isLoading } = useQuery({
    queryKey: ["lab-tests-selector", debouncedSearch],
    queryFn: async () => {
      const params = { pageSize: 100, active: "true" };
      if (debouncedSearch) params.search = debouncedSearch;
      return (await api.get("/lab-tests", { params })).data;
    }
  });

  const availableTests = testsData?.items || [];

  // Build a map of all tests (available + existing selected)
  const testMap = new Map();
  availableTests.forEach(t => testMap.set(t.id, t));
  existingTests?.forEach(t => {
    const id = t.testId || t.id;
    if (!testMap.has(id)) {
      testMap.set(id, { id, name: t.test?.name || t.name || `Test #${id}`, code: t.test?.code || t.code || '', price: t.test?.price || t.price || 0 });
    }
  });

  // Get selected test details
  const selectedTests = selectedIds.map(id => testMap.get(id)).filter(Boolean);

  const toggleTest = (testId) => {
    if (selectedIds.includes(testId)) {
      onChange(selectedIds.filter(id => id !== testId));
    } else {
      onChange([...selectedIds, testId]);
    }
  };

  const removeTest = (testId) => {
    onChange(selectedIds.filter(id => id !== testId));
  };

  return (
    <div className="space-y-3">
      {/* Selected Tests Display */}
      {selectedIds.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSelected(!showSelected)}
            className="w-full flex items-center justify-between p-3 bg-emerald-50 border-b text-left">
            <span className="text-sm font-medium text-emerald-800">
              ✓ {selectedIds.length} Test(s) Included
            </span>
            <span className="text-xs text-emerald-600">{showSelected ? "Hide" : "Show"}</span>
          </button>
          {showSelected && (
            <div className="max-h-40 overflow-y-auto divide-y">
              {selectedTests.map(test => (
                <div key={test.id} className="flex items-center justify-between px-4 py-2 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{test.name}</div>
                    <div className="text-xs text-slate-500">{test.code} {test.price ? `• ₹${test.price}` : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTest(test.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Tests Section */}
      <div className="border rounded-xl overflow-hidden">
        <div className="p-3 bg-slate-50 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="input pl-9 pr-8 text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tests by name or code..."
            />
            {searchInput !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
        <div className="h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
              Loading tests...
            </div>
          ) : availableTests.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              {debouncedSearch ? "No tests match your search" : "No lab tests available. Create lab tests first."}
            </div>
          ) : (
            availableTests.map(test => (
              <label
                key={test.id}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 transition ${
                  selectedIds.includes(test.id) ? 'bg-blue-50' : ''
                }`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(test.id)}
                  onChange={() => toggleTest(test.id)}
                  className="w-4 h-4 accent-blue-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{test.name}</div>
                  <div className="text-xs text-slate-500">
                    <span className="font-mono">{test.code}</span>
                    {test.price && <span> • ₹{test.price.toLocaleString()}</span>}
                    {test.category?.name && <span> • {test.category.name}</span>}
                  </div>
                </div>
                {selectedIds.includes(test.id) && (
                  <Check size={16} className="text-blue-600 flex-shrink-0" />
                )}
              </label>
            ))
          )}
        </div>
        <div className="px-3 py-2 bg-slate-50 border-t text-xs text-slate-500 flex justify-between">
          <span>Showing {availableTests.length} tests</span>
          {selectedIds.length > 0 && (
            <span className="text-blue-600 font-medium">{selectedIds.length} selected</span>
          )}
        </div>
      </div>
    </div>
  );
}

/***************************************************************
 * PACKAGE FORM MODAL
 ***************************************************************/
function PackageFormModal({ pkg, onClose }) {
  const qc = useQueryClient();
  const isNew = !pkg?.id;

  const [form, setForm] = useState({
    name: pkg?.name || "",
    description: pkg?.description || "",
    shortDesc: pkg?.shortDesc || "",
    price: pkg?.price || "",
    discountPrice: pkg?.discountPrice || "",
    mrp: pkg?.mrp || "",
    validityDays: pkg?.validityDays || "",
    imageUrl: pkg?.imageUrl || "",
    preparation: pkg?.preparation || "",
    reportTime: pkg?.reportTime || "",
    sampleType: pkg?.sampleType || "",
    popular: pkg?.popular ?? false,
    featured: pkg?.featured ?? false,
    displayOrder: pkg?.displayOrder || 0,
    active: pkg?.active ?? true,
    testIds: pkg?.tests?.map(t => t.testId || t.id) || []
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = () => {
    const errs = {};

    // Name validation (required, 2-200 chars)
    if (!form.name?.trim()) {
      errs.name = "Package name is required";
    } else if (form.name.trim().length < 2) {
      errs.name = "Name must be at least 2 characters";
    } else if (form.name.trim().length > 200) {
      errs.name = "Name cannot exceed 200 characters";
    }

    // Price validation (required, > 0)
    if (!form.price || form.price === "") {
      errs.price = "Price is required";
    } else if (parseFloat(form.price) <= 0) {
      errs.price = "Price must be greater than 0";
    }

    // Discount price validation (optional, must be <= price)
    if (form.discountPrice && form.discountPrice !== "") {
      if (parseFloat(form.discountPrice) <= 0) {
        errs.discountPrice = "Discount price must be greater than 0";
      } else if (parseFloat(form.discountPrice) > parseFloat(form.price || 0)) {
        errs.discountPrice = "Discount price cannot be greater than price";
      }
    }

    // MRP validation (optional, must be >= 0)
    if (form.mrp && form.mrp !== "" && parseFloat(form.mrp) < 0) {
      errs.mrp = "MRP cannot be negative";
    }

    // Validity days validation (optional, must be >= 1)
    if (form.validityDays && form.validityDays !== "") {
      const days = parseInt(form.validityDays);
      if (isNaN(days) || days < 1) {
        errs.validityDays = "Validity must be at least 1 day";
      }
    }

    // Image URL validation (optional, must be valid URL)
    if (form.imageUrl && form.imageUrl.trim()) {
      try {
        new URL(form.imageUrl);
      } catch {
        errs.imageUrl = "Please enter a valid URL";
      }
    }

    // Short description validation (optional, max 300 chars)
    if (form.shortDesc && form.shortDesc.length > 300) {
      errs.shortDesc = "Short description cannot exceed 300 characters";
    }

    // Description validation (optional, max 2000 chars)
    if (form.description && form.description.length > 2000) {
      errs.description = "Description cannot exceed 2000 characters";
    }

    setErrors(errs);
    return errs;
  };

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    validate();
  };

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const save = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        return (await api.post("/health-packages", data)).data;
      }
      return (await api.put(`/health-packages/${pkg.id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health-packages"] });
      onClose();
    }
  });

  const handleSubmit = () => {
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(form).forEach((key) => (allTouched[key] = true));
    setTouched(allTouched);

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      shortDesc: form.shortDesc?.trim() || null,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
      mrp: form.mrp ? parseFloat(form.mrp) : null,
      validityDays: form.validityDays ? parseInt(form.validityDays) : null,
      imageUrl: form.imageUrl?.trim() || null,
      preparation: form.preparation?.trim() || null,
      reportTime: form.reportTime?.trim() || null,
      sampleType: form.sampleType?.trim() || null,
      popular: form.popular,
      featured: form.featured,
      displayOrder: parseInt(form.displayOrder) || 0,
      active: form.active,
      testIds: form.testIds
    };

    save.mutate(payload);
  };

  const inputClass = (field) =>
    `input ${touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""}`;

  // Calculate savings
  const savings = form.price && form.discountPrice
    ? (parseFloat(form.price) - parseFloat(form.discountPrice)).toFixed(0)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Package className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isNew ? "Create Health Package" : "Edit Health Package"}
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
              {save.error?.response?.data?.error || "Failed to save package"}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">
                Package Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("name")}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="e.g. Full Body Checkup"
              />
              {touched.name && errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Short Description</label>
              <input
                className={inputClass("shortDesc")}
                value={form.shortDesc}
                onChange={(e) => updateField("shortDesc", e.target.value)}
                onBlur={() => handleBlur("shortDesc")}
                placeholder="Brief tagline for the package"
                maxLength={300}
              />
              {touched.shortDesc && errors.shortDesc && <p className="text-xs text-red-500">{errors.shortDesc}</p>}
              <p className="text-xs text-slate-400">{form.shortDesc?.length || 0}/300</p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Full Description</label>
              <textarea
                className={inputClass("description")}
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                onBlur={() => handleBlur("description")}
                placeholder="Detailed package description..."
                maxLength={2000}
              />
              {touched.description && errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
              <p className="text-xs text-slate-400">{form.description?.length || 0}/2000</p>
            </div>
          </div>

          {/* Pricing - Highlighted Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
              💰 Package Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  placeholder="2999"
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
                  onBlur={() => handleBlur("discountPrice")}
                  placeholder="1999"
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
                  className={inputClass("mrp")}
                  value={form.mrp}
                  onChange={(e) => updateField("mrp", e.target.value)}
                  onBlur={() => handleBlur("mrp")}
                  placeholder="3999"
                  min="0"
                  step="0.01"
                />
                {touched.mrp && errors.mrp && <p className="text-xs text-red-500">{errors.mrp}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Validity (Days)</label>
                <input
                  type="number"
                  className={inputClass("validityDays")}
                  value={form.validityDays}
                  onChange={(e) => updateField("validityDays", e.target.value)}
                  onBlur={() => handleBlur("validityDays")}
                  placeholder="30"
                  min="1"
                />
                {touched.validityDays && errors.validityDays && <p className="text-xs text-red-500">{errors.validityDays}</p>}
              </div>
            </div>

            {savings && (
              <div className="mt-3 text-sm text-green-700 font-medium">
                💸 Customer saves ₹{savings} ({((savings / form.price) * 100).toFixed(0)}% off)
              </div>
            )}
          </div>

          {/* Tests Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FlaskConical size={16} className="text-emerald-600" />
              Included Lab Tests
            </h3>
            <TestSelector
              selectedIds={form.testIds}
              onChange={(ids) => updateField("testIds", ids)}
              existingTests={pkg?.tests}
            />
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="text-sm font-medium">Report Time</label>
              <input
                className="input"
                value={form.reportTime}
                onChange={(e) => updateField("reportTime", e.target.value)}
                placeholder="e.g. 24-48 hrs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Display Order</label>
              <input
                type="number"
                className="input"
                value={form.displayOrder}
                onChange={(e) => updateField("displayOrder", e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Preparation */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Preparation Instructions</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.preparation}
              onChange={(e) => updateField("preparation", e.target.value)}
              placeholder="e.g. 10-12 hours fasting required"
            />
          </div>

          {/* Image URL */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Image URL</label>
            <input
              className={inputClass("imageUrl")}
              value={form.imageUrl}
              onChange={(e) => updateField("imageUrl", e.target.value)}
              onBlur={() => handleBlur("imageUrl")}
              placeholder="https://..."
            />
            {touched.imageUrl && errors.imageUrl && <p className="text-xs text-red-500">{errors.imageUrl}</p>}
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
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
                checked={form.featured}
                onChange={(e) => updateField("featured", e.target.checked)}
                className="w-4 h-4 accent-purple-600"
              />
              <Sparkles size={16} className="text-purple-600" />
              <span className="text-sm">Featured</span>
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
            className="btn bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleSubmit}
            disabled={save.isPending}>
            {save.isPending ? "Saving..." : isNew ? "Create Package" : "Update Package"}
          </button>
        </div>
      </div>
    </div>
  );
}

/***************************************************************
 * MAIN PAGE
 ***************************************************************/
export default function HealthPackagesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: "",
    active: "all",
    popular: "all",
    featured: "all",
    sortBy: "displayOrder",
    sortOrder: "asc"
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch packages
  const { data, isLoading } = useQuery({
    queryKey: ["health-packages", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
      );
      return (await api.get("/health-packages", { params })).data;
    }
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/health-packages/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["health-packages"] }),
    onError: (err) => alert(err.response?.data?.error || "Delete failed")
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const onChange = (e) => setFilters((f) => ({ ...f, [e.target.name]: e.target.value, page: 1 }));

  const handleDelete = async (pkg) => {
    const ok = await confirm({
      title: "Delete Package",
      message: `Are you sure you want to delete "${pkg.name}"?`,
      danger: true
    });
    if (ok) del.mutate(pkg.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Package className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Health Packages</h1>
            <p className="text-sm text-slate-500">Manage health checkup packages and pricing</p>
          </div>
        </div>
        <button
          className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          onClick={() => setEditing({})}>
          <Plus size={18} />
          Create Package
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
                placeholder="Package name..."
              />
              {searchInput !== debouncedSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
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

          {/* Featured */}
          <div className="min-w-[120px]">
            <label className="text-sm text-slate-600 mb-1 block">Featured</label>
            <select name="featured" className="select" value={filters.featured} onChange={onChange}>
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
          <div className="p-8 text-center text-slate-500">No packages found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold">Package</th>
                <th className="p-3 text-right font-semibold">Price</th>
                <th className="p-3 text-right font-semibold">Discount</th>
                <th className="p-3 text-center font-semibold">Tests</th>
                <th className="p-3 text-center font-semibold">Validity</th>
                <th className="p-3 text-center font-semibold">Status</th>
                <th className="p-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((pkg) => (
                <tr key={pkg.id} className="border-b hover:bg-slate-50 transition">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {pkg.imageUrl ? (
                        <img src={pkg.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package size={20} className="text-blue-600" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-slate-800">{pkg.name}</div>
                        <div className="flex gap-2 mt-1">
                          {pkg.popular && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star size={10} /> Popular
                            </span>
                          )}
                          {pkg.featured && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Sparkles size={10} /> Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-semibold">₹{pkg.price?.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {pkg.discountPrice ? (
                      <span className="text-green-600 font-medium">₹{pkg.discountPrice?.toLocaleString()}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {pkg.testCount || pkg.tests?.length || 0} tests
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-600">
                    {pkg.validityDays ? `${pkg.validityDays} days` : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pkg.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {pkg.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                        onClick={() => setEditing(pkg)}
                        title="Edit">
                        <Edit2 size={16} className="text-slate-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                        onClick={() => handleDelete(pkg)}
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
        <PackageFormModal
          pkg={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

