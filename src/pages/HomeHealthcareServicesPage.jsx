import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePagePermissions } from "../hooks/usePagePermissions";
import { Home, Plus } from "lucide-react";
import { toast } from "react-toastify";

// Components
import { Pagination } from "../components/shared";
import {
  ServiceFormModal,
  ServiceTableRow,
  ServiceViewModal
} from "../components/home-healthcare";

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
  { key: "name", label: "Service Name" },
  { key: "category", label: "Category" },
  { key: "duration", label: "Duration", align: "center" },
  { key: "price", label: "Price", align: "right" },
  { key: "discountPrice", label: "Discount", align: "right" },
  { key: "status", label: "Status", align: "center" },
  { key: "actions", label: "Actions", align: "center" }
];

export default function HomeHealthcareServicesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { canCreate, canEdit, canDelete } = usePagePermissions();
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

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

  // Fetch services
  const { data, isLoading } = useQuery({
    queryKey: ["home-healthcare-services", filters],
    queryFn: async () => {
      const params = {};
      
      // Build params, handling "all" values appropriately
      Object.entries(filters).forEach(([k, v]) => {
        if (k === "active") {
          // For active filter, send the value as-is
          // API accepts "all", "true", or "false" as string values
          if (v !== "") {
            params[k] = v;
          }
        } else if (v !== "" && v !== "all") {
          // For other filters, exclude empty and "all" values
          params[k] = v;
        }
      });
      
      return (await api.get("/home-healthcare-services", { params })).data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/home-healthcare-services/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-healthcare-services"] });
      toast.success("Service deleted successfully");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || "Failed to delete service");
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
    async (service) => {
      const ok = await confirm({
        title: "Delete Service",
        message: `Are you sure you want to delete "${service.name}"?`,
        danger: true
      });
      if (ok) deleteMutation.mutate(service.id);
    },
    [confirm, deleteMutation]
  );

  const handleView = useCallback((service) => {
    setViewing(service);
  }, []);

  const handleCloseView = useCallback(() => {
    setViewing(null);
  }, []);

  const handleEdit = useCallback((service) => {
    setEditing(service);
  }, []);

  const handleCloseForm = useCallback(() => {
    setEditing(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Home className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Home Healthcare Services
            </h1>
            <p className="text-sm text-slate-500">
              Manage home healthcare services and pricing
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            className="btn bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
            onClick={() => setEditing({})}>
            <Plus size={18} />
            Add Service
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
              <input
                className="input pr-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Service name..."
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
              onChange={handleFilterChange}>
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Popular */}
          <div className="min-w-[120px]">
            <label className="text-sm text-slate-600 mb-1 block">Popular</label>
            <select
              name="popular"
              className="select"
              value={filters.popular}
              onChange={handleFilterChange}>
              <option value="all">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Featured */}
          <div className="min-w-[120px]">
            <label className="text-sm text-slate-600 mb-1 block">
              Featured
            </label>
            <select
              name="featured"
              className="select"
              value={filters.featured}
              onChange={handleFilterChange}>
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
            Loading services...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Home className="mx-auto mb-2 text-slate-300" size={40} />
            <p>No services found</p>
            <p className="text-sm mt-1">
              {filters.search ||
              filters.active !== "all" ||
              filters.popular !== "all"
                ? "Try adjusting your filters."
                : "Create a new service to get started."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {TABLE_COLUMNS.map(({ key, label, align }) => (
                  <th
                    key={key}
                    className={`p-3 font-semibold text-${align || "left"}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((service) => (
                <ServiceTableRow
                  key={service.id}
                  service={service}
                  onView={() => handleView(service)}
                  onEdit={() => handleEdit(service)}
                  onDelete={() => handleDelete(service)}
                  canEdit={canEdit}
                  canDelete={canDelete}
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

      {/* View Modal */}
      {viewing && (
        <ServiceViewModal service={viewing} onClose={handleCloseView} />
      )}

      {/* Edit Modal */}
      {editing !== null && (
        <ServiceFormModal
          service={editing.id ? editing : null}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}