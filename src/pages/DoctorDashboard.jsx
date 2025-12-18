import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Stethoscope,
  Activity
} from "lucide-react";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const doctorId = user?.doctorProfile?.id;

  // Fetch today's appointments
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ["doctor-appointments-today", doctorId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const response = await api.get("/appointments", {
        params: { doctorId, date: today, pageSize: 100 }
      });
      return response.data;
    },
    enabled: !!doctorId
  });

  const appointments = appointmentsData?.appointments || [];
  const stats = {
    total: appointments.length,
    completed: appointments.filter((a) => a.status === "COMPLETED").length,
    waiting: appointments.filter((a) =>
      ["CHECKED_IN", "WAITING"].includes(a.status)
    ).length,
    upcoming: appointments.filter((a) =>
      ["BOOKED", "CONFIRMED"].includes(a.status)
    ).length
  };

  if (!doctorId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            No Doctor Profile
          </h2>
          <p className="text-slate-500">
            Your account is not linked to a doctor profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Stethoscope size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome, Dr. {user?.name}</h1>
            <p className="text-blue-100 mt-1">
              {user?.doctorProfile?.department?.name || "Doctor"} •{" "}
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Today's Patients</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Waiting</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">
                {stats.waiting}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="text-amber-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.completed}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Upcoming</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {stats.upcoming}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to={`/doctor/actions/${doctorId}`}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Activity className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Patient Queue</h3>
                <p className="text-sm text-slate-500">
                  Manage today's appointments
                </p>
              </div>
            </div>
            <ArrowRight
              className="text-slate-400 group-hover:text-blue-600 transition"
              size={20}
            />
          </div>
        </Link>

        <Link
          to={`/doctor/queue-monitor/${doctorId}`}
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Users className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Queue Monitor</h3>
                <p className="text-sm text-slate-500">View live queue status</p>
              </div>
            </div>
            <ArrowRight
              className="text-slate-400 group-hover:text-green-600 transition"
              size={20}
            />
          </div>
        </Link>

        <Link
          to="/doctor-schedule"
          className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Calendar className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">My Schedule</h3>
                <p className="text-sm text-slate-500">Manage availability</p>
              </div>
            </div>
            <ArrowRight
              className="text-slate-400 group-hover:text-purple-600 transition"
              size={20}
            />
          </div>
        </Link>
      </div>

      {/* Today's Appointments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Today's Appointments</h2>
          <Link
            to={`/doctor/actions/${doctorId}`}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-slate-500 mt-3">Loading...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500">
              No appointments scheduled for today
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {appointments.slice(0, 5).map((apt) => (
              <div
                key={apt.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <Users className="text-slate-500" size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {apt.patient?.name ||
                        apt.patientProfile?.name ||
                        "Patient"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {apt.scheduledTime || apt.slotTime} • Token #
                      {apt.tokenNumber || "-"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    apt.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : ["CHECKED_IN", "WAITING"].includes(apt.status)
                      ? "bg-amber-100 text-amber-700"
                      : apt.status === "CANCELLED"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                  {apt.status?.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
