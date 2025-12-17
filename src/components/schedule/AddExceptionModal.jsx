import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { X, Calendar, AlertCircle, Clock, FileText } from "lucide-react";

export default function AddExceptionModal({ doctorId, onClose }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    exceptionDate: "",
    exceptionType: "UNAVAILABLE",
    startTime: "",
    endTime: "",
    reason: ""
  });

  const [errors, setErrors] = useState({});

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors({ ...errors, [k]: "" });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.exceptionDate) {
      newErrors.exceptionDate = "Date is required";
    }
    if (form.exceptionType === "CUSTOM_HOURS") {
      if (!form.startTime) {
        newErrors.startTime = "Start time is required for custom hours";
      }
      if (!form.endTime) {
        newErrors.endTime = "End time is required for custom hours";
      }
      if (form.startTime && form.endTime && form.startTime >= form.endTime) {
        newErrors.endTime = "End time must be after start time";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      const response = await api.post("/schedule/exception", {
        doctorId: Number(doctorId),
        ...form
      });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["doctor-exceptions", doctorId]);
      onClose();
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        setErrors({
          general: "An exception already exists for this date."
        });
      } else {
        setErrors({
          general: error.response?.data?.error || "Failed to save exception"
        });
      }
    }
  });

  const handleSave = () => {
    if (validate()) {
      save.mutate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add Schedule Exception</h2>
                <p className="text-sm text-orange-100 mt-1">
                  Mark a specific date as unavailable or with custom hours
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {errors.general && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-600 mt-0.5" size={20} />
                <div className="text-sm text-red-800">{errors.general}</div>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="inline mr-2" size={16} />
              Exception Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 font-medium ${
                errors.exceptionDate ? "border-red-300" : "border-gray-300"
              }`}
              value={form.exceptionDate}
              onChange={(e) => update("exceptionDate", e.target.value)}
            />
            {errors.exceptionDate && (
              <p className="text-red-600 text-sm mt-1">
                {errors.exceptionDate}
              </p>
            )}
          </div>

          {/* Exception Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <AlertCircle className="inline mr-2" size={16} />
              Exception Type <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 font-medium"
              value={form.exceptionType}
              onChange={(e) => update("exceptionType", e.target.value)}>
              <option value="UNAVAILABLE">Unavailable (Whole Day)</option>
              <option value="CUSTOM_HOURS">Custom Hours</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {form.exceptionType === "UNAVAILABLE"
                ? "Doctor will be unavailable for the entire day"
                : "Set specific hours for this date"}
            </p>
          </div>

          {/* Custom Hours Fields */}
          {form.exceptionType === "CUSTOM_HOURS" && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-orange-900 font-semibold mb-2">
                <Clock size={18} />
                Custom Time Range
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 font-medium ${
                      errors.startTime ? "border-red-300" : "border-gray-300"
                    }`}
                    value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                  />
                  {errors.startTime && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.startTime}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 font-medium ${
                      errors.endTime ? "border-red-300" : "border-gray-300"
                    }`}
                    value={form.endTime}
                    onChange={(e) => update("endTime", e.target.value)}
                  />
                  {errors.endTime && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.endTime}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FileText className="inline mr-2" size={16} />
              Reason (Optional)
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 resize-none"
              placeholder="e.g., Holiday, Personal leave, Conference..."
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={save.isPending || !form.exceptionDate}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg">
              {save.isPending ? "Saving..." : "Save Exception"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
