import React, { useState, useEffect, useRef } from "react";
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
 ✅ CREATE/EDIT DOCTOR MODAL
***************************************************************/
function DoctorFormModal({ doc, departments, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!doc;

  const [form, setForm] = useState({
    name: doc?.user?.name || "",
    phone: doc?.user?.phone || "",
    email: doc?.user?.email || "",
    specialization: doc?.specialization || "",
    registrationNumber: doc?.registrationNumber || "",
    departmentId: doc?.department?.id || "",
    gender: doc?.gender || "",
    dateOfBirth: doc?.dateOfBirth ? doc.dateOfBirth.split("T")[0] : "",
    address: doc?.address || "",
    experience: doc?.experience ?? "",
    consultationFee: doc?.consultationFee ?? "",
    description: doc?.description || "",
    available: doc?.available ?? true
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validation rules
  const validate = () => {
    const newErrors = {};

    // Name validation (required, 2-100 chars)
    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (form.name.trim().length > 100) {
      newErrors.name = "Name cannot exceed 100 characters";
    }

    // Phone validation (required, 10 digits)
    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(form.phone)) {
      newErrors.phone = "Phone must be exactly 10 digits";
    }

    // Email validation (optional, but must be valid if provided)
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Specialization validation (required, 2-100 chars)
    if (!form.specialization.trim()) {
      newErrors.specialization = "Specialization is required";
    } else if (form.specialization.trim().length < 2) {
      newErrors.specialization = "Specialization must be at least 2 characters";
    }

    // Department validation (required)
    if (!form.departmentId) {
      newErrors.departmentId = "Please select a department";
    }

    // Experience validation (optional, but must be 0-100 if provided)
    if (form.experience !== "" && form.experience !== null) {
      const exp = Number(form.experience);
      if (isNaN(exp) || exp < 0) {
        newErrors.experience = "Experience cannot be negative";
      } else if (exp > 100) {
        newErrors.experience = "Experience cannot exceed 100 years";
      }
    }

    // Consultation fee validation (optional, but must be >= 0 if provided)
    if (form.consultationFee !== "" && form.consultationFee !== null) {
      const fee = Number(form.consultationFee);
      if (isNaN(fee) || fee < 0) {
        newErrors.consultationFee = "Consultation fee cannot be negative";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    validate();
  };

  const save = useMutation({
    mutationFn: async () => {
      // Clean up payload - convert empty strings to null for optional fields
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        specialization: form.specialization.trim(),
        registrationNumber: form.registrationNumber.trim() || null,
        departmentId: Number(form.departmentId),
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address.trim() || null,
        experience: form.experience !== "" ? Number(form.experience) : null,
        consultationFee: form.consultationFee !== "" ? Number(form.consultationFee) : null,
        description: form.description.trim() || null,
        available: form.available
      };

      if (isEdit) {
        return (await api.put(`/doctors/${doc.id}`, payload)).data;
      }
      return (await api.post(`/doctors`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctors"] });
      onClose();
    },
    onError: (error) => {
      console.error("Save error:", error);
      alert(error.response?.data?.error || "Failed to save doctor");
    }
  });

  const handleSubmit = () => {
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(form).forEach((key) => (allTouched[key] = true));
    setTouched(allTouched);

    if (validate()) {
      save.mutate();
    }
  };

  const updateField = (k, v) => {
    setForm({ ...form, [k]: v });
    // Clear error when user starts typing
    if (errors[k]) {
      setErrors({ ...errors, [k]: undefined });
    }
  };

  // Input class with error styling
  const inputClass = (field) =>
    `input ${touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""}`;

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
      <div className="card p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold">{isEdit ? "Edit" : "Add"} Doctor</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Name - Required */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass("name")}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="Dr. John Doe"
            />
            {touched.name && errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Phone - Required */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass("phone")}
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => handleBlur("phone")}
              placeholder="9876543210"
            />
            {touched.phone && errors.phone && (
              <p className="text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* Email - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              className={inputClass("email")}
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              placeholder="doctor@example.com"
            />
            {touched.email && errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Registration No - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Registration No.</label>
            <input
              className="input"
              value={form.registrationNumber}
              onChange={(e) => updateField("registrationNumber", e.target.value)}
              placeholder="MCI-12345"
            />
          </div>

          {/* Specialization - Required */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Specialization <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass("specialization")}
              value={form.specialization}
              onChange={(e) => updateField("specialization", e.target.value)}
              onBlur={() => handleBlur("specialization")}
              placeholder="Cardiology"
            />
            {touched.specialization && errors.specialization && (
              <p className="text-xs text-red-500">{errors.specialization}</p>
            )}
          </div>

          {/* Department - Required */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              className={`select ${touched.departmentId && errors.departmentId ? "border-red-500" : ""}`}
              value={form.departmentId}
              onChange={(e) => updateField("departmentId", e.target.value)}
              onBlur={() => handleBlur("departmentId")}>
              <option value="">Select Department</option>
              {(departments?.items ?? departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {touched.departmentId && errors.departmentId && (
              <p className="text-xs text-red-500">{errors.departmentId}</p>
            )}
          </div>

          {/* Gender - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Gender</label>
            <select
              className="select"
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}>
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Date of Birth - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Date of Birth</label>
            <input
              type="date"
              className="input"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
            <p className="text-xs text-slate-400">Optional</p>
          </div>

          {/* Experience - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Experience (years)</label>
            <input
              className={inputClass("experience")}
              type="number"
              min="0"
              max="100"
              value={form.experience}
              onChange={(e) => updateField("experience", e.target.value)}
              onBlur={() => handleBlur("experience")}
              placeholder="0"
            />
            {touched.experience && errors.experience && (
              <p className="text-xs text-red-500">{errors.experience}</p>
            )}
          </div>

          {/* Consultation Fee - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Consultation Fee (₹)</label>
            <input
              className={inputClass("consultationFee")}
              type="number"
              min="0"
              value={form.consultationFee}
              onChange={(e) => updateField("consultationFee", e.target.value)}
              onBlur={() => handleBlur("consultationFee")}
              placeholder="500"
            />
            {touched.consultationFee && errors.consultationFee && (
              <p className="text-xs text-red-500">{errors.consultationFee}</p>
            )}
          </div>

          {/* Available - Optional */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Available</label>
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
        </div>

        {/* Address - Optional (full width) */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Address</label>
          <input
            className="input"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Clinic/Hospital address"
          />
          <p className="text-xs text-slate-400">Optional</p>
        </div>

        {/* Description - Optional (full width) */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Brief description about the doctor's expertise..."
          />
          <p className="text-xs text-slate-400">Optional - Max 2000 characters</p>
        </div>

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-xs text-slate-500">
            <span className="text-red-500">*</span> Required fields
          </p>
          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn bg-slate-900 text-white"
              onClick={handleSubmit}
              disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </button>
          </div>
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
  const confirm = useConfirm();
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);

  // Separate search input state for immediate UI update
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

  // Update filters.search when debounced value changes
  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get("/departments")).data
  });

  const query = useQuery({
    queryKey: ["doctors", filters],
    queryFn: async () => {
      // Remove empty string values before sending to API
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "")
      );
      return (await api.get("/doctors", { params })).data;
    }
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
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Doctors Management</h1>
        <button
          className="btn bg-slate-900 text-white"
          onClick={() => setEditing({})}>
          ➕ Add Doctor
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
              placeholder="Name / Specialization / Registration"
            />
            {searchInput !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
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
            onClick={async () => {
              const ok = await confirm({
                title: "Confirm Bulk Delete",
                message: `Delete ${selected.length} selected doctor(s)?`
              });
              if (!ok) return;
              bulkDelete.mutate(selected);
            }}>
            Delete Selected ({selected.length})
          </button>
        )}
      </div>

      {/* TABLE */}
      <div className="card overflow-auto">
        {query.isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading doctors...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No doctors found. {filters.search || filters.departmentId || filters.available ? "Try adjusting your filters." : "Add a new doctor to get started."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.length === items.length && items.length > 0}
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
                <tr key={d.id} className="border-t hover:bg-slate-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() => toggleSelect(d.id)}
                    />
                  </td>

                  <td className="p-3">
                    <Link
                      className="text-blue-600 hover:underline font-medium"
                      to={`/doctors/${d.id}`}>
                      {d.user.name}
                    </Link>
                  </td>

                  <td className="p-3">{d.specialization || "—"}</td>
                  <td className="p-3">{d.department?.name || "—"}</td>
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
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditing(d)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-sm bg-red-50 text-red-700 hover:bg-red-100"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Confirm delete",
                          message: `Permanently delete ${d.user.name}? This action cannot be undone.`
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
        page={query.data?.page}
        total={total}
        pageSize={query.data?.pageSize}
        onPage={(p) => setFilters((f) => ({ ...f, page: p }))}
      />

      {editing !== null && (
        <DoctorFormModal
          doc={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          departments={departments}
        />
      )}
      {/* Confirm handled via useConfirm() from ConfirmProvider */}
    </div>
  );
}
