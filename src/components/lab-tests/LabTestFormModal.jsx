import React, { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { FlaskConical, X, AlertCircle, Home, Star, Check } from "lucide-react";

function LabTestFormModal({ test, categories, onClose }) {
  const qc = useQueryClient();
  const isNew = !test?.id;

  const [form, setForm] = useState(() => ({
    code: test?.code || "",
    name: test?.name || "",
    description: test?.description || "",
    sampleType: test?.sampleType || "",
    sampleVolume: test?.sampleVolume || "",
    preparation: test?.preparation || "",
    normalRange: test?.normalRange || "",
    unit: test?.unit || "",
    method: test?.method || "",
    price: test?.price || "",
    discountPrice: test?.discountPrice || "",
    mrp: test?.mrp || "",
    turnaroundTime: test?.turnaroundTime || "",
    homeCollection: test?.homeCollection ?? true,
    popular: test?.popular ?? false,
    displayOrder: test?.displayOrder || 0,
    active: test?.active ?? true,
    categoryId: test?.categoryId || ""
  }));

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback(() => {
    const errs = {};
    if (!form.code?.trim()) errs.code = "Test code is required";
    if (!form.name?.trim()) errs.name = "Test name is required";
    if (!form.price || parseFloat(form.price) <= 0) errs.price = "Valid price is required";
    if (form.discountPrice && parseFloat(form.discountPrice) > parseFloat(form.price)) {
      errs.discountPrice = "Discount price cannot be greater than price";
    }
    setErrors(errs);
    return errs;
  }, [form]);

  const updateField = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }, []);

  const handleBlur = useCallback((field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    validate();
  }, [validate]);

  const save = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        return (await api.post("/lab-tests", data)).data;
      }
      return (await api.put(`/lab-tests/${test.id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-tests"] });
      onClose();
    }
  });

  const handleSubmit = useCallback(() => {
    const allTouched = { code: true, name: true, price: true };
    setTouched(allTouched);

    const errs = validate();
    if (Object.keys(errs).length > 0) return;

    const payload = {
      ...form,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
      mrp: form.mrp ? parseFloat(form.mrp) : null,
      displayOrder: parseInt(form.displayOrder) || 0,
      categoryId: form.categoryId ? parseInt(form.categoryId) : null
    };

    save.mutate(payload);
  }, [form, validate, save]);

  const inputClass = (field) =>
    `input ${touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FlaskConical className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isNew ? "Add New Lab Test" : "Edit Lab Test"}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {save.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {save.error?.response?.data?.error || "Failed to save lab test"}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Test Code <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("code")}
                value={form.code}
                onChange={(e) => updateField("code", e.target.value.toUpperCase())}
                onBlur={() => handleBlur("code")}
                placeholder="e.g. CBC001"
              />
              {touched.code && errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Test Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("name")}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="e.g. Complete Blood Count"
              />
              {touched.name && errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Test description..."
            />
          </div>

          {/* Category & Sample Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <select
                className="select"
                value={form.categoryId}
                onChange={(e) => updateField("categoryId", e.target.value)}>
                <option value="">Select Category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Sample Type</label>
              <input
                className="input"
                value={form.sampleType}
                onChange={(e) => updateField("sampleType", e.target.value)}
                placeholder="e.g. Blood, Urine"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Sample Volume</label>
              <input
                className="input"
                value={form.sampleVolume}
                onChange={(e) => updateField("sampleVolume", e.target.value)}
                placeholder="e.g. 3ml"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center gap-2">
              💰 Pricing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className={inputClass("price")}
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  onBlur={() => handleBlur("price")}
                  placeholder="500"
                  min="0"
                  step="0.01"
                />
                {touched.price && errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Discount Price (₹)</label>
                <input
                  type="number"
                  className={inputClass("discountPrice")}
                  value={form.discountPrice}
                  onChange={(e) => updateField("discountPrice", e.target.value)}
                  placeholder="450"
                  min="0"
                  step="0.01"
                />
                {touched.discountPrice && errors.discountPrice && (
                  <p className="text-xs text-red-500">{errors.discountPrice}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">MRP (₹)</label>
                <input
                  type="number"
                  className="input"
                  value={form.mrp}
                  onChange={(e) => updateField("mrp", e.target.value)}
                  placeholder="600"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Turnaround Time</label>
              <input
                className="input"
                value={form.turnaroundTime}
                onChange={(e) => updateField("turnaroundTime", e.target.value)}
                placeholder="e.g. 24 hrs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Normal Range</label>
              <input
                className="input"
                value={form.normalRange}
                onChange={(e) => updateField("normalRange", e.target.value)}
                placeholder="e.g. 4.5-11.0"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Unit</label>
              <input
                className="input"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
                placeholder="e.g. x10³/µL"
              />
            </div>
          </div>

          {/* Preparation & Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Preparation Instructions</label>
              <input
                className="input"
                value={form.preparation}
                onChange={(e) => updateField("preparation", e.target.value)}
                placeholder="e.g. 8-12 hours fasting"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Method</label>
              <input
                className="input"
                value={form.method}
                onChange={(e) => updateField("method", e.target.value)}
                placeholder="e.g. Flow Cytometry"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.homeCollection}
                onChange={(e) => updateField("homeCollection", e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              <Home size={16} className="text-emerald-600" />
              <span className="text-sm">Home Collection</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => updateField("popular", e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <Star size={16} className="text-amber-500" />
              <span className="text-sm">Popular</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              <Check size={16} className="text-green-600" />
              <span className="text-sm">Active</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={save.isPending}>
            {save.isPending ? "Saving..." : isNew ? "Create Test" : "Update Test"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LabTestFormModal);

