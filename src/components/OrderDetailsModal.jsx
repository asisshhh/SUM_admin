import React, { useEffect, useState } from "react";
import {
  X,
  User,
  Stethoscope,
  Building,
  Clock,
  Hash,
  CalendarDays,
  ChevronDown,
  CreditCard
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
  // payment state (ADMIN – Pay at hospital)
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");

  // Sync modal data when a new order is opened
  useEffect(() => {
    setLocalData(data);
  }, [data]);
  const effectivePaymentStatus =
    localData?.paymentStatus === "PAID"
      ? "SUCCESS"
      : localData?.paymentStatus || localData?.billing?.status || "PENDING";
  const effectiveAmount =
    localData.paymentAmount ??
    localData.payments?.[0]?.amount ??
    localData.billing?.amount ??
    localData.doctor?.consultationFee ??
    "-";

  const formatDate = (dt) => (dt ? new Date(dt).toLocaleString("en-IN") : "-");

  const badgeColor = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
    COMPLETED: "bg-green-100 text-green-800 border-green-300",
    CANCELLED: "bg-red-100 text-red-800 border-red-300",
    SKIPPED: "bg-orange-100 text-orange-800 border-orange-300",
    IN_QUEUE: "bg-purple-100 text-purple-800 border-purple-300"
  };

  const paymentStatusColor = {
    PENDING: "text-yellow-600",
    INITIATED: "text-blue-600",
    SUCCESS: "text-green-600",
    FAILED: "text-red-600",
    REFUNDED: "text-orange-600",
    PARTIAL: "text-purple-600",
    CANCELLED: "text-gray-600"
  };

  const Row = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-200/60 last:border-0">
      <div className="flex items-center gap-2.5 text-slate-600">
        {Icon && <Icon size={17} className="text-violet-600" />}
        <span className="font-semibold text-slate-700">{label}</span>
      </div>
      <span className="text-slate-900 font-medium">{value ?? "-"}</span>
    </div>
  );

  const Avatar = ({ name }) => (
    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
      {name?.[0] || "?"}
    </div>
  );

  const InfoCard = ({ title, icon: Icon, children }) => (
    <div className="p-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-lg mb-6">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200/60">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
          <Icon size={18} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
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
      await api.post(
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
  const markPaid = async () => {
    if (!confirm("Confirm payment received at hospital?")) return;

    setLoading(true);
    try {
      await api.post("/payments/mark-paid", {
        orderType: "APPOINTMENT",
        orderId: localData.id,
        amount: effectiveAmount,
        method: "CASH",
        status: "SUCCESS"
      });

      // ✅ Update local payment state
      setLocalData((prev) => ({
        ...prev,
        paymentStatus: "SUCCESS"
      }));

      await onUpdated?.();
      alert("Payment marked as PAID");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark payment");
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-[640px] max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Fixed Premium Header */}
        <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <CalendarDays className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Appointment Details
                </h2>
                <p className="text-sm text-white/80 font-medium">
                  ID: #{localData.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Appointment Info */}
          <div className="space-y-3 rounded-2xl p-5 bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 shadow-lg mb-6">
            <Row label="Appointment ID" value={localData.id} icon={Hash} />
            <Row
              label="Date"
              value={formatDate(localData.date)}
              icon={CalendarDays}
            />
            <Row label="Time Slot" value={localData.timeSlot} icon={Clock} />

            {/* Status */}
            <div className="relative">
              <div className="flex justify-between items-center py-3 border-b border-slate-200/60">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600"></div>
                  <span className="font-semibold text-slate-700">Status</span>
                </div>
                <button
                  onClick={() => setStatusOpen((v) => !v)}
                  className={`px-4 py-1.5 text-sm font-bold rounded-xl border-2 flex items-center gap-2 shadow-sm transition-all hover:scale-105 ${
                    badgeColor[localData.status]
                  }`}>
                  {localData.status} <ChevronDown size={14} />
                </button>
              </div>

              {statusOpen && (
                <div className="absolute right-0 mt-2 bg-white border-2 border-slate-200 shadow-2xl rounded-xl z-20 w-48 overflow-hidden">
                  {statusOptions.map((s) => (
                    <div
                      key={s}
                      className="px-4 py-2.5 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 cursor-pointer text-sm font-medium text-slate-700 transition-all border-b border-slate-100 last:border-0"
                      onClick={() => {
                        updateStatus(s);
                        setStatusOpen(false);
                      }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Row label="Token Number" value={localData.tokenNumber} />
            <Row label="Queue Position" value={localData.queuePosition} />

            {/* Payment Status */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5 text-slate-600">
                <CreditCard size={17} className="text-violet-600" />
                <span className="font-semibold text-slate-700">
                  Payment Status
                </span>
              </div>
              <span
                className={`px-3 py-1.5 rounded-xl font-bold text-sm border-2 ${
                  effectivePaymentStatus === "SUCCESS"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : effectivePaymentStatus === "PENDING"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                    : effectivePaymentStatus === "FAILED"
                    ? "bg-red-50 text-red-700 border-red-300"
                    : "bg-slate-50 text-slate-700 border-slate-300"
                }`}>
                {effectivePaymentStatus || "PENDING"}
              </span>
            </div>
          </div>

          {/* Patient */}
          {localData.patient && (
            <InfoCard title="Patient Details" icon={User}>
              <div className="flex items-start gap-4">
                <Avatar name={localData.patient.name} />
                <div className="flex-1">
                  <p className="text-slate-900 font-bold text-lg mb-1">
                    {localData.patient.name}
                  </p>
                  <p className="text-slate-600 text-sm font-medium">
                    📞{" "}
                    {localData.patientPhone ||
                      localData.user?.phone ||
                      localData.patient?.phone ||
                      "-"}
                  </p>
                </div>
              </div>
            </InfoCard>
          )}

          {/* Doctor */}
          {localData.doctor && (
            <InfoCard title="Doctor Details" icon={Stethoscope}>
              <div className="flex items-start gap-4">
                <Avatar name={localData.doctor.user?.name} />
                <div className="flex-1">
                  <p className="text-slate-900 font-bold text-lg mb-1">
                    {localData.doctor.user?.name}
                  </p>
                  <p className="text-slate-600 text-sm font-medium">
                    🏥 {localData.doctor.specialization}
                  </p>
                </div>
              </div>
            </InfoCard>
          )}
          {/* PAYMENT INFO */}
          {localData.paymentOption === "PAY_AT_HOSPITAL" &&
            effectivePaymentStatus !== "SUCCESS" && (
              <div className="p-5 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg mb-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-amber-600" />
                  Payment Details
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-amber-200/60">
                    <span className="text-slate-600 font-semibold">Mode</span>
                    <span className="font-bold text-slate-800">
                      {localData.paymentOption}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-amber-200/60">
                    <span className="text-slate-600 font-semibold">Amount</span>
                    <span className="font-bold text-slate-800 text-lg">
                      ₹{effectiveAmount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600 font-semibold">Status</span>
                    <span
                      className={`px-3 py-1.5 rounded-xl font-bold text-sm border-2 ${
                        effectivePaymentStatus === "SUCCESS"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-yellow-50 text-yellow-700 border-yellow-300"
                      }`}>
                      {effectivePaymentStatus}
                    </span>
                  </div>

                  {localData.paymentOption === "PAY_AT_HOSPITAL" &&
                    effectivePaymentStatus !== "SUCCESS" && (
                      <button
                        onClick={markPaid}
                        disabled={loading}
                        className="w-full mt-4 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl shadow-lg hover:shadow-xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? "Processing..." : "Mark Payment as PAID"}
                      </button>
                    )}
                </div>
              </div>
            )}
        </div>

        {/* Fixed Premium Footer */}
        <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all hover:scale-105 shadow-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
