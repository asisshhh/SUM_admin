import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { usePagePermissions } from "../hooks/usePagePermissions";
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings
} from "lucide-react";

export default function TimeSlotTemplatesPage() {
  const qc = useQueryClient();
  const { canCreate, canEdit, canDelete } = usePagePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "09:00",
    endTime: "13:00",
    slotDuration: 10,
    bufferTime: 0,
    active: true
  });

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["time-slot-templates"],
    queryFn: async () => {
      const response = await api.get("/time-slot-templates/all");
      return response.data;
    }
  });

  // Initialize default templates
  const initializeTemplates = useMutation({
    mutationFn: async () => {
      const response = await api.post("/time-slot-templates/initialize");
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["time-slot-templates"]);
      qc.invalidateQueries(["templates"]);
      alert("Default templates initialized successfully!");
    },
    onError: (error) => {
      alert(
        "Failed to initialize: " +
          (error.response?.data?.error || error.message)
      );
    }
  });

  // Create/Update template
  const saveTemplate = useMutation({
    mutationFn: async (data) => {
      if (editingTemplate) {
        const response = await api.put(
          `/time-slot-templates/${editingTemplate.id}`,
          data
        );
        return response.data;
      } else {
        const response = await api.post("/time-slot-templates", data);
        return response.data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(["time-slot-templates"]);
      qc.invalidateQueries(["templates"]);
      setShowModal(false);
      setEditingTemplate(null);
      setFormData({
        name: "",
        startTime: "09:00",
        endTime: "13:00",
        slotDuration: 10,
        bufferTime: 0,
        active: true
      });
    },
    onError: (error) => {
      alert(
        "Failed to save: " + (error.response?.data?.error || error.message)
      );
    }
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/time-slot-templates/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries(["time-slot-templates"]);
      qc.invalidateQueries(["templates"]);
    },
    onError: (error) => {
      alert(
        "Failed to delete: " + (error.response?.data?.error || error.message)
      );
    }
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      slotDuration: template.slotDuration,
      bufferTime: template.bufferTime,
      active: template.active
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      startTime: "09:00",
      endTime: "13:00",
      slotDuration: 10,
      bufferTime: 0,
      active: true
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.startTime || !formData.endTime) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate times
    const start = timeToMinutes(formData.startTime);
    const end = timeToMinutes(formData.endTime);
    if (start >= end) {
      alert("Start time must be before end time");
      return;
    }

    saveTemplate.mutate(formData);
  };

  const timeToMinutes = (time) => {
    const [hh, mm] = time.split(":").map(Number);
    return hh * 60 + mm;
  };

  const calculateSlots = (startTime, endTime, slotDuration, bufferTime) => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    let count = 0;
    let current = start;
    while (current + slotDuration <= end) {
      count++;
      current += slotDuration + bufferTime;
    }
    return count;
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="text-blue-600" size={32} />
            Time Slot Templates
          </h1>
          <p className="text-gray-600 mt-2">
            Create and manage time slot templates for doctor schedules
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => initializeTemplates.mutate()}
            className="btn bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg"
            disabled={initializeTemplates.isPending}>
            {initializeTemplates.isPending
              ? "Initializing..."
              : "Initialize Defaults"}
          </button>
          {canCreate && (
            <button
              onClick={handleAdd}
              className="btn bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg">
              <Plus size={20} />
              Add Template
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 mt-0.5" size={20} />
          <div className="flex-1">
            <div className="font-semibold text-blue-900 mb-1">
              About Time Slot Templates
            </div>
            <div className="text-sm text-blue-800">
              Templates define time ranges and slot configurations that can be
              reused across multiple doctor schedules. Default templates are
              9AM-1PM and 2PM-4PM with 10-minute slots.
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const slotCount = calculateSlots(
              template.startTime,
              template.endTime,
              template.slotDuration,
              template.bufferTime
            );

            return (
              <div
                key={template.id}
                className={`bg-white border-2 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all ${
                  template.active
                    ? "border-blue-300"
                    : "border-gray-200 opacity-75"
                }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {template.name}
                      </h3>
                      {template.active ? (
                        <CheckCircle2 className="text-green-600" size={18} />
                      ) : (
                        <XCircle className="text-gray-400" size={18} />
                      )}
                    </div>
                    {!template.active && (
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block mb-2">
                        Inactive
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="text-blue-600" size={16} />
                    <span className="font-semibold text-gray-900">
                      {template.startTime} - {template.endTime}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-600">Slot Duration</div>
                      <div className="font-semibold text-gray-900">
                        {template.slotDuration} min
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Buffer Time</div>
                      <div className="font-semibold text-gray-900">
                        {template.bufferTime} min
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">
                      Total Slots Generated
                    </div>
                    <div className="text-lg font-bold text-blue-700">
                      {slotCount} slots
                    </div>
                  </div>
                </div>

                {(canEdit || canDelete) && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    {canEdit && (
                      <button
                        onClick={() => handleEdit(template)}
                        className="flex-1 btn bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold">
                        <Edit size={16} />
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to ${
                                template.active ? "deactivate" : "delete"
                              } this template?`
                            )
                          ) {
                            deleteTemplate.mutate(template.id);
                          }
                        }}
                        className="btn bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <Clock className="mx-auto text-gray-400 mb-4" size={48} />
          <div className="text-gray-600 font-medium mb-2">
            No templates found
          </div>
          <div className="text-sm text-gray-500 mb-4">
            Create your first template or initialize default templates
          </div>
          <button
            onClick={() => initializeTemplates.mutate()}
            className="btn bg-green-600 text-white hover:bg-green-700">
            Initialize Default Templates
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 grid place-items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {editingTemplate ? "Edit Template" : "Add Template"}
                    </h2>
                    <p className="text-sm text-blue-100 mt-1">
                      Configure time range and slot settings
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingTemplate(null);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                  placeholder="e.g., Morning Slots, Evening Slots"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Slot Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Slot Duration (minutes){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    value={formData.slotDuration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slotDuration: parseInt(e.target.value) || 10
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">5-60 minutes</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Buffer Time (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    value={formData.bufferTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bufferTime: parseInt(e.target.value) || 0
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">0-30 minutes</p>
                </div>
              </div>

              {/* Preview */}
              {formData.startTime && formData.endTime && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="text-blue-600" size={20} />
                    <span className="font-semibold text-gray-900">Preview</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    <div className="mb-2">
                      <strong>Time Range:</strong> {formData.startTime} -{" "}
                      {formData.endTime}
                    </div>
                    <div className="mb-2">
                      <strong>Slot Duration:</strong> {formData.slotDuration}{" "}
                      minutes
                    </div>
                    {formData.bufferTime > 0 && (
                      <div className="mb-2">
                        <strong>Buffer:</strong> {formData.bufferTime} minutes
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <strong>Total Slots:</strong>{" "}
                      <span className="text-blue-700 font-bold text-lg">
                        {calculateSlots(
                          formData.startTime,
                          formData.endTime,
                          formData.slotDuration,
                          formData.bufferTime
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <label
                  htmlFor="active"
                  className="text-sm font-medium text-gray-700">
                  Active (available for use in schedules)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveTemplate.isPending}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg">
                  {saveTemplate.isPending
                    ? "Saving..."
                    : editingTemplate
                    ? "Update Template"
                    : "Create Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
