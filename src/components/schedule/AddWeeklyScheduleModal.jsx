import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { X, Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { SearchableDropdown } from "../shared";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function AddWeeklyScheduleModal({
  doctorId,
  onClose,
  preselectedDay
}) {
  const qc = useQueryClient();

  const [dayOfWeek, setDayOfWeek] = useState(
    preselectedDay !== undefined ? String(preselectedDay) : ""
  );

  // Update dayOfWeek when preselectedDay changes
  useEffect(() => {
    if (preselectedDay !== undefined) {
      setDayOfWeek(String(preselectedDay));
    }
  }, [preselectedDay]);
  const [templateId, setTemplateId] = useState("");
  const [errors, setErrors] = useState({});

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      try {
        // Try the schedule route first (for backward compatibility)
        try {
          const response = await api.get("/schedule/templates");
          return response.data;
        } catch {
          // Fallback to time-slot-templates endpoint
          const response = await api.get("/time-slot-templates");
          return response.data;
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
        return [];
      }
    }
  });

  // Check existing schedules for the selected day
  const { data: existingSchedules } = useQuery({
    queryKey: ["doctor-schedules", doctorId],
    enabled: !!doctorId,
    queryFn: async () => {
      try {
        const response = await api.get(`/schedule/${doctorId}`);
        return response.data;
      } catch {
        return [];
      }
    }
  });

  const save = useMutation({
    mutationFn: async () => {
      const response = await api.post("/schedule", {
        doctorId: Number(doctorId),
        dayOfWeek: Number(dayOfWeek),
        templateId: Number(templateId)
      });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["doctor-schedules", doctorId]);
      onClose();
    },
    onError: (error) => {
      if (error.response?.status === 409) {
        setErrors({
          general:
            "A schedule already exists for this day and template combination."
        });
      } else {
        setErrors({
          general: error.response?.data?.error || "Failed to save schedule"
        });
      }
    }
  });

  const selectedTemplate = templates?.find((t) => t.id === Number(templateId));
  const existingDaySchedules =
    existingSchedules?.filter((s) => s.dayOfWeek === Number(dayOfWeek)) || [];

  const validate = () => {
    const newErrors = {};
    if (dayOfWeek === "") {
      newErrors.dayOfWeek = "Please select a day";
    }
    if (templateId === "") {
      newErrors.templateId = "Please select a template";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      save.mutate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Add Weekly Schedule</h2>
                <p className="text-sm text-blue-100 mt-1">
                  Configure availability for a specific day
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

          {/* Day Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Day of Week <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              value={dayOfWeek !== "" ? String(dayOfWeek) : ""}
              options={[
                { value: "", label: "Choose a day..." },
                ...DAY_NAMES.map((day, index) => ({
                  value: String(index),
                  label: day
                }))
              ]}
              onChange={(value) => {
                setDayOfWeek(value);
                setErrors({ ...errors, dayOfWeek: "" });
              }}
              placeholder="Choose a day..."
              className={errors.dayOfWeek ? "border-red-300" : ""}
            />
            {errors.dayOfWeek && (
              <p className="text-red-600 text-sm mt-1">{errors.dayOfWeek}</p>
            )}
            {dayOfWeek !== "" && existingDaySchedules.length > 0 && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>Note:</strong> This day already has{" "}
                  {existingDaySchedules.length} schedule
                  {existingDaySchedules.length > 1 ? "s" : ""}. Adding another
                  will create multiple time slots for this day.
                </div>
              </div>
            )}
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Time Slot Template <span className="text-red-500">*</span>
            </label>
            {templatesLoading ? (
              <div className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-500">
                Loading templates...
              </div>
            ) : templates?.length === 0 ? (
              <div className="px-4 py-3 border-2 border-red-300 rounded-lg bg-red-50">
                <div className="text-sm text-red-800 mb-3">
                  No templates available. Please create time slot templates
                  first.
                </div>
                <a
                  href="/time-slot-templates"
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold underline">
                  Go to Template Management →
                </a>
              </div>
            ) : (
              <>
                <SearchableDropdown
                  value={templateId || ""}
                  options={[
                    { value: "", label: "Choose a template..." },
                    ...(templates || []).map((t) => ({
                      value: String(t.id),
                      label: `${t.name} — ${t.startTime} to ${t.endTime}`
                    }))
                  ]}
                  onChange={(value) => {
                    setTemplateId(value);
                    setErrors({ ...errors, templateId: "" });
                  }}
                  placeholder="Choose a template..."
                  className={errors.templateId ? "border-red-300" : ""}
                />
                {errors.templateId && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.templateId}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="text-blue-600" size={20} />
                <span className="font-semibold text-gray-900">
                  Template Details
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">Time Range</div>
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock size={16} />
                    {selectedTemplate.startTime} - {selectedTemplate.endTime}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Slot Duration</div>
                  <div className="font-semibold text-gray-900">
                    {selectedTemplate.slotDuration} minutes
                  </div>
                </div>
                {selectedTemplate.bufferTime > 0 && (
                  <div>
                    <div className="text-gray-600 mb-1">Buffer Time</div>
                    <div className="font-semibold text-gray-900">
                      {selectedTemplate.bufferTime} minutes
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={save.isPending || !dayOfWeek || !templateId}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg">
              {save.isPending ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
