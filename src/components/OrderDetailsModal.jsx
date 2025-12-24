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
  CreditCard,
  RotateCcw
} from "lucide-react";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import { toast } from "react-toastify";

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
  const confirm = useConfirm();

  // Sync modal data when a new order is opened
  useEffect(() => {
    setLocalData(data);
  }, [data]);
  // Calculate effective payment status - check payments array first for REFUNDED status
  const refundedPayment = localData?.payments?.find(
    (p) => p.status === "REFUNDED"
  );
  const effectivePaymentStatus = refundedPayment
    ? "REFUNDED"
    : localData?.paymentStatus === "PAID"
    ? "SUCCESS"
    : localData?.paymentStatus ||
      localData?.payments?.[0]?.status ||
      localData?.billing?.status ||
      "PENDING";
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
    IN_QUEUE: "bg-purple-100 text-purple-800 border-purple-300",
    IN_PROGRESS: "bg-indigo-100 text-indigo-800 border-indigo-300",
    CHECKED_IN: "bg-purple-100 text-purple-800 border-purple-300", // Backend status, maps to IN_QUEUE in UI
    NO_SHOW: "bg-orange-100 text-orange-800 border-orange-300" // Backend status, maps to SKIPPED in UI
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
    const ok = await confirm({
      title: "Mark Payment as Paid",
      message: "Confirm payment received at hospital?"
    });
    if (!ok) return;

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
      toast.success("Payment marked as PAID");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark payment");
    }
    setLoading(false);
  };

  const handleRefund = async () => {
    // Find the payment with SUCCESS status and isOnline
    const payment = localData.payments?.find(
      (p) =>
        p.status === "SUCCESS" &&
        p.isOnline === true &&
        p.gatewayPaymentId &&
        p.status !== "REFUNDED"
    );

    if (!payment) {
      toast.error("No eligible payment found for refund");
      return;
    }

    const ok = await confirm({
      title: "Process Refund",
      message: `Are you sure you want to process a refund of ₹${payment.amount} for this cancelled appointment?`
    });

    if (!ok) return;

    setLoading(true);
    try {
      const response = await api.post(`/ccavenue/refund/${payment.id}`, {
        reason: "Appointment cancelled"
      });

      if (response.data.success) {
        toast.success("Refund processed successfully");
        // Update local data - mark payment as REFUNDED
        setLocalData((prev) => ({
          ...prev,
          payments: prev.payments?.map((p) =>
            p.id === payment.id
              ? {
                  ...p,
                  status: "REFUNDED",
                  refundedAt: response.data.payment?.refundedAt || new Date()
                }
              : p
          ),
          // Also update paymentStatus if it exists
          paymentStatus: "REFUNDED"
        }));
        await onUpdated?.();
      } else {
        toast.error(response.data.error || "Failed to process refund");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to process refund"
      );
    }
    setLoading(false);
  };

  // ✅ Sequential status transitions for appointments (like ambulance orders)
  // Workflow: PENDING → CONFIRMED → IN_QUEUE (CHECKED_IN) → IN_PROGRESS → COMPLETED
  // Cannot go backwards (e.g., CONFIRMED → PENDING)
  // Admin cannot directly set IN_QUEUE - must go through CONFIRMED first
  const STATUS_TRANSITIONS = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["IN_QUEUE", "CANCELLED", "SKIPPED"], // Cannot go back to PENDING
    CHECKED_IN: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "SKIPPED"], // Backend uses CHECKED_IN, UI shows IN_QUEUE
    IN_QUEUE: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "SKIPPED"], // UI label for CHECKED_IN
    IN_PROGRESS: ["COMPLETED", "CANCELLED"], // Cannot go back
    COMPLETED: [], // No transitions from COMPLETED
    CANCELLED: [], // No transitions from CANCELLED
    NO_SHOW: [], // No transitions from NO_SHOW
    SKIPPED: [] // No transitions from SKIPPED (UI label for NO_SHOW)
  };

  // All possible status options for UI (mapped from backend enum)
  const ALL_STATUS_OPTIONS = [
    "PENDING",
    "CONFIRMED",
    "IN_QUEUE", // UI label for CHECKED_IN
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
    "SKIPPED" // UI label for NO_SHOW
  ];

  // Get allowed status transitions based on current status
  const getAllowedStatuses = () => {
    const currentStatus = localData.status;
    const allowed = STATUS_TRANSITIONS[currentStatus] || [];

    // Map backend statuses to UI statuses
    // CHECKED_IN (backend) → IN_QUEUE (UI)
    // NO_SHOW (backend) → SKIPPED (UI)
    const mappedAllowed = allowed.map((s) => {
      if (s === "CHECKED_IN") return "IN_QUEUE";
      if (s === "NO_SHOW") return "SKIPPED";
      return s;
    });

    // Filter to only include valid UI status options
    return mappedAllowed.filter((s) => ALL_STATUS_OPTIONS.includes(s));
  };

  const statusOptions = getAllowedStatuses();

  // Map backend status to UI display status (CHECKED_IN → IN_QUEUE, NO_SHOW → SKIPPED)
  const displayStatus =
    localData.status === "CHECKED_IN"
      ? "IN_QUEUE"
      : localData.status === "NO_SHOW"
      ? "SKIPPED"
      : localData.status;

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
                    badgeColor[displayStatus] || badgeColor[localData.status]
                  }`}>
                  {displayStatus} <ChevronDown size={14} />
                </button>
              </div>

              {statusOpen && (
                <div className="absolute right-0 mt-2 bg-white border-2 border-slate-200 shadow-2xl rounded-xl z-20 w-48 overflow-hidden">
                  {statusOptions.length > 0 ? (
                    statusOptions.map((s) => (
                      <div
                        key={s}
                        className="px-4 py-2.5 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 cursor-pointer text-sm font-medium text-slate-700 transition-all border-b border-slate-100 last:border-0"
                        onClick={() => {
                          updateStatus(s);
                          setStatusOpen(false);
                        }}>
                        {s}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2.5 text-sm text-slate-500 italic">
                      No status transitions available
                    </div>
                  )}
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
                    : effectivePaymentStatus === "REFUNDED"
                    ? "bg-orange-50 text-orange-700 border-orange-300"
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

          {/* REFUND OPTION FOR CANCELLED APPOINTMENTS */}
          {localData.status === "CANCELLED" &&
            (() => {
              const refundablePayment = localData.payments?.find(
                (p) =>
                  p.status === "SUCCESS" &&
                  p.isOnline === true &&
                  p.gatewayPaymentId &&
                  !p.refundedAt &&
                  p.status !== "REFUNDED"
              );

              if (!refundablePayment) return null;

              return (
                <div className="p-5 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg mb-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <RotateCcw size={20} className="text-orange-600" />
                    Refund Payment
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-orange-200/60">
                      <span className="text-slate-600 font-semibold">
                        Payment Amount
                      </span>
                      <span className="font-bold text-slate-800 text-lg">
                        ₹{refundablePayment.amount}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-600 font-semibold">
                        Payment Status
                      </span>
                      <span className="px-3 py-1.5 rounded-xl font-bold text-sm border-2 bg-emerald-50 text-emerald-700 border-emerald-300">
                        {refundablePayment.status}
                      </span>
                    </div>

                    <button
                      onClick={handleRefund}
                      disabled={loading}
                      className="w-full mt-4 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl shadow-lg hover:shadow-xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? "Processing Refund..." : "Process Refund"}
                    </button>
                  </div>
                </div>
              );
            })()}
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
