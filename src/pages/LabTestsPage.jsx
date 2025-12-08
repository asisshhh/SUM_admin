import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { FlaskConical, Search, Plus } from "lucide-react";

// Components
import { Pagination } from "../components/shared";
import { LabTestFormModal, LabTestTableRow } from "../components/lab-tests";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Table columns
const TABLE_COLUMNS = [
  { key: "code", label: "Code" },
  { key: "name", label: "Test Name" },
  { key: "category", label: "Category" },
  { key: "price", label: "Price", align: "right" },
  { key: "discountPrice", label: "Discount", align: "right" },
  { key: "tat", label: "TAT", align: "center" },
  { key: "status", label: "Status", align: "center" },
  { key: "actions", label: "Actions", align: "center" }
];

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

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["test-categories-all"],
    queryFn: async () => (await api.get("/test-categories", { params: { pageSize: 100 } })).data,
    staleTime: 5 * 60 * 1000
  });

  const categories = useMemo(() => categoriesData?.items || [], [categoriesData]);

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

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/lab-tests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-tests"] })
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

  const handleDelete = useCallback(async (test) => {
    const ok = await confirm({
      title: "Delete Lab Test",
      message: `Are you sure you want to delete "${test.name}"?`,
      danger: true
    });
    if (ok) deleteMutation.mutate(test.id);
  }, [confirm, deleteMutation]);

  const handleEdit = useCallback((test) => {
    setEditing(test);
  }, []);

  const handleCloseForm = useCallback(() => {
    setEditing(null);
  }, []);

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

          {/* Category */}
          <div className="min-w-[160px]">
            <label className="text-sm text-slate-600 mb-1 block">Category</label>
            <select name="categoryId" className="select" value={filters.categoryId} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="min-w-[120px]">
            <label className="text-sm text-slate-600 mb-1 block">Status</label>
            <select name="active" className="select" value={filters.active} onChange={handleFilterChange}>
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Popular */}
          <div className="min-w-[120px]">
            <label className="text-sm text-slate-600 mb-1 block">Popular</label>
            <select name="popular" className="select" value={filters.popular} onChange={handleFilterChange}>
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
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
            Loading lab tests...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FlaskConical className="mx-auto mb-2 text-slate-300" size={40} />
            <p>No lab tests found</p>
            <p className="text-sm mt-1">
              {filters.search || filters.categoryId || filters.active !== "all"
                ? "Try adjusting your filters."
                : "Add a new lab test to get started."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {TABLE_COLUMNS.map(({ key, label, align }) => (
                  <th key={key} className={`p-3 font-semibold text-${align || "left"}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((test) => (
                <LabTestTableRow
                  key={test.id}
                  test={test}
                  onEdit={() => handleEdit(test)}
                  onDelete={() => handleDelete(test)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        page={data?.page || 1}
        total={total}
        pageSize={data?.pageSize || 15}
        onPage={handlePageChange}
      />

      {/* Modal */}
      {editing !== null && (
        <LabTestFormModal
          test={editing.id ? editing : null}
          categories={categories}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
