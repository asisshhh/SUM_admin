import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";

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
  return (
    <div className="flex items-center gap-3 justify-end mt-4">
      <button
        className="btn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span className="text-sm">
        Page {page} / {pages}
      </span>
      <button
        className="btn"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}>
        Next
      </button>
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

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return (
          await api.put(`/departments/${initial.id}`, {
            ...form,
            displayOrder:
              form.displayOrder !== "" ? Number(form.displayOrder) : null
          })
        ).data;
      }
      return (
        await api.post(`/departments`, {
          ...form,
          displayOrder:
            form.displayOrder !== "" ? Number(form.displayOrder) : null
        })
      ).data;
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

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center">
      <div className="card p-6 w-full max-w-lg space-y-3">
        <h2 className="text-xl font-semibold">
          {isEdit ? "Edit" : "Add"} Department
        </h2>
        <label className="text-sm">Name</label>
        <input
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <label className="text-sm">Description</label>
        <input
          className="input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label className="text-sm">Active</label>
        <select
          className="select"
          value={String(form.active)}
          onChange={(e) =>
            setForm({ ...form, active: e.target.value === "true" })
          }>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
        <label className="text-sm">Icon URL</label>
        <input
          className="input"
          value={form.iconUrl}
          onChange={(e) => setForm({ ...form, iconUrl: e.target.value })}
        />
        <label className="text-sm">Display Order</label>
        <input
          className="input"
          value={form.displayOrder}
          onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
        />
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-slate-900 text-white"
            onClick={() => save.mutate()}
            disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save"}
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Departments Management</h1>
        <button
          className="btn bg-slate-900 text-white"
          onClick={() => setShowForm({})}>
          ➕ Add Department
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="grow max-w-sm">
          <label className="text-sm">Search</label>
          <div className="relative">
            <input
              className="input pr-8"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Department name"
            />
            {searchInput !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="text-sm">Active</label>
          <select
            className="select w-40"
            name="active"
            value={filters.active}
            onChange={onChange}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading departments...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No departments found. {filters.search || filters.active ? "Try adjusting your filters." : "Add a new department to get started."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Active</th>
                <th className="p-3 text-left">Doctors</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <Link
                      className="text-blue-600 hover:underline font-medium"
                      to={`/departments/${d.id}`}>
                      {d.name}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span
                      className={`badge ${
                        d.active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {d.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="p-3">{d.doctorCount || 0}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      className="btn btn-sm"
                      onClick={() => setShowForm(d)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-100"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Confirm delete",
                          message: `Delete department "${d.name}"? ${d.doctorCount > 0 ? `This department has ${d.doctorCount} doctor(s). They will need to be reassigned.` : ""}`
                        });
                        if (!ok) return;
                        del.mutate(d.id);
                      }}
                      disabled={del.isPending}>
                      {del.isPending ? "Deleting..." : "Delete"}
                    </button>
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
