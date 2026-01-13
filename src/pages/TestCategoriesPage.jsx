import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePagePermissions } from "../hooks/usePagePermissions";
import {
  FolderTree,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  GripVertical,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

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
        Showing <span className="font-medium">{start}</span> to{" "}
        <span className="font-medium">{end}</span> of{" "}
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
 * CATEGORY FORM MODAL
 ***************************************************************/
function CategoryFormModal({ category, onClose }) {
  const qc = useQueryClient();
  const isNew = !category?.id;

  const [form, setForm] = useState({
    name: category?.name || "",
    description: category?.description || "",
    displayOrder: category?.displayOrder || 0,
    active: category?.active ?? true
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name?.trim()) errs.name = "Category name is required";
    if (form.name?.trim()?.length < 2)
      errs.name = "Name must be at least 2 characters";
    return errs;
  };

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleBlur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const save = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        return (await api.post("/test-categories", data)).data;
      }
      return (await api.put(`/test-categories/${category.id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-categories"] });
      onClose();
    }
  });

  const handleSubmit = () => {
    const errs = validate();
    setTouched({ name: true });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      ...form,
      displayOrder: parseInt(form.displayOrder) || 0
    };

    save.mutate(payload);
  };

  const inputClass = (field) =>
    `input ${
      touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-violet-500 to-purple-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FolderTree className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isNew ? "Add New Category" : "Edit Category"}
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
              {save.error?.response?.data?.error || "Failed to save category"}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass("name")}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="e.g. Hematology"
            />
            {touched.name && errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Category description..."
            />
          </div>

          {/* Display Order & Active */}
          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                className="select"
                value={String(form.active)}
                onChange={(e) =>
                  updateField("active", e.target.value === "true")
                }>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-violet-600 text-white hover:bg-violet-700"
            onClick={handleSubmit}
            disabled={save.isPending}>
            {save.isPending
              ? "Saving..."
              : isNew
              ? "Create Category"
              : "Update Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

/***************************************************************
 * MAIN PAGE
 ***************************************************************/
export default function TestCategoriesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { canCreate, canEdit, canDelete } = usePagePermissions();
  const [editing, setEditing] = useState(null);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    search: "",
    active: "all"
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Fetch categories
  const { data, isLoading } = useQuery({
    queryKey: ["test-categories", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
      );
      return (await api.get("/test-categories", { params })).data;
    }
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/test-categories/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["test-categories"] }),
    onError: (err) => alert(err.response?.data?.error || "Delete failed")
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const onChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value, page: 1 }));

  const handleDelete = async (cat) => {
    if (cat.testCount > 0) {
      alert(
        `Cannot delete category with ${cat.testCount} linked tests. Remove or reassign tests first.`
      );
      return;
    }
    const ok = await confirm({
      title: "Delete Category",
      message: `Are you sure you want to delete "${cat.name}"?`,
      danger: true
    });
    if (ok) del.mutate(cat.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <FolderTree className="text-violet-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Test Categories
            </h1>
            <p className="text-sm text-slate-500">
              Organize lab tests into categories
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            className="btn bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2"
            onClick={() => setEditing({})}>
            <Plus size={18} />
            Add Category
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-600 mb-1 block">Search</label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                className="input !pl-12 pr-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search categories..."
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
            <select
              name="active"
              className="select"
              value={filters.active}
              onChange={onChange}>
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No categories found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold w-12">#</th>
                <th className="p-3 text-left font-semibold">Category Name</th>
                <th className="p-3 text-left font-semibold">Description</th>
                <th className="p-3 text-center font-semibold">Tests</th>
                <th className="p-3 text-center font-semibold">Order</th>
                <th className="p-3 text-center font-semibold">Status</th>
                <th className="p-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((cat, idx) => (
                <tr
                  key={cat.id}
                  className="border-b hover:bg-slate-50 transition">
                  <td className="p-3 text-slate-400">
                    <GripVertical size={16} className="cursor-move" />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                        <FolderTree size={16} className="text-violet-600" />
                      </div>
                      <span className="font-medium text-slate-800">
                        {cat.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-600 max-w-xs truncate">
                    {cat.description || "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                      {cat.testCount || 0} tests
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-600">
                    {cat.displayOrder}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cat.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {cat.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      {canEdit && (
                        <button
                          className="p-2 hover:bg-slate-100 rounded-lg transition"
                          onClick={() => setEditing(cat)}
                          title="Edit">
                          <Edit2 size={16} className="text-slate-600" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                          onClick={() => handleDelete(cat)}
                          title="Delete"
                          disabled={cat.testCount > 0}>
                          <Trash2
                            size={16}
                            className={
                              cat.testCount > 0
                                ? "text-slate-300"
                                : "text-red-500"
                            }
                          />
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
        )}
      </div>

      <Pager
        page={data?.page || 1}
        pageSize={data?.pageSize || 20}
        total={total}
        onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
      />

      {editing && (
        <CategoryFormModal
          category={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
