import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePagePermissions } from "../hooks/usePagePermissions";
import { Building2, Search, Plus } from "lucide-react";

// Components
import {
  DepartmentFormModal,
  DepartmentTableRow
} from "../components/departments";

// Custom hook for debounced value
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Table columns config
const TABLE_COLUMNS = [
  { key: "name", label: "Department" },
  { key: "description", label: "Description" },
  { key: "doctorCount", label: "Doctors", center: true },
  { key: "active", label: "Status", center: true },
  { key: "actions", label: "Actions", center: true }
];

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  // State
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [showForm, setShowForm] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    active: ""
  });

  // Update search filter when debounced value changes
  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch }));
  }, [debouncedSearch]);

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ["departments", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "")
      );
      return (await api.get("/departments", { params })).data;
    }
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] })
  });

  // Derived state
  const items = data?.items || [];

  // Handlers
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  }, []);

  const handleDelete = useCallback(
    async (department) => {
      const ok = await confirm({
        title: "Confirm delete",
        message: `Delete department "${department.name}"? ${
          department.doctorCount > 0
            ? `This department has ${department.doctorCount} doctor(s). They will need to be reassigned.`
            : ""
        }`,
        danger: true
      });
      if (ok) deleteMutation.mutate(department.id);
    },
    [confirm, deleteMutation]
  );

  const handleEdit = useCallback((department) => {
    setShowForm(department);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Building2 className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Departments Management
            </h1>
            <p className="text-sm text-slate-500">
              Organize hospital departments and specializations
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            className="btn bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
            onClick={() => setShowForm({})}>
            <Plus size={18} />
            Add Department
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

          {/* Status */}
          <div className="min-w-[140px]">
            <label className="text-sm text-slate-600 mb-1 block">Status</label>
            <select
              className="select"
              name="active"
              value={filters.active}
              onChange={handleFilterChange}>
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
                {TABLE_COLUMNS.map(({ key, label, center }) => (
                  <th
                    key={key}
                    className={`p-3 font-semibold ${
                      center ? "text-center" : "text-left"
                    }`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((department) => (
                <DepartmentTableRow
                  key={department.id}
                  department={department}
                  onEdit={() => handleEdit(department)}
                  onDelete={() => handleDelete(department)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showForm !== null && (
        <DepartmentFormModal
          initial={showForm.id ? showForm : null}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
