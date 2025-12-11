import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import {
  X,
  Upload,
  Image as ImageIcon,
  Save,
  Calendar,
  ArrowUpDown,
  Users,
  ExternalLink,
  Navigation,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { toast } from "react-toastify";

export default function BannerModal({ banner, onClose }) {
  const qc = useQueryClient();

  const [data, setData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    actionType: "none",
    actionValue: "",
    positionOrder: "",
    targetUserRole: "PATIENT",
    active: true,
    startDate: "",
    endDate: ""
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (banner) {
      setData({
        ...banner,
        startDate: banner.startDate ? banner.startDate.split("T")[0] : "",
        endDate: banner.endDate ? banner.endDate.split("T")[0] : ""
      });
    }
  }, [banner]);

  const update = (k, v) => setData({ ...data, [k]: v });

  const save = useMutation({
    mutationFn: async () => {
      if (banner) {
        return (await api.put(`/banners/${banner.id}`, data)).data;
      }
      return (await api.post("/banners", data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["banners"]);
      toast.success(
        banner ? "Banner updated successfully" : "Banner created successfully"
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to save banner");
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await api.post("/banners/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setData((d) => ({
        ...d,
        imageUrl: res.data.imageUrl
      }));
      toast.success("Image uploaded successfully");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm grid place-items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-pink-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
              <ImageIcon className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {banner ? "Edit Banner" : "Create New Banner"}
              </h2>
              <p className="text-sm text-slate-500">
                {banner
                  ? "Update banner details"
                  : "Add a new promotional banner"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Banner Image
            </label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                  id="banner-image-upload"
                />
                <label
                  htmlFor="banner-image-upload"
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                    uploading
                      ? "border-slate-300 bg-slate-50 cursor-not-allowed"
                      : "border-slate-300 hover:border-pink-400 hover:bg-pink-50"
                  }`}>
                  {uploading ? (
                    <>
                      <Loader2
                        size={18}
                        className="text-slate-400 animate-spin"
                      />
                      <span className="text-sm text-slate-500">
                        Uploading...
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">
                        {data.imageUrl ? "Change Image" : "Upload Image"}
                      </span>
                    </>
                  )}
                </label>
              </div>
              {data.imageUrl && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={data.imageUrl}
                    alt="Banner preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              value={data.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Enter banner title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
              value={data.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Enter banner description (optional)"
            />
          </div>

          {/* Action Type & Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Action Type
              </label>
              <div className="relative">
                <select
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                  value={data.actionType}
                  onChange={(e) => update("actionType", e.target.value)}>
                  <option value="none">None</option>
                  <option value="navigation">Navigation</option>
                  <option value="external_link">External Link</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {data.actionType === "navigation" ? (
                    <Navigation size={18} className="text-slate-400" />
                  ) : data.actionType === "external_link" ? (
                    <ExternalLink size={18} className="text-slate-400" />
                  ) : null}
                </div>
              </div>
            </div>

            {data.actionType !== "none" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Action Value
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  value={data.actionValue}
                  onChange={(e) => update("actionValue", e.target.value)}
                  placeholder={
                    data.actionType === "navigation"
                      ? "e.g., /appointments"
                      : "e.g., https://example.com"
                  }
                />
              </div>
            )}
          </div>

          {/* Display Order & Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <ArrowUpDown size={14} className="inline mr-1" />
                Display Order
              </label>
              <input
                type="number"
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                value={data.positionOrder || ""}
                onChange={(e) => update("positionOrder", e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Users size={14} className="inline mr-1" />
                Target User Role
              </label>
              <select
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                value={data.targetUserRole}
                onChange={(e) => update("targetUserRole", e.target.value)}>
                <option value="PATIENT">PATIENT</option>
                <option value="DOCTOR">DOCTOR</option>
                <option value="ADMIN">ADMIN</option>
                <option value="RECEPTIONIST">RECEPTIONIST</option>
              </select>
            </div>
          </div>

          {/* Active Status */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Status
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="active"
                  checked={data.active === true}
                  onChange={() => update("active", true)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Active
                  </span>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="active"
                  checked={data.active === false}
                  onChange={() => update("active", false)}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Inactive
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Calendar size={14} className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                value={data.startDate}
                onChange={(e) => update("startDate", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Calendar size={14} className="inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                value={data.endDate}
                onChange={(e) => update("endDate", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl hover:from-pink-600 hover:to-pink-700 shadow-lg shadow-pink-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {save.isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {banner ? "Update Banner" : "Create Banner"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
