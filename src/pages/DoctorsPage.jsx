import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/client";

/***************************************************************
 ✅ Pager
***************************************************************/
function Pager({ page, total, pageSize, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 20)));
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

/***************************************************************
 ✅ Full EDIT MODAL
***************************************************************/
function EditDoctorModal({ doc, departments, onClose }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: doc.user.name,
    phone: doc.user.phone,
    email: doc.user.email,
    specialization: doc.specialization || "",
    registrationNumber: doc.registrationNumber || "",
    departmentId: doc.department?.id || "",
    gender: doc.gender || "",
    dateOfBirth: doc.dateOfBirth ? doc.dateOfBirth.split("T")[0] : "",
    address: doc.address || "",
    experience: doc.experience || 0,
    consultationFee: doc.consultationFee || 0,
    description: doc.description || "",
    available: doc.available ?? true
  });

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.put(`/doctors/${doc.id}`, {
          ...form,
          departmentId: Number(form.departmentId)
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      onClose();
    }
  });

  const updateField = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center">
      <div className="card p-6 w-full max-w-2xl space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold">Edit Doctor</h2>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm">Name</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
          />

          <label className="text-sm">Phone</label>
          <input
            className="input"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />

          <label className="text-sm">Email</label>
          <input
            className="input"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />

          <label className="text-sm">Registration No.</label>
          <input
            className="input"
            value={form.registrationNumber}
            onChange={(e) => updateField("registrationNumber", e.target.value)}
          />

          <label className="text-sm">Specialization</label>
          <input
            className="input"
            value={form.specialization}
            onChange={(e) => updateField("specialization", e.target.value)}
          />

          <label className="text-sm">Department</label>
          <select
            className="select"
            value={form.departmentId}
            onChange={(e) => updateField("departmentId", e.target.value)}>
            <option value="">Select</option>
            {(departments?.items ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <label className="text-sm">Gender</label>
          <select
            className="select"
            value={form.gender}
            onChange={(e) => updateField("gender", e.target.value)}>
            <option value="">Select</option>
            <option>MALE</option>
            <option>FEMALE</option>
            <option>OTHER</option>
          </select>

          <label className="text-sm">Birthdate</label>
          <input
            type="date"
            className="input"
            value={form.dateOfBirth}
            onChange={(e) => updateField("dateOfBirth", e.target.value)}
          />

          <label className="text-sm">Address</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
          />

          <label className="text-sm">Experience (years)</label>
          <input
            className="input"
            value={form.experience}
            onChange={(e) => updateField("experience", Number(e.target.value))}
          />

          <label className="text-sm">Consultation Fee</label>
          <input
            className="input"
            value={form.consultationFee}
            onChange={(e) =>
              updateField("consultationFee", Number(e.target.value))
            }
          />

          <label className="text-sm">Available</label>
          <select
            className="select"
            value={String(form.available)}
            onChange={(e) =>
              updateField("available", e.target.value === "true")
            }>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>

        <label className="text-sm">Description</label>
        <textarea
          className="input min-h-[80px]"
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
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

/***************************************************************
 ✅ MAIN PAGE
***************************************************************/
export default function DoctorsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 10,
    search: "",
    departmentId: "",
    available: "",
    sortBy: "name",
    sortOrder: "asc"
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get("/departments")).data
  });

  const query = useQuery({
    queryKey: ["doctors", filters],
    queryFn: async () => (await api.get("/doctors", { params: filters })).data
  });

  const del = useMutation({
    mutationFn: async (id) => (await api.delete(`/doctors/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doctors"] })
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids) =>
      Promise.all(ids.map((id) => api.delete(`/doctors/${id}`))),
    onSuccess: () => {
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["doctors"] });
    }
  });

  const items = query.data?.items || [];
  const total = query.data?.total || 0;

  const onChange = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  const toggleSelect = (rowId) =>
    setSelected((arr) =>
      arr.includes(rowId) ? arr.filter((x) => x !== rowId) : [...arr, rowId]
    );

  const toggleSort = (field) => {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortOrder === "asc" ? "desc" : "asc"
    }));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="grow max-w-sm">
          <label className="text-sm">Search</label>
          <input
            className="input"
            name="search"
            value={filters.search}
            onChange={onChange}
            placeholder="Name / Specialization"
          />
        </div>

        <div>
          <label className="text-sm">Department</label>
          <select
            className="select"
            name="departmentId"
            value={filters.departmentId}
            onChange={onChange}>
            <option value="">All</option>
            {(departments?.items ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Available</label>
          <select
            className="select"
            name="available"
            value={filters.available}
            onChange={onChange}>
            <option value="">All</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </div>

        {selected.length > 0 && (
          <button
            className="btn bg-red-600 text-white"
            onClick={() => bulkDelete.mutate(selected)}>
            Delete Selected ({selected.length})
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelected(e.target.checked ? items.map((d) => d.id) : [])
                  }
                />
              </th>

              {[
                ["name", "Name"],
                ["specialization", "Specialization"],
                ["department", "Department"],
                ["experience", "Exp"],
                ["consultationFee", "Fee"],
                ["available", "Available"]
              ].map(([key, label]) => (
                <th
                  key={key}
                  className="p-3 text-left cursor-pointer select-none"
                  onClick={() => toggleSort(key)}>
                  {label}{" "}
                  {filters.sortBy === key &&
                    (filters.sortOrder === "asc" ? "▲" : "▼")}
                </th>
              ))}

              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(d.id)}
                    onChange={() => toggleSelect(d.id)}
                  />
                </td>

                <td className="p-3">
                  <Link
                    className="text-blue-600 hover:underline"
                    to={`/doctors/${d.id}`}>
                    {d.user.name}
                  </Link>
                </td>

                <td className="p-3">{d.specialization}</td>
                <td className="p-3">{d.department?.name}</td>
                <td className="p-3">{d.experience ?? "—"} yrs</td>
                <td className="p-3">₹{d.consultationFee ?? "—"}</td>

                <td className="p-3">
                  <span
                    className={`badge ${
                      d.available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {d.available ? "Yes" : "No"}
                  </span>
                </td>

                <td className="p-3 flex gap-2">
                  <button className="btn" onClick={() => setEditing(d)}>
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
        page={query.data?.page}
        total={total}
        pageSize={query.data?.pageSize}
        onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
      />

      {editing && (
        <EditDoctorModal
          doc={editing}
          onClose={() => setEditing(null)}
          departments={departments?.items ?? []}
        />
      )}
    </div>
  );
}
