import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import PackageModal from "../components/health-package/PackageModal";
import { Link } from "react-router-dom";

/***************************************************************
  Pagination
***************************************************************/
function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 20)));
  return (
    <div className="flex items-center justify-end gap-4 mt-4">
      <button
        className="btn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}>
        Prev
      </button>
      <span className="text-sm text-slate-700">
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

/***************************************************************
  MAIN PAGE
***************************************************************/
export default function PackagesPage() {
  const qc = useQueryClient();

  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    category: "",
    active: "",
    sortBy: "name",
    sortOrder: "asc"
  });

  const { data } = useQuery({
    queryKey: ["packages", filters],
    queryFn: async () => (await api.get("/packages", { params: filters })).data
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/packages/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["packages"] })
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const onChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  const toggleSort = (field) =>
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortOrder === "asc" ? "desc" : "asc"
    }));

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Health Packages</h1>
        <button
          className="btn bg-blue-600 text-white"
          onClick={() => setEditing({})}>
          + Add Package
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex items-end gap-4 flex-wrap">
        <div>
          <label className="text-sm">Search</label>
          <input
            name="search"
            className="input"
            value={filters.search}
            onChange={onChange}
            placeholder="Name / Description"
          />
        </div>

        <div>
          <label className="text-sm">Category</label>
          <input
            name="category"
            className="input"
            value={filters.category}
            onChange={onChange}
            placeholder="e.g. Senior Citizen"
          />
        </div>

        <div>
          <label className="text-sm">Status</label>
          <select
            name="active"
            className="select"
            value={filters.active}
            onChange={onChange}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                ["name", "Package Name"],
                ["price", "Price"],
                ["validityDays", "Validity"],
                ["category", "Category"],
                ["active", "Active"]
              ].map(([key, label]) => (
                <th
                  key={key}
                  className="p-3 text-left cursor-pointer"
                  onClick={() => toggleSort(key)}>
                  {label}{" "}
                  {filters.sortBy === key &&
                    (filters.sortOrder === "asc" ? "▲" : "▼")}
                </th>
              ))}
              <th className="p-3 text-left">Tests Included</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-semibold">{p.name}</td>
                <td className="p-3">₹{p.price}</td>
                <td className="p-3">{p.validityDays ?? "—"} days</td>
                <td className="p-3">{p.category ?? "—"}</td>

                <td className="p-3">
                  <span
                    className={`badge ${
                      p.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {p.active ? "Yes" : "No"}
                  </span>
                </td>

                <td className="p-3">
                  {p.tests?.length ? (
                    <Link
                      className="text-blue-600 underline"
                      to={`/packages/${p.id}`}>
                      {p.tests.length} tests →
                    </Link>
                  ) : (
                    <span className="text-slate-400">No Tests</span>
                  )}
                </td>

                <td className="p-3 flex gap-2">
                  <button className="btn" onClick={() => setEditing(p)}>
                    Edit
                  </button>
                  <button
                    className="btn bg-red-600 text-white"
                    onClick={() => del.mutate(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager
        page={data?.page}
        total={total}
        pageSize={data?.pageSize}
        onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
      />

      {editing && (
        <PackageModal pkg={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
