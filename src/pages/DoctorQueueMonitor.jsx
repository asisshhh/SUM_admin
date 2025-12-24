// DoctorQueueMonitorOptimized.jsx
// Production-grade version with socket auto-reconnect + safe reload + toast notifications

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import Socket from "../utils/SocketManager";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Users,
  Clock,
  Activity,
  RefreshCw,
  CheckCircle2,
  Play,
  UserCheck,
  AlertCircle
} from "lucide-react";

export default function DoctorQueueMonitor() {
  const { doctorId } = useParams();
  const today = new Date().toISOString().split("T")[0];

  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [next, setNext] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/appointment-queue/doctor/${doctorId}`, {
        params: { date: today }
      });

      // ✅ Fix API mapping - handle proper response structure
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.appointments || // Primary field from API
          res.data?.list ||
          res.data?.items ||
          [];

      // Filter out completed/cancelled/no_show for queue display
      const activeQueue = list.filter(
        (apt) =>
          apt.status !== "COMPLETED" &&
          apt.status !== "CANCELLED" &&
          apt.status !== "NO_SHOW"
      );

      // Sort by token number or queue position
      activeQueue.sort((a, b) => {
        if (a.tokenNumber && b.tokenNumber) {
          return a.tokenNumber - b.tokenNumber;
        }
        if (a.queuePosition && b.queuePosition) {
          return a.queuePosition - b.queuePosition;
        }
        return 0;
      });

      setQueue(activeQueue);

      // Find current patient (IN_PROGRESS or CHECKED_IN)
      const cur =
        activeQueue.find(
          (x) => x.status === "IN_PROGRESS" || x.status === "CHECKED_IN"
        ) || null;

      // Find next patient (first in queue after current, or first if no current)
      const nxt = cur
        ? activeQueue.find(
            (x) =>
              x.id !== cur.id &&
              (x.tokenNumber > cur.tokenNumber ||
                (x.queuePosition &&
                  cur.queuePosition &&
                  x.queuePosition > cur.queuePosition))
          ) ||
          activeQueue.find((x) => x.id !== cur.id) ||
          null
        : activeQueue[0] || null;

      setCurrent(cur);
      setNext(nxt);
      setLastUpdateTime(new Date());
    } catch (e) {
      console.error("Failed to load queue:", e);
      toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [doctorId, today]);

  // Load doctor details
  const loadDoctor = useCallback(async () => {
    if (!doctorId) return;
    try {
      const res = await api.get(`/doctors/${doctorId}`);
      setDoctor(res.data?.data || res.data || null);
    } catch (e) {
      console.error("Failed to load doctor details:", e);
    }
  }, [doctorId]);

  useEffect(() => {
    loadQueue();
    loadDoctor();
  }, [loadQueue, loadDoctor]);

  // SOCKET HANDLERS (Optimized)
  useEffect(() => {
    if (!doctorId) return;

    const roomPayload = { doctorId: Number(doctorId), date: today };
    Socket.emit("joinDoctorRoom", roomPayload);

    const off1 = Socket.on("queueUpdated", (data) => {
      console.log("Received queueUpdated event", data);
      // Reload if date matches or no date specified (global update)
      if (!data?.date || data.date === today) {
        loadQueue();
      }
    });

    const off2 = Socket.on("queueUpdatedForAllDoctors", (data) => {
      console.log("Received queueUpdatedForAllDoctors event", data);
      // Reload if date matches or no date specified (global update)
      if (!data?.date || data.date === today) {
        loadQueue();
      }
    });

    return () => {
      off1();
      off2();
    };
  }, [doctorId, today, loadQueue]);

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
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
        icon: AlertCircle
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
      <ToastContainer />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                Live Queue Monitor
              </h1>
              <p className="text-slate-600 flex items-center gap-3 flex-wrap">
                {doctor ? (
                  <>
                    <span className="font-semibold text-slate-800">
                      {doctor.user?.name || "Doctor"}
                    </span>
                    {doctor.specialization && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">
                          {doctor.specialization}
                        </span>
                      </>
                    )}
                    {doctor.department?.name && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">
                          {doctor.department.name}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="font-semibold">
                    Loading doctor details...
                  </span>
                )}
                <span className="text-slate-400">•</span>
                <span>{today}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadQueue()}
                disabled={loading}
                className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50">
                <RefreshCw
                  size={18}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CURRENT Patient Card */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                CURRENT
              </h3>
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Activity className="text-green-600" size={20} />
              </div>
            </div>
            <div className="space-y-2">
              {current ? (
                <>
                  <div className="h-px bg-slate-200 mb-3"></div>
                  <p className="text-2xl font-bold text-slate-800">
                    {current.patient?.name || current.user?.name || "Patient"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Token: {current.tokenNumber || "—"}</span>
                    {current.timeSlot && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span>{current.timeSlot}</span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="h-px bg-slate-200 mb-3"></div>
                  <p className="text-xl font-medium text-slate-400">
                    No patient
                  </p>
                </>
              )}
            </div>
          </div>

          {/* NEXT Patient Card */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                NEXT
              </h3>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock className="text-blue-600" size={20} />
              </div>
            </div>
            <div className="space-y-2">
              {next ? (
                <>
                  <div className="h-px bg-slate-200 mb-3"></div>
                  <p className="text-2xl font-bold text-slate-800">
                    {next.patient?.name || next.user?.name || "Patient"}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Token: {next.tokenNumber || "—"}</span>
                    {next.timeSlot && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span>{next.timeSlot}</span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="h-px bg-slate-200 mb-3"></div>
                  <p className="text-xl font-medium text-slate-400">
                    No patient
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Summary
              </h3>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Users className="text-indigo-600" size={20} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-slate-800 mb-1">
                  Total Queue: {queue.length}
                </p>
                <p className="text-sm text-slate-500">
                  {queue.filter((apt) => apt.status === "COMPLETED").length}{" "}
                  completed
                </p>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <p className="text-sm text-slate-500 mb-1">Updated:</p>
                <p className="text-lg font-semibold text-slate-700">
                  {formatTime(lastUpdateTime)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full Queue Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Full Queue</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {queue.length} patient{queue.length !== 1 ? "s" : ""} in queue
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw
                className="mx-auto text-blue-600 animate-spin"
                size={48}
              />
              <p className="text-slate-500 mt-4">Loading queue...</p>
            </div>
          ) : queue.length === 0 ? (
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
                  {queue.map((q, index) => (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        q.id === current?.id
                          ? "bg-green-50 border-l-4 border-l-green-500"
                          : ""
                      } ${
                        q.id === next?.id && q.id !== current?.id
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
                          {q.tokenNumber || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                            <Users className="text-slate-500" size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {q.patient?.name || q.user?.name || "Patient"}
                            </p>
                            {q.patient?.relation && (
                              <p className="text-xs text-slate-500">
                                {q.patient.relation}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock size={14} />
                          {q.timeSlot || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(q.status)}
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
