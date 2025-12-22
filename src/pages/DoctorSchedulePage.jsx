import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { SearchableDropdown } from "../components/shared";
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Settings,
  User
} from "lucide-react";

import AddWeeklyScheduleModal from "../components/schedule/AddWeeklyScheduleModal";
import AddExceptionModal from "../components/schedule/AddExceptionModal";
import SlotPreview from "../components/schedule/SlotPreview";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DoctorSchedulePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const doctorIdFromUrl = searchParams.get("doctorId");

  const [selectedDoctor, setSelectedDoctor] = useState(doctorIdFromUrl || "");
  const [showAddWeeklyModal, setShowAddWeeklyModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [activeTab, setActiveTab] = useState("weekly"); // weekly, exceptions, preview
  const [preselectedDay, setPreselectedDay] = useState(undefined);

  // Auto-set selectedDoctor if user is a doctor
  useEffect(() => {
    if (user?.role === "DOCTOR" && user?.doctorProfile?.id && !selectedDoctor) {
      const doctorId = user.doctorProfile.id.toString();
      setSelectedDoctor(doctorId);
      navigate(`/doctor-schedule?doctorId=${doctorId}`, { replace: true });
    }
  }, [user, selectedDoctor, navigate]);

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ["doctors-list"],
    queryFn: async () => {
      // Fetch all doctors with pagination (max pageSize is 100)
      let allDoctors = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get("/doctors", {
          params: { page, pageSize }
        });
        const { items, total } = response.data;
        allDoctors = [...allDoctors, ...items];

        if (allDoctors.length >= total || items.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }

      return allDoctors;
    }
  });

  // Fetch selected doctor details
  const { data: selectedDoctorData } = useQuery({
    queryKey: ["doctor-detail", selectedDoctor],
    enabled: !!selectedDoctor,
    queryFn: async () => (await api.get(`/doctors/${selectedDoctor}`)).data
  });

  // Fetch weekly schedules
  const { data: schedules } = useQuery({
    queryKey: ["doctor-schedules", selectedDoctor],
    enabled: !!selectedDoctor,
    queryFn: async () => (await api.get(`/schedule/${selectedDoctor}`)).data
  });

  // Fetch exceptions
  const { data: exceptions } = useQuery({
    queryKey: ["doctor-exceptions", selectedDoctor],
    enabled: !!selectedDoctor,
    queryFn: async () =>
      (await api.get(`/schedule/${selectedDoctor}/exceptions`)).data
  });

  // Fetch global schedule for comparison
  const { data: globalSchedules } = useQuery({
    queryKey: ["global-schedules"],
    queryFn: async () => {
      try {
        const response = await api.get("/global-schedule");
        return response.data;
      } catch {
        return [];
      }
    }
  });

  // Delete schedule
  const deleteSchedule = useMutation({
    mutationFn: async (id) => await api.delete(`/schedule/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(["doctor-schedules", selectedDoctor]);
    }
  });

  // Delete exception
  const deleteException = useMutation({
    mutationFn: async (id) => await api.delete(`/schedule/exception/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(["doctor-exceptions", selectedDoctor]);
    }
  });

  // Group schedules by day
  const schedulesByDay = {};
  schedules?.forEach((s) => {
    if (!schedulesByDay[s.dayOfWeek]) {
      schedulesByDay[s.dayOfWeek] = [];
    }
    schedulesByDay[s.dayOfWeek].push(s);
  });

  const getGlobalScheduleForDay = (dayOfWeek) => {
    return globalSchedules?.find((gs) => gs.dayOfWeek === dayOfWeek);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="text-blue-600" size={32} />
            Doctor Schedule Management
          </h1>
          <p className="text-gray-600 mt-2">
            Configure weekly availability and time slots for doctors
          </p>
        </div>
        {selectedDoctor && (
          <button
            onClick={() => navigate(`/doctors/${selectedDoctor}`)}
            className="btn bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2">
            <User size={18} />
            View Doctor Details
          </button>
        )}
      </div>

      {/* Doctor Selection Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {user?.role === "DOCTOR" ? "Doctor" : "Select Doctor"}
        </label>
        <div className="flex gap-4 items-center">
          {user?.role !== "DOCTOR" ? (
            <div className="flex-1">
              <SearchableDropdown
                value={selectedDoctor || ""}
                options={[
                  { value: "", label: "Choose a doctor..." },
                  ...(doctors || []).map((d) => ({
                    value: String(d.id),
                    label: `${d.user.name} — ${d.specialization}`
                  }))
                ]}
                onChange={(value) => {
                  setSelectedDoctor(value);
                  navigate(`/doctor-schedule?doctorId=${value}`);
                }}
                placeholder="Choose a doctor..."
                className=""
              />
            </div>
          ) : (
            <div className="flex-1 px-4 py-3 bg-slate-50 border border-gray-300 rounded-lg text-gray-700 font-medium">
              {selectedDoctorData?.user?.name || "Loading..."} —{" "}
              {selectedDoctorData?.specialization || "General"}
            </div>
          )}
          {selectedDoctorData && (
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-gray-200">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="text-blue-600" size={20} />
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {selectedDoctorData.user.name}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedDoctorData.specialization}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedDoctor && (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex gap-1">
              <button
                onClick={() => setActiveTab("weekly")}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "weekly"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                <div className="flex items-center gap-2">
                  <Calendar size={18} />
                  Weekly Schedule
                </div>
              </button>
              <button
                onClick={() => setActiveTab("exceptions")}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "exceptions"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} />
                  Exceptions
                  {exceptions && exceptions.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                      {exceptions.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "preview"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                <div className="flex items-center gap-2">
                  <Clock size={18} />
                  Slot Preview
                </div>
              </button>
            </nav>
          </div>

          {/* Weekly Schedule Tab */}
          {activeTab === "weekly" && (
            <div className="space-y-6">
              {/* Action Bar */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Weekly Availability
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Configure which days and times this doctor is available
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPreselectedDay(undefined);
                    setShowAddWeeklyModal(true);
                  }}
                  className="btn bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg flex items-center gap-2 px-6 py-3 rounded-lg font-semibold">
                  <Plus size={20} />
                  Add Schedule
                </button>
              </div>

              {/* Week View */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const daySchedules = schedulesByDay[day] || [];
                  const globalSchedule = getGlobalScheduleForDay(day);
                  const hasCustomSchedule = daySchedules.length > 0;

                  return (
                    <div
                      key={day}
                      className={`bg-white border-2 rounded-xl p-5 transition-all hover:shadow-lg ${
                        hasCustomSchedule
                          ? "border-blue-300 bg-blue-50/30"
                          : "border-gray-200"
                      }`}>
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-bold text-lg text-gray-900">
                            {DAY_NAMES[day]}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {DAY_SHORT[day]}
                          </div>
                        </div>
                        {hasCustomSchedule ? (
                          <CheckCircle2 className="text-green-600" size={20} />
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            <Clock size={12} />
                            Global
                          </div>
                        )}
                      </div>

                      {/* Schedules */}
                      {hasCustomSchedule ? (
                        <div className="space-y-2">
                          {daySchedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              className="bg-white border border-blue-200 rounded-lg p-3 group hover:border-blue-400 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Clock
                                      className="text-blue-600"
                                      size={14}
                                    />
                                    <span className="font-semibold text-gray-900 text-sm">
                                      {schedule.template.startTime} -{" "}
                                      {schedule.template.endTime}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 ml-6">
                                    Slot: {schedule.template.slotDuration} min
                                    {schedule.template.bufferTime > 0 &&
                                      ` • Buffer: ${schedule.template.bufferTime} min`}
                                  </div>
                                  <div className="text-xs text-gray-500 ml-6 mt-1">
                                    {schedule.template.name}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Remove schedule for ${DAY_NAMES[day]}?`
                                      )
                                    ) {
                                      deleteSchedule.mutate(schedule.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded text-red-600">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <div className="text-sm text-gray-500 mb-2">
                            Using global schedule
                          </div>
                          {globalSchedule?.timeSlots &&
                          globalSchedule.timeSlots.length > 0 ? (
                            <div className="space-y-1">
                              {globalSchedule.timeSlots.map((ts, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                                  {ts.startTime} - {ts.endTime}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              9AM-1PM, 2PM-4PM
                            </div>
                          )}
                        </div>
                      )}

                      {/* Add Button */}
                      <button
                        onClick={() => {
                          setPreselectedDay(day);
                          setShowAddWeeklyModal(true);
                        }}
                        className="mt-3 w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors flex items-center justify-center gap-1">
                        <Plus size={14} />
                        Add Schedule
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Info Banner */}
              {schedules?.length === 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                    <div className="flex-1">
                      <div className="font-semibold text-blue-900 mb-1">
                        No Custom Schedules Configured
                      </div>
                      <div className="text-sm text-blue-800">
                        This doctor is currently using global schedule settings
                        for all days. Add custom schedules to override the
                        default availability. You can manage global settings in{" "}
                        <a
                          href="/global-schedule"
                          className="underline font-semibold hover:text-blue-900">
                          Global Schedule
                        </a>
                        .
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Exceptions Tab */}
          {activeTab === "exceptions" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Schedule Exceptions
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Mark specific dates as unavailable or with custom hours
                  </p>
                </div>
                <button
                  onClick={() => setShowExceptionModal(true)}
                  className="btn bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-700 hover:to-red-700 shadow-lg flex items-center gap-2 px-6 py-3 rounded-lg font-semibold">
                  <Plus size={20} />
                  Add Exception
                </button>
              </div>

              {exceptions?.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                  <AlertCircle
                    className="mx-auto text-gray-400 mb-4"
                    size={48}
                  />
                  <div className="text-gray-600 font-medium mb-2">
                    No exceptions added
                  </div>
                  <div className="text-sm text-gray-500">
                    Add exceptions to mark specific dates as unavailable or with
                    custom hours
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {exceptions
                    .sort(
                      (a, b) =>
                        new Date(b.exceptionDate) - new Date(a.exceptionDate)
                    )
                    .map((exception) => (
                      <div
                        key={exception.id}
                        className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  exception.exceptionType === "UNAVAILABLE"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}>
                                {exception.exceptionType === "UNAVAILABLE"
                                  ? "Unavailable"
                                  : "Custom Hours"}
                              </div>
                              <div className="font-bold text-gray-900">
                                {new Date(
                                  exception.exceptionDate
                                ).toLocaleDateString("en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric"
                                })}
                              </div>
                            </div>
                            {exception.startTime && exception.endTime && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 ml-1">
                                <Clock size={14} />
                                {exception.startTime} - {exception.endTime}
                              </div>
                            )}
                            {exception.reason && (
                              <div className="text-sm text-gray-500 mt-2 ml-1">
                                {exception.reason}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this exception?"
                                )
                              ) {
                                deleteException.mutate(exception.id);
                              }
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === "preview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Slot Preview
                </h2>
                <p className="text-sm text-gray-600">
                  Preview available time slots for a specific date
                </p>
              </div>
              <SlotPreview doctorId={selectedDoctor} />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showAddWeeklyModal && (
        <AddWeeklyScheduleModal
          doctorId={selectedDoctor}
          preselectedDay={preselectedDay}
          onClose={() => {
            setShowAddWeeklyModal(false);
            setPreselectedDay(undefined);
          }}
        />
      )}

      {showExceptionModal && (
        <AddExceptionModal
          doctorId={selectedDoctor}
          onClose={() => setShowExceptionModal(false)}
        />
      )}
    </div>
  );
}
