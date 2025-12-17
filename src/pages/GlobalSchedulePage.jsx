import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { Clock, Plus, Trash2, Save, X, AlertCircle } from "lucide-react";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function GlobalSchedulePage() {
  const qc = useQueryClient();
  const [editingDay, setEditingDay] = useState(null);
  const [formData, setFormData] = useState({
    isAvailable: true,
    slotDuration: 10,
    bufferTime: 0,
    timeSlots: []
  });

  // Fetch global schedule settings
  const { data: globalSchedules, isLoading } = useQuery({
    queryKey: ["global-schedules"],
    queryFn: async () => {
      const response = await api.get("/global-schedule");
      return response.data;
    }
  });

  // Initialize default schedule
  const initializeSchedule = useMutation({
    mutationFn: async () => {
      const response = await api.post("/global-schedule/initialize");
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["global-schedules"]);
      alert("Default global schedule initialized successfully!");
    },
    onError: (error) => {
      alert(
        "Failed to initialize: " +
          (error.response?.data?.error || error.message)
      );
    }
  });

  // Save schedule for a day
  const saveSchedule = useMutation({
    mutationFn: async ({ dayOfWeek, data }) => {
      const response = await api.post("/global-schedule", {
        dayOfWeek,
        ...data
      });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["global-schedules"]);
      setEditingDay(null);
      setFormData({
        isAvailable: true,
        slotDuration: 10,
        bufferTime: 0,
        timeSlots: []
      });
    },
    onError: (error) => {
      alert(
        "Failed to save: " + (error.response?.data?.error || error.message)
      );
    }
  });

  // Delete schedule for a day
  const deleteSchedule = useMutation({
    mutationFn: async (dayOfWeek) => {
      await api.delete(`/global-schedule/${dayOfWeek}`);
    },
    onSuccess: () => {
      qc.invalidateQueries(["global-schedules"]);
    },
    onError: (error) => {
      alert(
        "Failed to delete: " + (error.response?.data?.error || error.message)
      );
    }
  });

  const handleEdit = (day) => {
    const schedule = globalSchedules?.find((s) => s.dayOfWeek === day);
    if (schedule && schedule.id) {
      setFormData({
        isAvailable: schedule.isAvailable,
        slotDuration: schedule.slotDuration,
        bufferTime: schedule.bufferTime,
        timeSlots:
          schedule.timeSlots?.map((ts) => ({
            startTime: ts.startTime,
            endTime: ts.endTime,
            displayOrder: ts.displayOrder
          })) || []
      });
    } else {
      setFormData({
        isAvailable: true,
        slotDuration: 10,
        bufferTime: 0,
        timeSlots: []
      });
    }
    setEditingDay(day);
  };

  const handleAddTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [
        ...formData.timeSlots,
        {
          startTime: "09:00",
          endTime: "13:00",
          displayOrder: formData.timeSlots.length
        }
      ]
    });
  };

  const handleRemoveTimeSlot = (index) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.filter((_, i) => i !== index)
    });
  };

  const handleTimeSlotChange = (index, field, value) => {
    const updated = [...formData.timeSlots];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, timeSlots: updated });
  };

  const handleSave = (dayOfWeek) => {
    if (!formData.isAvailable || formData.timeSlots.length === 0) {
      if (!formData.isAvailable) {
        // Allow saving even without time slots if not available
        saveSchedule.mutate({ dayOfWeek, data: formData });
        return;
      }
      alert("Please add at least one time slot");
      return;
    }

    // Validate time slots
    for (const slot of formData.timeSlots) {
      if (!slot.startTime || !slot.endTime) {
        alert("All time slots must have start and end times");
        return;
      }
      const start = timeToMinutes(slot.startTime);
      const end = timeToMinutes(slot.endTime);
      if (start >= end) {
        alert("Start time must be before end time");
        return;
      }
    }

    saveSchedule.mutate({ dayOfWeek, data: formData });
  };

  const timeToMinutes = (time) => {
    const [hh, mm] = time.split(":").map(Number);
    return hh * 60 + mm;
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Global Schedule Settings
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure default availability and time slots for all doctors. These
            settings are used when doctors don't have specific schedules
            configured.
          </p>
        </div>
        <button
          onClick={() => initializeSchedule.mutate()}
          className="btn bg-green-600 text-white hover:bg-green-700"
          disabled={initializeSchedule.isPending}>
          {initializeSchedule.isPending
            ? "Initializing..."
            : "Initialize Defaults"}
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
        <div className="text-sm text-yellow-800">
          <strong>Note:</strong> Default schedule is 9AM-1PM and 2PM-4PM for all
          days. Click "Initialize Defaults" to set this up, or configure each
          day individually.
        </div>
      </div>

      <div className="grid gap-4">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const schedule = globalSchedules?.find((s) => s.dayOfWeek === day);
          const isEditing = editingDay === day;

          return (
            <div
              key={day}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {DAY_NAMES[day]}
                </h3>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingDay(null);
                          setFormData({
                            isAvailable: true,
                            slotDuration: 10,
                            bufferTime: 0,
                            timeSlots: []
                          });
                        }}
                        className="btn bg-gray-500 text-white hover:bg-gray-600">
                        <X size={16} className="mr-1" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(day)}
                        className="btn bg-blue-600 text-white hover:bg-blue-700"
                        disabled={saveSchedule.isPending}>
                        <Save size={16} className="mr-1" />
                        {saveSchedule.isPending ? "Saving..." : "Save"}
                      </button>
                    </>
                  ) : (
                    <>
                      {schedule?.id && (
                        <button
                          onClick={() => deleteSchedule.mutate(day)}
                          className="btn bg-red-600 text-white hover:bg-red-700"
                          disabled={deleteSchedule.isPending}>
                          <Trash2 size={16} className="mr-1" />
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(day)}
                        className="btn bg-blue-600 text-white hover:bg-blue-700">
                        <Clock size={16} className="mr-1" />
                        {schedule?.id ? "Edit" : "Configure"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  {/* Availability Toggle */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`available-${day}`}
                      checked={formData.isAvailable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isAvailable: e.target.checked
                        })
                      }
                      className="w-5 h-5"
                    />
                    <label
                      htmlFor={`available-${day}`}
                      className="text-sm font-medium text-gray-700">
                      Available on {DAY_NAMES[day]}
                    </label>
                  </div>

                  {formData.isAvailable && (
                    <>
                      {/* Slot Duration & Buffer */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Slot Duration (minutes)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="60"
                            value={formData.slotDuration}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                slotDuration: parseInt(e.target.value) || 10
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buffer Time (minutes)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={formData.bufferTime}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bufferTime: parseInt(e.target.value) || 0
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Time Slots */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Time Slots
                          </label>
                          <button
                            type="button"
                            onClick={handleAddTimeSlot}
                            className="btn bg-green-600 text-white hover:bg-green-700 text-sm">
                            <Plus size={16} className="mr-1" />
                            Add Slot
                          </button>
                        </div>

                        {formData.timeSlots.length === 0 ? (
                          <div className="text-sm text-gray-500 p-4 border border-dashed border-gray-300 rounded-md text-center">
                            No time slots added. Click "Add Slot" to add one.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {formData.timeSlots.map((slot, index) => (
                              <div
                                key={index}
                                className="flex gap-3 items-center p-3 bg-gray-50 rounded-md border border-gray-200">
                                <div className="flex-1 grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Start Time
                                    </label>
                                    <input
                                      type="time"
                                      value={slot.startTime}
                                      onChange={(e) =>
                                        handleTimeSlotChange(
                                          index,
                                          "startTime",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      End Time
                                    </label>
                                    <input
                                      type="time"
                                      value={slot.endTime}
                                      onChange={(e) =>
                                        handleTimeSlotChange(
                                          index,
                                          "endTime",
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTimeSlot(index)}
                                  className="btn bg-red-600 text-white hover:bg-red-700 p-2">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  {schedule?.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            schedule.isAvailable
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                          {schedule.isAvailable ? "Available" : "Not Available"}
                        </span>
                        <span className="text-gray-500">
                          Slot: {schedule.slotDuration} min • Buffer:{" "}
                          {schedule.bufferTime} min
                        </span>
                      </div>
                      {schedule.timeSlots && schedule.timeSlots.length > 0 ? (
                        <div className="mt-2">
                          <div className="font-medium text-gray-700 mb-1">
                            Time Slots:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {schedule.timeSlots
                              .sort((a, b) => a.displayOrder - b.displayOrder)
                              .map((ts, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                  {ts.startTime} - {ts.endTime}
                                </span>
                              ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400 italic">
                          No time slots configured (will use defaults)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">
                      Not configured (will use defaults: 9AM-1PM, 2PM-4PM)
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
