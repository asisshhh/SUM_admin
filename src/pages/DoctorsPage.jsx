import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePagePermissions } from "../hooks/usePagePermissions";
import { Stethoscope, Search, Plus, Trash2 } from "lucide-react";

// Components
import { Pagination, SearchableDropdown } from "../components/shared";
import { DoctorFormModal, DoctorTableRow } from "../components/doctors";

// Custom hook for debounced value
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Table header columns config
const TABLE_COLUMNS = [
  { key: "name", label: "Doctor" },
  { key: "specialization", label: "Specialization" },
  { key: "department", label: "Department" },
  { key: "experience", label: "Experience" },
  { key: "consultationFee", label: "Fee" },
  { key: "available", label: "Status" }
];

export default function DoctorsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { canCreate, canEdit, canDelete } = usePagePermissions();

  // State
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    departmentId: "",
    available: "",
    sortBy: "name",
    sortOrder: "asc"
  });

  // Update search filter when debounced value changes
  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Queries
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get("/departments")).data,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const { data, isLoading } = useQuery({
    queryKey: ["doctors", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "")
      );
      return (await api.get("/doctors", { params })).data;
    }
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/doctors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctors"] })
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) =>
      Promise.all(ids.map((id) => api.delete(`/doctors/${id}`))),
    onSuccess: () => {
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["doctors"] });
    }
  });

  // Derived state
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

  const toggleSelect = useCallback((id) => {
    setSelected((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]
    );
  }, []);

  const toggleSelectAll = useCallback(
    (checked) => {
      setSelected(checked ? items.map((d) => d.id) : []);
    },
    [items]
  );

  const toggleSort = useCallback((field) => {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "asc" ? "desc" : "asc"
    }));
  }, []);

  const handleDelete = useCallback(
    async (doctor) => {
      const ok = await confirm({
        title: "Confirm delete",
        message: `Permanently delete ${doctor.user?.name}? This action cannot be undone.`,
        danger: true
      });
      if (ok) deleteMutation.mutate(doctor.id);
    },
    [confirm, deleteMutation]
  );

  const handleBulkDelete = useCallback(async () => {
    const ok = await confirm({
      title: "Confirm Bulk Delete",
      message: `Delete ${selected.length} selected doctor(s)?`,
      danger: true
    });
    if (ok) bulkDeleteMutation.mutate(selected);
  }, [confirm, selected, bulkDeleteMutation]);

  // Memoized department options
  const departmentOptions = useMemo(
    () => departments?.items ?? [],
    [departments]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Stethoscope className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Doctors Management
            </h1>
            <p className="text-sm text-slate-500">
              Manage doctors, schedules, and availability
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            onClick={() => setEditing({})}>
            <Plus size={18} />
            Add Doctor
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
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
                size={18}
              />
              <input
                className="input !pl-12 pr-8"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Name, specialization, registration..."
              />
              {searchInput !== debouncedSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Department */}
          <div className="min-w-[180px]">
            <SearchableDropdown
              label="Department"
              value={filters.departmentId}
              options={[
                { value: "", label: "All Departments" },
                ...departmentOptions.map((d) => ({
                  value: String(d.id),
                  label: d.name
                }))
              ]}
              onChange={(value) =>
                setFilters((f) => ({ ...f, departmentId: value, page: 1 }))
              }
              placeholder="All Departments"
            />
          </div>

          {/* Availability */}
          <div className="min-w-[160px]">
            <SearchableDropdown
              label="Availability"
              value={filters.available}
              options={[
                { value: "", label: "All" },
                { value: "true", label: "Available" },
                { value: "false", label: "Unavailable" }
              ]}
              onChange={(value) =>
                setFilters((f) => ({ ...f, available: value, page: 1 }))
              }
              placeholder="All"
            />
          </div>

          {/* Bulk Delete */}
          {selected.length > 0 && (
            <button
              className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              onClick={handleBulkDelete}>
              <Trash2 size={16} />
              Delete ({selected.length})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
            Loading doctors...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Stethoscope className="mx-auto mb-2 text-slate-300" size={40} />
            <p>No doctors found</p>
            <p className="text-sm mt-1">
              {filters.search || filters.departmentId || filters.available
                ? "Try adjusting your filters."
                : "Add a new doctor to get started."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-blue-600"
                    checked={
                      selected.length === items.length && items.length > 0
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                {TABLE_COLUMNS.map(({ key, label }) => (
                  <th
                    key={key}
                    className="p-3 text-left font-semibold cursor-pointer select-none hover:bg-slate-100 transition"
                    onClick={() => toggleSort(key)}>
                    <div className="flex items-center gap-1">
                      {label}
                      {filters.sortBy === key && (
                        <span className="text-blue-600">
                          {filters.sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((doctor) => (
                <DoctorTableRow
                  key={doctor.id}
                  doctor={doctor}
                  isSelected={selected.includes(doctor.id)}
                  onSelect={() => toggleSelect(doctor.id)}
                  onEdit={() => setEditing(doctor)}
                  onDelete={() => handleDelete(doctor)}
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
        pageSize={data?.pageSize || 10}
        onPage={handlePageChange}
      />

      {/* Modal */}
      {editing !== null && (
        <DoctorFormModal
          doc={editing.id ? editing : null}
          departments={departments}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
