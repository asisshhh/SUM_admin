// src/pages/DoctorActionPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import Socket from "../utils/SocketManager";
import { useAuth } from "../contexts/AuthContext";
import {
  Users,
  Phone,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  Calendar,
  Loader2,
  Play,
  SkipForward,
  RotateCcw
} from "lucide-react";
import { toast } from "react-toastify";

export default function DoctorActionPanel() {
  const { doctorId: urlDoctorId } = useParams();
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  // For DOCTOR role, use their own doctorProfile ID
  // For other roles, use the doctorId from URL
  const doctorId =
    user?.role === "DOCTOR" && user?.doctorProfile?.id
      ? user.doctorProfile.id.toString()
      : urlDoctorId;

  // Redirect if no doctorId available
  if (!doctorId) {
    if (user?.role === "DOCTOR") {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Doctor Profile Not Found
            </h2>
            <p className="text-slate-500">
              Your account is not linked to a doctor profile.
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch appointments using the new API
  const {
    data: appointmentsData,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["doctor-appointments", doctorId, today],
    queryFn: async () => {
      const response = await api.get("/appointments", {
        params: {
          doctorId: Number(doctorId),
          date: today,
          pageSize: 100
        }
      });
      return response.data;
    },
    enabled: !!doctorId,
    refetchInterval: 10000 // Auto-refresh every 10 seconds
  });

  const appointments =
    appointmentsData?.appointments || appointmentsData?.items || [];

  // Filter and sort appointments for queue display
  const queueAppointments = appointments
    .filter(
      (apt) =>
        apt.status !== "COMPLETED" &&
        apt.status !== "CANCELLED" &&
        apt.status !== "NO_SHOW"
    )
    .sort((a, b) => {
      // Sort by token number first, then by time slot
      if (a.tokenNumber && b.tokenNumber) {
        return a.tokenNumber - b.tokenNumber;
      }
      if (a.tokenNumber) return -1;
      if (b.tokenNumber) return 1;
      return (a.timeSlot || "").localeCompare(b.timeSlot || "");
    });

  // Find current appointment (IN_PROGRESS or CHECKED_IN)
  const currentAppointment = queueAppointments.find(
    (apt) => apt.status === "IN_PROGRESS" || apt.status === "CHECKED_IN"
  );

  // If no current appointment, use the first one in queue as the next to call
  const nextAppointment = currentAppointment || queueAppointments[0];

  const waitingAppointments = queueAppointments.filter(
    (apt) => apt.id !== currentAppointment?.id
  );

  // Socket connection for real-time updates
  useEffect(() => {
    if (!doctorId) return;

    Socket.emit("joinDoctorRoom", {
      doctorId: Number(doctorId),
      date: today
    });

    // Listen for queue updates from socket
    const offQueueUpdated = Socket.on("queueUpdated", () => {
      // Refetch data when queue is updated
      refetch();
    });

    // Listen for action success/error
    const offActionSuccess = Socket.on("actionSuccess", (data) => {
      setActionLoading(false);
      toast.success(data.message || "Action completed successfully");
      // Refetch will be triggered by queueUpdated event
    });

    const offActionError = Socket.on("actionError", (data) => {
      setActionLoading(false);
      toast.error(data.message || "Action failed");
    });

    return () => {
      offQueueUpdated();
      offActionSuccess();
      offActionError();
    };
  }, [doctorId, today, refetch]);

  const callNext = async () => {
    if (!nextAppointment) {
      toast.warning("No patient in queue to call");
      return;
    }

    setActionLoading(true);
    try {
      // Try HTTP API first (more reliable)
      try {
        const response = await api.post("/appointments/doctor-next", {
          doctorId: Number(doctorId),
          date: today
        });

        if (response.data.success) {
          toast.success(response.data.message || "Moved to next patient");
          // Refetch data
          setTimeout(() => refetch(), 500);
          setActionLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn("HTTP API call failed, trying socket:", apiError);
      }

      // Fallback to socket if HTTP API fails
      await Socket.emit("doctorNext", {
        doctorId: Number(doctorId),
        date: today
      });

      // The socket handler will emit queueUpdated, which triggers refetch
      // Also listen for actionSuccess/actionError for immediate feedback
    } catch (err) {
      console.error("Call next error:", err);
      toast.error("Failed to call next patient");
      setActionLoading(false);
    }
    // Don't set loading to false here - let socket success/error handle it
  };

  const skip = async () => {
    if (!nextAppointment) {
      toast.warning("No patient in queue to skip");
      return;
    }

    setActionLoading(true);
    try {
      // Try HTTP API first (more reliable)
      try {
        const response = await api.post("/appointments/doctor-skip", {
          doctorId: Number(doctorId),
          date: today,
          reason: "Skipped by doctor"
        });

        if (response.data.success) {
          toast.success(response.data.message || "Patient skipped");
          // Refetch data
          setTimeout(() => refetch(), 500);
          setActionLoading(false);
          return;
        }
      } catch (apiError) {
        console.warn("HTTP API call failed, trying socket:", apiError);
      }

      // Fallback to socket if HTTP API fails
      await Socket.emit("doctorSkip", {
        doctorId: Number(doctorId),
        date: today,
        reason: "Skipped by doctor"
      });

      // The socket handler will emit queueUpdated, which triggers refetch
      // Also listen for actionSuccess/actionError for immediate feedback
    } catch (err) {
      console.error("Skip error:", err);
      toast.error("Failed to skip patient");
      setActionLoading(false);
    }
    // Don't set loading to false here - let socket success/error handle it
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: {
        label: "Pending",
        className: "bg-amber-100 text-amber-700 border-amber-200",
        icon: Clock
      },
      CONFIRMED: {
        label: "Confirmed",
        className: "bg-blue-100 text-blue-700 border-blue-200",
        icon: CheckCircle2
      },
      CHECKED_IN: {
        label: "Checked In",
        className: "bg-purple-100 text-purple-700 border-purple-200",
        icon: UserCheck
      },
      IN_PROGRESS: {
        label: "In Progress",
        className: "bg-green-100 text-green-700 border-green-200",
        icon: Play
      },
      COMPLETED: {
        label: "Completed",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: CheckCircle2
      },
      CANCELLED: {
        label: "Cancelled",
        className: "bg-red-100 text-red-700 border-red-200",
        icon: XCircle
      },
      NO_SHOW: {
        label: "No Show",
        className: "bg-gray-100 text-gray-700 border-gray-200",
        icon: AlertCircle
      }
    };

    const config = statusConfig[status] || {
      label: status?.replace(/_/g, " ") || "Unknown",
      className: "bg-gray-100 text-gray-700 border-gray-200",
      icon: AlertCircle
    };

    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Doctor Action Panel
                {user?.role === "DOCTOR" && user?.name && (
                  <span className="text-xl text-slate-600 font-normal ml-2">
                    — Dr. {user.name}
                  </span>
                )}
              </h1>
              <p className="text-slate-600 flex items-center gap-2">
                <Calendar size={16} />
                {new Date(today).toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50">
                <RefreshCw
                  size={18}
                  className={isLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">
                  Total Appointments
                </p>
                <p className="text-3xl font-bold text-slate-800">
                  {appointments.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">In Queue</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {queueAppointments.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Clock className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Completed</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {
                    appointments.filter((apt) => apt.status === "COMPLETED")
                      .length
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Current/Next Patient Card */}
        {nextAppointment && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-2xl border border-green-400 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <UserCheck size={28} />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-50 mb-1">
                    {currentAppointment ? "Current Patient" : "Next Patient"}
                  </p>
                  <h2 className="text-2xl font-bold">
                    {nextAppointment.patient?.name ||
                      nextAppointment.user?.name ||
                      "Patient"}
                  </h2>
                </div>
              </div>
              {getStatusBadge(nextAppointment.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-green-50 mb-1">Token Number</p>
                <p className="text-xl font-bold">
                  {nextAppointment.tokenNumber || "—"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-green-50 mb-1">Time Slot</p>
                <p className="text-xl font-bold">
                  {nextAppointment.timeSlot || "—"}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <p className="text-xs text-green-50 mb-1">Department</p>
                <p className="text-xl font-bold">
                  {nextAppointment.department?.name || "—"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={callNext}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-white text-green-600 rounded-xl font-semibold hover:bg-green-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Play size={20} />
                    Call Next
                  </>
                )}
              </button>
              <button
                onClick={skip}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <SkipForward size={20} />
                    Skip
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Queue Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Patient Queue
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {queueAppointments.length} patient
                  {queueAppointments.length !== 1 ? "s" : ""} waiting
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2
                className="mx-auto text-blue-600 animate-spin"
                size={48}
              />
              <p className="text-slate-500 mt-4">Loading appointments...</p>
            </div>
          ) : queueAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="mx-auto text-slate-300 mb-4" size={64} />
              <p className="text-slate-500 text-lg">No appointments in queue</p>
              <p className="text-slate-400 text-sm mt-2">
                All appointments have been completed or cancelled
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Token
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Time Slot
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {queueAppointments.map((apt, index) => (
                    <tr
                      key={apt.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        apt.id === nextAppointment?.id
                          ? "bg-blue-50 border-l-4 border-l-blue-500"
                          : ""
                      }`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-semibold text-slate-800">
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                          {apt.tokenNumber || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                            <Users className="text-slate-500" size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {apt.patient?.name || apt.user?.name || "Patient"}
                            </p>
                            {apt.patient?.relation && (
                              <p className="text-xs text-slate-500">
                                {apt.patient.relation}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock size={14} />
                          {apt.timeSlot || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(apt.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
