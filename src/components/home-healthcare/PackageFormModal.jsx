import React, { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import {
  Package,
  X,
  AlertCircle,
  Star,
  Sparkles,
  Check,
  Home
} from "lucide-react";
import { toast } from "react-toastify";
import ServiceSelector from "./ServiceSelector";

function PackageFormModal({ pkg, onClose }) {
  const qc = useQueryClient();
  const isNew = !pkg?.id;

  const [form, setForm] = useState(() => ({
    name: pkg?.name || "",
    description: pkg?.description || "",
    shortDesc: pkg?.shortDesc || "",
    price: pkg?.price || "",
    discountPrice: pkg?.discountPrice || "",
    mrp: pkg?.mrp || "",
    validityDays: pkg?.validityDays || "",
    duration: pkg?.duration || "",
    imageUrl: pkg?.imageUrl || "",
    bannerUrl: pkg?.bannerUrl || "",
    popular: pkg?.popular ?? false,
    featured: pkg?.featured ?? false,
    displayOrder: pkg?.displayOrder || 0,
    active: pkg?.active ?? true,
    serviceIds: pkg?.services?.map((s) => s.serviceId || s.id) || []
  }));

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback(() => {
    const errs = {};

    if (!form.name?.trim()) {
      errs.name = "Package name is required";
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

    if (form.validityDays && form.validityDays !== "") {
      const days = parseInt(form.validityDays);
      if (isNaN(days) || days < 1) {
        errs.validityDays = "Validity must be at least 1 day";
      }
    }

    if (form.duration && form.duration !== "") {
      const minutes = parseInt(form.duration);
      if (isNaN(minutes) || minutes < 1) {
        errs.duration = "Duration must be at least 1 minute";
      }
    }

    if (form.imageUrl && form.imageUrl.trim()) {
      try {
        new URL(form.imageUrl);
      } catch {
        errs.imageUrl = "Please enter a valid URL";
      }
    }

    if (form.bannerUrl && form.bannerUrl.trim()) {
      try {
        new URL(form.bannerUrl);
      } catch {
        errs.bannerUrl = "Please enter a valid URL";
      }
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
        return (await api.post("/home-healthcare-packages", data)).data;
      }
      return (await api.put(`/home-healthcare-packages/${pkg.id}`, data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-healthcare-packages"] });
      toast.success(
        isNew ? "Package created successfully" : "Package updated successfully"
      );
      onClose();
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || "Failed to save package");
    }
  });

  const handleSubmit = useCallback(() => {
    const allTouched = Object.keys(form).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setTouched(allTouched);

    const errs = validate();
    if (Object.keys(errs).length > 0) return;

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      shortDesc: form.shortDesc?.trim() || null,
      price: parseFloat(form.price),
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
      mrp: form.mrp ? parseFloat(form.mrp) : null,
      validityDays: form.validityDays ? parseInt(form.validityDays) : null,
      duration: form.duration ? parseInt(form.duration) : null,
      imageUrl: form.imageUrl?.trim() || null,
      bannerUrl: form.bannerUrl?.trim() || null,
      popular: form.popular,
      featured: form.featured,
      displayOrder: parseInt(form.displayOrder) || 0,
      active: form.active,
      serviceIds: form.serviceIds
    };

    save.mutate(payload);
  }, [form, validate, save, isNew]);

  const inputClass = (field) =>
    `input ${
      touched[field] && errors[field] ? "border-red-500 focus:ring-red-500" : ""
    }`;

  // Calculate savings
  const savings = useMemo(() => {
    if (form.price && form.discountPrice) {
      return (parseFloat(form.price) - parseFloat(form.discountPrice)).toFixed(
        0
      );
    }
    return null;
  }, [form.price, form.discountPrice]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Package className="text-white" size={24} />
            <h2 className="text-xl font-bold text-white">
              {isNew ? "Create Home Healthcare Package" : "Edit Package"}
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
              {save.error?.response?.data?.error || "Failed to save package"}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">
                Package Name <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass("name")}
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                placeholder="e.g. Complete Home Care Package"
              />
              {touched.name && errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Short Description</label>
              <input
                className={inputClass("shortDesc")}
                value={form.shortDesc}
                onChange={(e) => updateField("shortDesc", e.target.value)}
                onBlur={() => handleBlur("shortDesc")}
                placeholder="Brief tagline for the package"
                maxLength={300}
              />
              {touched.shortDesc && errors.shortDesc && (
                <p className="text-xs text-red-500">{errors.shortDesc}</p>
              )}
              <p className="text-xs text-slate-400">
                {form.shortDesc?.length || 0}/300
              </p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Full Description</label>
              <textarea
                className={inputClass("description")}
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                onBlur={() => handleBlur("description")}
                placeholder="Detailed package description..."
                maxLength={2000}
              />
              {touched.description && errors.description && (
                <p className="text-xs text-red-500">{errors.description}</p>
              )}
              <p className="text-xs text-slate-400">
                {form.description?.length || 0}/2000
              </p>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
            <h3 className="text-sm font-semibold text-purple-800 mb-4 flex items-center gap-2">
              💰 Package Pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  placeholder="2999"
                  min="0"
                  step="0.01"
                />
                {touched.price && errors.price && (
                  <p className="text-xs text-red-500">{errors.price}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Discount Price (₹)
                </label>
                <input
                  type="number"
                  className={inputClass("discountPrice")}
                  value={form.discountPrice}
                  onChange={(e) => updateField("discountPrice", e.target.value)}
                  onBlur={() => handleBlur("discountPrice")}
                  placeholder="1999"
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
                  className={inputClass("mrp")}
                  value={form.mrp}
                  onChange={(e) => updateField("mrp", e.target.value)}
                  onBlur={() => handleBlur("mrp")}
                  placeholder="3999"
                  min="0"
                  step="0.01"
                />
                {touched.mrp && errors.mrp && (
                  <p className="text-xs text-red-500">{errors.mrp}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Validity (Days)</label>
                <input
                  type="number"
                  className={inputClass("validityDays")}
                  value={form.validityDays}
                  onChange={(e) => updateField("validityDays", e.target.value)}
                  onBlur={() => handleBlur("validityDays")}
                  placeholder="30"
                  min="1"
                />
                {touched.validityDays && errors.validityDays && (
                  <p className="text-xs text-red-500">{errors.validityDays}</p>
                )}
              </div>
            </div>

            {savings && (
              <div className="mt-3 text-sm text-green-700 font-medium">
                💸 Customer saves ₹{savings} (
                {((savings / form.price) * 100).toFixed(0)}% off)
              </div>
            )}
          </div>

          {/* Services Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Home size={16} className="text-purple-600" />
              Included Services
            </h3>
            <ServiceSelector
              selectedIds={form.serviceIds}
              onChange={(ids) => updateField("serviceIds", ids)}
              existingServices={pkg?.services}
            />
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Total Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                className={inputClass("duration")}
                value={form.duration}
                onChange={(e) => updateField("duration", e.target.value)}
                onBlur={() => handleBlur("duration")}
                placeholder="e.g. 120"
              />
              {touched.duration && errors.duration && (
                <p className="text-xs text-red-500">{errors.duration}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Display Order</label>
              <input
                type="number"
                className="input"
                value={form.displayOrder}
                onChange={(e) => updateField("displayOrder", e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Image URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Image URL</label>
              <input
                className={inputClass("imageUrl")}
                value={form.imageUrl}
                onChange={(e) => updateField("imageUrl", e.target.value)}
                onBlur={() => handleBlur("imageUrl")}
                placeholder="https://..."
              />
              {touched.imageUrl && errors.imageUrl && (
                <p className="text-xs text-red-500">{errors.imageUrl}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Banner URL</label>
              <input
                className={inputClass("bannerUrl")}
                value={form.bannerUrl}
                onChange={(e) => updateField("bannerUrl", e.target.value)}
                onBlur={() => handleBlur("bannerUrl")}
                placeholder="https://..."
              />
              {touched.bannerUrl && errors.bannerUrl && (
                <p className="text-xs text-red-500">{errors.bannerUrl}</p>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
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
                checked={form.featured}
                onChange={(e) => updateField("featured", e.target.checked)}
                className="w-4 h-4 accent-purple-600"
              />
              <Sparkles size={16} className="text-purple-600" />
              <span className="text-sm">Featured</span>
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
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-purple-600 text-white hover:bg-purple-700"
            onClick={handleSubmit}
            disabled={save.isPending}>
            {save.isPending
              ? "Saving..."
              : isNew
              ? "Create Package"
              : "Update Package"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(PackageFormModal);
