import React, { useEffect, useState } from "react";
import {
  X,
  User,
  Stethoscope,
  Building,
  Clock,
  Hash,
  CalendarDays,
  ChevronDown
} from "lucide-react";
import api from "../api/client";

export default function OrderDetailsModal({
  open,
  onClose,
  data,
  socket,
  onUpdated
}) {
  if (!open || !data) return null;

  // FIX 1 — local state for live update inside modal
  const [localData, setLocalData] = useState(data);
  const [loading, setLoading] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // Sync modal data when a new order is opened
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const formatDate = (dt) => (dt ? new Date(dt).toLocaleString() : "-");

  const badgeColor = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
    COMPLETED: "bg-green-100 text-green-800 border-green-300",
    CANCELLED: "bg-red-100 text-red-800 border-red-300",
    SKIPPED: "bg-orange-100 text-orange-800 border-orange-300",
    IN_QUEUE: "bg-purple-100 text-purple-800 border-purple-300"
  };

  const Row = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-200">
      <div className="flex items-center gap-2 text-slate-600">
        {Icon && <Icon size={16} />}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-slate-900">{value ?? "-"}</span>
    </div>
  );

  const Avatar = ({ name }) => (
    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
      {name?.[0] || "?"}
    </div>
  );

  const InfoCard = ({ title, icon: Icon, children }) => (
    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className="text-slate-700" />
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );

  // -------------------------------------------
  // FIXED ACTION: Update status
  // -------------------------------------------
  const updateStatus = async (newStatus) => {
    setLoading(true);

    try {
      await api.patch(
        `/orders/${localData.id}/update-status?type=appointments`,
        {
          status: newStatus
        }
      );

      // FIX 1 — Update modal instantly
      setLocalData((prev) => ({ ...prev, status: newStatus }));

      // Emit queue refresh
      const dateStr = localData.date.split("T")[0];
      socket?.emit("refreshQueue", {
        doctorId: localData.doctorId,
        date: dateStr
      });

      // FIX 2 — Refresh parent table and selected order
      await onUpdated?.();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status");
    }

    setLoading(false);
  };

  // -------------------------------------------
  // FIXED ACTION: Generate Token
  // -------------------------------------------
  const generateToken = async () => {
    setLoading(true);

    try {
      const res = await api.post(`/appointments/generate-token`, {
        appointmentId: localData.id
      });

      const updated = res.data.data;

      // FIX 1 — Update modal instantly
      setLocalData((prev) => ({
        ...prev,
        tokenNumber: updated.tokenNumber,
        status: updated.status
      }));

      // Emit queue refresh
      const dateStr = localData.date.split("T")[0];
      socket?.emit("refreshQueue", {
        doctorId: localData.doctorId,
        date: dateStr
      });

      // FIX 2 — Refresh parent
      await onUpdated?.();
    } catch (err) {
      alert(err.response?.data?.error || "Token generation failed");
    }

    setLoading(false);
  };

  // -------------------------------------------
  // FIXED ACTION: Check-In (Confirm + Token)
  // -------------------------------------------
  const checkIn = async () => {
    setLoading(true);

    try {
      // 1. Confirm
      await api.patch(
        `/orders/${localData.id}/update-status?type=appointments`,
        {
          status: "CONFIRMED"
        }
      );

      // 2. Generate Token
      const res = await api.post(`/appointments/generate-token`, {
        appointmentId: localData.id
      });

      const updated = res.data.data;

      // FIX 1 — Update modal instantly
      setLocalData((prev) => ({
        ...prev,
        status: updated.status,
        tokenNumber: updated.tokenNumber
      }));

      // Emit socket refresh
      const dateStr = localData.date.split("T")[0];
      socket?.emit("refreshQueue", {
        doctorId: localData.doctorId,
        date: dateStr
      });

      // FIX 2 — Refresh table
      await onUpdated?.();
    } catch (err) {
      alert(err.response?.data?.error || "Check-in failed");
    }

    setLoading(false);
  };

  const statusOptions = [
    "PENDING",
    "CONFIRMED",
    "COMPLETED",
    "CANCELLED",
    "SKIPPED",
    "IN_QUEUE"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[580px] max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100">
          <X size={20} />
        </button>

        <h2 className="text-2xl font-semibold text-slate-900 mb-6">
          Appointment Details
        </h2>

        {/* Appointment Info */}
        <div className="space-y-3 rounded-xl p-4 bg-slate-50 border border-slate-200 shadow-sm">
          <Row label="Appointment ID" value={localData.id} icon={Hash} />
          <Row
            label="Date"
            value={formatDate(localData.date)}
            icon={CalendarDays}
          />
          <Row label="Time Slot" value={localData.timeSlot} icon={Clock} />

          {/* Status */}
          <div className="relative">
            <div className="flex justify-between items-center py-2 border-b border-slate-200">
              <span className="text-slate-600 font-medium">Status</span>
              <button
                onClick={() => setStatusOpen((v) => !v)}
                className={`px-3 py-1 text-sm font-semibold rounded-full border flex items-center gap-1 ${
                  badgeColor[localData.status]
                }`}>
                {localData.status} <ChevronDown size={14} />
              </button>
            </div>

            {statusOpen && (
              <div className="absolute right-0 bg-white border shadow-lg rounded-lg z-20 w-40">
                {statusOptions.map((s) => (
                  <div
                    key={s}
                    className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm"
                    onClick={() => updateStatus(s)}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Row label="Token Number" value={localData.tokenNumber} />
          <Row label="Queue Position" value={localData.queuePosition} />
        </div>

        {/* Patient */}
        {localData.patient && (
          <InfoCard title="Patient Details" icon={User}>
            <div className="flex items-start gap-3">
              <Avatar name={localData.patient.name} />
              <div>
                <p className="text-slate-900 font-semibold">
                  {localData.patient.name}
                </p>
                <p className="text-slate-600 text-sm">
                  Phone: {localData.patient.phone || "-"}
                </p>
              </div>
            </div>
          </InfoCard>
        )}

        {/* Doctor */}
        {localData.doctor && (
          <InfoCard title="Doctor Details" icon={Stethoscope}>
            <div className="flex items-start gap-3">
              <Avatar name={localData.doctor.user?.name} />
              <div>
                <p className="text-slate-900 font-semibold">
                  {localData.doctor.user?.name}
                </p>
                <p className="text-slate-600 text-sm">
                  Specialization: {localData.doctor.specialization}
                </p>
              </div>
            </div>
          </InfoCard>
        )}

        {/* Actions */}
        <div className="mt-8 space-y-3">
          {localData.tokenNumber == null && (
            <button
              onClick={checkIn}
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-xl shadow hover:bg-green-700">
              Check-In + Generate Token
            </button>
          )}

          {localData.tokenNumber == null && (
            <button
              onClick={generateToken}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700">
              Generate Token
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 text-white rounded-xl shadow hover:bg-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
