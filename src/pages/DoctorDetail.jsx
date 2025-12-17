import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import StarRating from "../components/feedback/StarRating";
import {
  Calendar,
  Clock,
  Settings,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  User,
  Stethoscope
} from "lucide-react";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctor-detail", id],
    queryFn: async () => (await api.get(`/doctors/${id}`)).data
  });

  const [range, setRange] = useState({ from: "", to: "" });

  const { data: statsByRange } = useQuery({
    queryKey: ["doctor-stats-range", id, range],
    enabled: !!(range.from && range.to),
    queryFn: async () =>
      (
        await api.get(`/doctors/${id}/stats`, {
          params: { from: range.from, to: range.to }
        })
      ).data
  });

  if (isLoading || !doctor) return <div>Loading...</div>;

  const qual = doctor.qualifications?.map((q) => q.qualification.degree);

  // Group schedules by day
  const schedulesByDay = {};
  doctor.schedules?.forEach((s) => {
    if (!schedulesByDay[s.dayOfWeek]) {
      schedulesByDay[s.dayOfWeek] = [];
    }
    schedulesByDay[s.dayOfWeek].push(s);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Stethoscope size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{doctor.user.name}</h1>
                <div className="text-blue-100 text-lg mt-1">
                  {doctor.specialization}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-blue-100 text-sm">Department</div>
                <div className="font-semibold text-lg">
                  {doctor.department?.name || "—"}
                </div>
              </div>
              <div>
                <div className="text-blue-100 text-sm">Experience</div>
                <div className="font-semibold text-lg">
                  {doctor.experience} years
                </div>
              </div>
              <div>
                <div className="text-blue-100 text-sm">Consultation Fee</div>
                <div className="font-semibold text-lg">
                  ₹{doctor.consultationFee}
                </div>
              </div>
              <div>
                <div className="text-blue-100 text-sm">Total Patients</div>
                <div className="font-semibold text-lg">
                  {doctor.stats.totalPatients}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate(`/doctor-schedule?doctorId=${id}`)}
          className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-lg">
                  Manage Schedule
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Configure weekly availability & exceptions
                </div>
              </div>
            </div>
            <ChevronRight
              className="text-gray-400 group-hover:text-blue-600 transition-colors"
              size={24}
            />
          </div>
        </button>

        <button
          onClick={() => navigate(`/doctor-calendar?doctorId=${id}`)}
          className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-gray-400 hover:shadow-lg transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <Clock className="text-gray-600" size={24} />
              </div>
              <div className="text-left">
                <div className="font-bold text-gray-900 text-lg">
                  View Calendar
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  See appointments & availability
                </div>
              </div>
            </div>
            <ChevronRight
              className="text-gray-400 group-hover:text-gray-600 transition-colors"
              size={24}
            />
          </div>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="text-gray-600 text-sm mb-2">Rating</div>
          <div className="flex items-center gap-3">
            <StarRating value={doctor.stats.avgRating} size={24} />
            <div className="text-2xl font-bold text-gray-900">
              {doctor.stats.avgRating.toFixed(1)}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {doctor.stats.totalReviews} reviews
          </div>
        </div>

        {qual?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="text-gray-600 text-sm mb-2">Qualifications</div>
            <div className="space-y-1">
              {qual.slice(0, 2).map((d, i) => (
                <div key={i} className="font-semibold text-gray-900">
                  {d}
                </div>
              ))}
              {qual.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{qual.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="text-gray-600 text-sm mb-2">Schedule Status</div>
          <div className="flex items-center gap-2">
            {doctor.schedules && doctor.schedules.length > 0 ? (
              <>
                <CheckCircle2 className="text-green-600" size={20} />
                <span className="font-semibold text-gray-900">
                  {doctor.schedules.length} custom schedule
                  {doctor.schedules.length > 1 ? "s" : ""}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="text-yellow-600" size={20} />
                <span className="font-semibold text-gray-900">
                  Using global schedule
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Availability - Enhanced */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="text-blue-600" size={24} />
              Weekly Availability
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Current schedule configuration for this doctor
            </p>
          </div>
          <button
            onClick={() => navigate(`/doctor-schedule?doctorId=${id}`)}
            className="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-lg">
            <Settings size={18} />
            Manage Schedule
          </button>
        </div>

        {doctor.schedules && doctor.schedules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const daySchedules = schedulesByDay[day] || [];
              const hasSchedule = daySchedules.length > 0;

              return (
                <div
                  key={day}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    hasSchedule
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-gray-200 bg-gray-50"
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-gray-900">
                      {DAY_NAMES[day]}
                    </div>
                    {hasSchedule ? (
                      <CheckCircle2 className="text-green-600" size={18} />
                    ) : (
                      <div className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        Global
                      </div>
                    )}
                  </div>
                  {hasSchedule ? (
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="bg-white border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="text-blue-600" size={14} />
                            <span className="font-semibold text-sm text-gray-900">
                              {schedule.template.startTime} -{" "}
                              {schedule.template.endTime}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 ml-6">
                            Slot: {schedule.template.slotDuration} min
                            {schedule.template.bufferTime > 0 &&
                              ` • Buffer: ${schedule.template.bufferTime} min`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Using global schedule
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
              <div>
                <div className="font-semibold text-yellow-900 mb-1">
                  No Custom Schedules
                </div>
                <div className="text-sm text-yellow-800">
                  This doctor is using global schedule settings. Click "Manage
                  Schedule" to configure custom availability.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Exceptions */}
      {doctor.exceptions && doctor.exceptions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <AlertCircle className="text-orange-600" size={24} />
            Schedule Exceptions
          </h2>
          <div className="grid gap-3">
            {doctor.exceptions
              .sort(
                (a, b) => new Date(b.exceptionDate) - new Date(a.exceptionDate)
              )
              .slice(0, 5)
              .map((e) => (
                <div
                  key={e.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        e.exceptionType === "UNAVAILABLE"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                      {e.exceptionType === "UNAVAILABLE"
                        ? "Unavailable"
                        : "Custom Hours"}
                    </div>
                    <div className="font-semibold text-gray-900">
                      {new Date(e.exceptionDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </div>
                  </div>
                  {e.startTime && e.endTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={14} />
                      {e.startTime} - {e.endTime}
                    </div>
                  )}
                  {e.reason && (
                    <div className="text-sm text-gray-500 mt-2">{e.reason}</div>
                  )}
                </div>
              ))}
          </div>
          {doctor.exceptions.length > 5 && (
            <button
              onClick={() => navigate(`/doctor-schedule?doctorId=${id}`)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm">
              View all {doctor.exceptions.length} exceptions →
            </button>
          )}
        </div>
      )}

      {/* Date Range Patients */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Patients (Date Range)
        </h2>
        <div className="flex gap-4 flex-wrap mb-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              From
            </label>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={range.from}
              onChange={(e) =>
                setRange((r) => ({ ...r, from: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              To
            </label>
            <input
              type="date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            />
          </div>
        </div>
        {statsByRange?.count !== undefined && (
          <div className="text-2xl font-bold text-gray-900">
            {statsByRange.count} patients
          </div>
        )}
      </div>

      {/* Patient Reviews */}
      {doctor.feedbacks && doctor.feedbacks.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Patient Reviews
          </h2>
          <div className="space-y-4">
            {doctor.feedbacks.slice(0, 5).map((f) => (
              <div
                key={f.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <StarRating value={f.rating} size={18} />
                  <div className="font-semibold text-gray-900">
                    {f.user.name}
                  </div>
                </div>
                <div className="text-gray-700">{f.comments}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
