import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/client";

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
            onClick={() => save.mutate()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    active: ""
  });
  const [showForm, setShowForm] = useState(null);

  const { data } = useQuery({
    queryKey: ["departments", filters],
    queryFn: async () =>
      (await api.get("/departments", { params: filters })).data
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/departments/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] })
  });

  const items = data?.items || [];
  const page = data?.page || 1;
  const total = data?.total || 0;
  const pageSize = data?.pageSize || filters.pageSize;

  const onChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="grow max-w-sm">
          <label className="text-sm">Search</label>
          <input
            className="input"
            name="search"
            value={filters.search}
            onChange={onChange}
            placeholder="Department name"
          />
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
        <button
          className="btn bg-slate-900 text-white"
          onClick={() => setShowForm({})}>
          ➕ Add Department
        </button>
      </div>

      <div className="card overflow-auto">
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
              <tr key={d.id} className="border-t">
                <td className="p-3">
                  <Link
                    className="text-blue-600 hover:underline"
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
                <td className="p-3">{d.doctorCount}</td>
                <td className="p-3 flex gap-2">
                  <button className="btn" onClick={() => setShowForm(d)}>
                    Edit
                  </button>
                  <button className="btn" onClick={() => del.mutate(d.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
