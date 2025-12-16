import React, { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { Home, X, AlertCircle, Star, Sparkles, Check } from "lucide-react";
import { toast } from "react-toastify";

function ServiceFormModal({ service, onClose }) {
  const qc = useQueryClient();
  const isNew = !service?.id;

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["home-healthcare-service-categories"],
    queryFn: async () => {
      // We'll need to create this endpoint, for now return empty
      return { items: [] };
    },
    staleTime: 5 * 60 * 1000
  });

  const categories = categoriesData?.items || [];

  const [form, setForm] = useState(() => ({
    name: service?.name || "",
    description: service?.description || "",
    shortDesc: service?.shortDesc || "",
    price: service?.price || "",
    discountPrice: service?.discountPrice || "",
    mrp: service?.mrp || "",
    duration: service?.duration || "",
    categoryId: service?.categoryId || "",
    requirements: service?.requirements || "",
    popular: service?.popular ?? false,
    featured: service?.featured ?? false,
    displayOrder: service?.displayOrder || 0,
    active: service?.active ?? true
  }));

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback(() => {
    const errs = {};

    if (!form.name?.trim()) {
      errs.name = "Service name is required";
    } else if (form.name.trim().length < 2) {
      errs.name = "Name must be at least 2 characters";
    } else if (form.name.trim().length > 200) {
      errs.name = "Name cannot exceed 200 characters";
    }

    if (!form.price || form.price === "") {
      errs.price = "Price is required";
    } else if (parseFloat(form.price) <= 0) {
      errs.price = "Price must be greater than 0";
    }

    if (form.discountPrice && form.discountPrice !== "") {
      if (parseFloat(form.discountPrice) <= 0) {
        errs.discountPrice = "Discount price must be greater than 0";
      } else if (parseFloat(form.discountPrice) > parseFloat(form.price || 0)) {
        errs.discountPrice = "Discount price cannot be greater than price";
      }
    }

    if (form.mrp && form.mrp !== "" && parseFloat(form.mrp) < 0) {
      errs.mrp = "MRP cannot be negative";
    }

    if (!form.duration || form.duration === "") {
      errs.duration = "Duration is required";
    } else if (parseInt(form.duration) <= 0) {
      errs.duration = "Duration must be greater than 0 minutes";
    }

    if (form.shortDesc && form.shortDesc.length > 300) {
      errs.shortDesc = "Short description cannot exceed 300 characters";
    }

    if (form.description && form.description.length > 2000) {
      errs.description = "Description cannot exceed 2000 characters";
    }

    setErrors(errs);
    return errs;
  }, [form]);

  const handleBlur = useCallback(
    (field) => {
      setTouched((t) => ({ ...t, [field]: true }));
      validate();
    },
    [validate]
  );

  const updateField = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }, []);

  const save = useMutation({
    mutationFn: async (data) => {
      if (isNew) {
        return (await api.post("/home-healthcare-services", data)).data;
      }
      return (await api.put(`/home-healthcare-services/${service.id}`, data))
        .data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-healthcare-services"] });
      toast.success(
        isNew ? "Service created successfully" : "Service updated successfully"
      );
      onClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || "Failed to save service");
    }
  });

  const handleSubmit = useCallback(() => {
    const allTouched = { name: true, price: true, duration: true };
    setTouched(allTouched);

    const errs = validate();
    if (Object.keys(errs).length > 0) return;

    const payload = {
      ...form,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
      mrp: form.mrp ? parseFloat(form.mrp) : null,
      duration: parseInt(form.duration),
      displayOrder: parseInt(form.displayOrder) || 0,
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      description: form.description || null,
      shortDesc: form.shortDesc || null,
      requirements: form.requirements || null
    };

    save.mutate(payload);
  }, [form, validate, save, isNew]);

  const inputClass = (field) =>
    `input ${
      touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-pink-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Home className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isNew ? "Add New Service" : "Edit Service"}
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
              {save.error?.response?.data?.error || "Failed to save service"}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Service Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("name")}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="e.g. Nursing Care"
              />
              {touched.name && errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                className={inputClass("duration")}
                value={form.duration}
                onChange={(e) => updateField("duration", e.target.value)}
                onBlur={() => handleBlur("duration")}
                placeholder="e.g. 60"
              />
              {touched.duration && errors.duration && (
                <p className="text-xs text-red-500">{errors.duration}</p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass("price")}
                value={form.price}
                onChange={(e) => updateField("price", e.target.value)}
                onBlur={() => handleBlur("price")}
                placeholder="0.00"
              />
              {touched.price && errors.price && (
                <p className="text-xs text-red-500">{errors.price}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Discount Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass("discountPrice")}
                value={form.discountPrice}
                onChange={(e) => updateField("discountPrice", e.target.value)}
                onBlur={() => handleBlur("discountPrice")}
                placeholder="0.00"
              />
              {touched.discountPrice && errors.discountPrice && (
                <p className="text-xs text-red-500">{errors.discountPrice}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">MRP (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass("mrp")}
                value={form.mrp}
                onChange={(e) => updateField("mrp", e.target.value)}
                onBlur={() => handleBlur("mrp")}
                placeholder="0.00"
              />
              {touched.mrp && errors.mrp && (
                <p className="text-xs text-red-500">{errors.mrp}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Short Description</label>
            <textarea
              className={inputClass("shortDesc")}
              value={form.shortDesc}
              onChange={(e) => updateField("shortDesc", e.target.value)}
              onBlur={() => handleBlur("shortDesc")}
              placeholder="Brief description (max 300 chars)"
              rows={2}
              maxLength={300}
            />
            <p className="text-xs text-slate-500">
              {form.shortDesc.length}/300 characters
            </p>
            {touched.shortDesc && errors.shortDesc && (
              <p className="text-xs text-red-500">{errors.shortDesc}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Full Description</label>
            <textarea
              className={inputClass("description")}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="Detailed description (max 2000 chars)"
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-slate-500">
              {form.description.length}/2000 characters
            </p>
            {touched.description && errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <select
              className="select"
              value={form.categoryId}
              onChange={(e) => updateField("categoryId", e.target.value)}>
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Requirements */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Requirements</label>
            <textarea
              className="input"
              value={form.requirements}
              onChange={(e) => updateField("requirements", e.target.value)}
              placeholder="Any special requirements or instructions"
              rows={3}
            />
          </div>

          {/* Display Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Display Order</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.displayOrder}
                onChange={(e) => updateField("displayOrder", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => updateField("popular", e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-500" />
                <span className="text-sm">Popular</span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => updateField("featured", e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div className="flex items-center gap-1">
                <Sparkles size={16} className="text-purple-500" />
                <span className="text-sm">Featured</span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateField("active", e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <div className="flex items-center gap-1">
                <Check size={16} className="text-green-500" />
                <span className="text-sm">Active</span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={save.isPending}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 flex items-center gap-2">
            {save.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                {isNew ? "Create Service" : "Update Service"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServiceFormModal;
