import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { Building2, X, AlertCircle } from "lucide-react";

function DepartmentFormModal({ initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    description: initial?.description || "",
    active: initial?.active ?? true,
    displayOrder: initial?.displayOrder ?? ""
  }));

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback(() => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Department name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (form.name.trim().length > 100) {
      newErrors.name = "Name cannot exceed 100 characters";
    }

    if (form.description && form.description.length > 500) {
      newErrors.description = "Description cannot exceed 500 characters";
    }

    if (form.displayOrder !== "" && form.displayOrder !== null) {
      const order = Number(form.displayOrder);
      if (isNaN(order) || order < 0) {
        newErrors.displayOrder = "Display order must be 0 or greater";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const handleBlur = useCallback(
    (field) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      validate();
    },
    [validate]
  );

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        active: form.active,
        displayOrder:
          form.displayOrder !== "" ? Number(form.displayOrder) : null
      };

      if (isEdit) {
        return (await api.put(`/departments/${initial.id}`, payload)).data;
      }
      return (await api.post(`/departments`, payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      onClose();
    }
  });

  const handleSubmit = useCallback(() => {
    const allTouched = Object.keys(form).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);

    if (validate()) {
      save.mutate();
    }
  }, [form, validate, save]);

  const inputClass = (field) =>
    `input ${
      touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Building2 className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isEdit ? "Edit Department" : "Add New Department"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {save.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {save.error?.response?.data?.error || "Failed to save department"}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass("name")}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="e.g. Cardiology"
            />
            {touched.name && errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className={inputClass("description")}
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="Department description..."
            />
            {touched.description && errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
            <p className="text-xs text-slate-400">
              {form.description.length}/500 characters
            </p>
          </div>

          {/* Active & Display Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <select
                className="select"
                value={String(form.active)}
                onChange={(e) =>
                  updateField("active", e.target.value === "true")
                }>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Display Order</label>
              <input
                type="number"
                className={inputClass("displayOrder")}
                value={form.displayOrder}
                onChange={(e) => updateField("displayOrder", e.target.value)}
                onBlur={() => handleBlur("displayOrder")}
                placeholder="0"
                min="0"
              />
              {touched.displayOrder && errors.displayOrder && (
                <p className="text-xs text-red-500">{errors.displayOrder}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-indigo-600 text-white hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={save.isPending}>
            {save.isPending
              ? "Saving..."
              : isEdit
              ? "Update Department"
              : "Create Department"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(DepartmentFormModal);
