import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { Stethoscope, Search, Plus, Edit2, Trash2, UserCheck, UserX, ChevronLeft, ChevronRight, X, AlertCircle } from "lucide-react";

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
  const start = Math.min((page - 1) * pageSize + 1, total || 0);
  const end = Math.min(page * pageSize, total || 0);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium">{start}</span> to <span className="font-medium">{end}</span> of{" "}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-cyan-600 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <Stethoscope className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isEdit ? "Edit Doctor" : "Add New Doctor"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {save.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {save.error?.response?.data?.error || "Failed to save doctor"}
            </div>
          )}

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

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-slate-50 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-slate-500">
            <span className="text-red-500">*</span> Required fields
          </p>
          <div className="flex gap-3">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSubmit}
              disabled={save.isPending}>
              {save.isPending ? "Saving..." : isEdit ? "Update Doctor" : "Create Doctor"}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Stethoscope className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Doctors Management</h1>
            <p className="text-sm text-slate-500">Manage doctors, schedules, and availability</p>
          </div>
        </div>
        <button
          className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
          onClick={() => setEditing({})}>
          <Plus size={18} />
          Add Doctor
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
                placeholder="Name, specialization, registration..."
              />
              {searchInput !== debouncedSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Department Filter */}
          <div className="min-w-[160px]">
            <label className="text-sm text-slate-600 mb-1 block">Department</label>
            <select
              className="select"
              name="departmentId"
              value={filters.departmentId}
              onChange={onChange}>
              <option value="">All Departments</option>
              {(departments?.items ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Available Filter */}
          <div className="min-w-[140px]">
            <label className="text-sm text-slate-600 mb-1 block">Availability</label>
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
              className="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              onClick={async () => {
                const ok = await confirm({
                  title: "Confirm Bulk Delete",
                  message: `Delete ${selected.length} selected doctor(s)?`
                });
                if (!ok) return;
                bulkDelete.mutate(selected);
              }}>
              <Trash2 size={16} />
              Delete ({selected.length})
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {query.isLoading ? (
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
                    checked={selected.length === items.length && items.length > 0}
                    onChange={(e) =>
                      setSelected(e.target.checked ? items.map((d) => d.id) : [])
                    }
                  />
                </th>
                {[
                  ["name", "Doctor"],
                  ["specialization", "Specialization"],
                  ["department", "Department"],
                  ["experience", "Experience"],
                  ["consultationFee", "Fee"],
                  ["available", "Status"]
                ].map(([key, label]) => (
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
              {items.map((d) => (
                <tr key={d.id} className="border-b hover:bg-slate-50 transition">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-blue-600"
                      checked={selected.includes(d.id)}
                      onChange={() => toggleSelect(d.id)}
                    />
                  </td>

                  <td className="p-3">
                    <Link
                      className="flex items-center gap-3 group"
                      to={`/doctors/${d.id}`}>
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Stethoscope size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 group-hover:text-blue-600 transition">
                          {d.user?.name}
                        </div>
                        <div className="text-xs text-slate-500">{d.user?.phone}</div>
                      </div>
                    </Link>
                  </td>

                  <td className="p-3 text-slate-600">{d.specialization || "—"}</td>
                  <td className="p-3">
                    {d.department?.name ? (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                        {d.department.name}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-3 text-slate-600">{d.experience ? `${d.experience} yrs` : "—"}</td>
                  <td className="p-3 font-medium">₹{d.consultationFee?.toLocaleString() ?? "—"}</td>

                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      d.available
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {d.available ? <UserCheck size={12} /> : <UserX size={12} />}
                      {d.available ? "Available" : "Unavailable"}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button
                        className="p-2 hover:bg-slate-100 rounded-lg transition"
                        onClick={() => setEditing(d)}
                        title="Edit">
                        <Edit2 size={16} className="text-slate-600" />
                      </button>
                      <button
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Confirm delete",
                            message: `Permanently delete ${d.user?.name}? This action cannot be undone.`,
                            danger: true
                          });
                          if (!ok) return;
                          del.mutate(d.id);
                        }}
                        disabled={del.isPending}
                        title="Delete">
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
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
