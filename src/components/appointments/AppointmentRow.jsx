import React from "react";
import {
  Calendar,
  Clock,
  Eye,
  Printer,
  Users,
  CreditCard,
  RotateCcw
} from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function AppointmentRow({
  appointment,
  index,
  onView,
  onPrint,
  onRefund
}) {
  const r = appointment;

  // Calculate payment status - check payments array first for REFUNDED status
  const refundedPayment = r.payments?.find((p) => p.status === "REFUNDED");
  const effectivePaymentStatus = refundedPayment
    ? "REFUNDED"
    : r.paymentStatus === "PAID"
    ? "SUCCESS"
    : r.paymentStatus ||
      r.payments?.[0]?.status ||
      r.billing?.status ||
      "PENDING";

  return (
    <tr className="hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-transparent transition-all duration-200 border-b border-slate-100 last:border-0">
      {/* Index */}
      <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">#{index}</td>

      {/* Patient Info */}
      <td className="px-4 py-3.5">
        <PatientCell name={r.patient?.name} phone={r.patient?.phone} />
      </td>

      {/* Doctor Info */}
      <td className="px-4 py-3.5">
        <DoctorCell
          name={r.doctor?.user?.name}
          department={r.department?.name}
        />
      </td>

      {/* Schedule */}
      <td className="px-4 py-3.5">
        <ScheduleCell date={r.date} timeSlot={r.timeSlot} />
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={r.status} />
      </td>

      {/* Amount */}
      <td className="px-4 py-3.5">
        <AmountCell
          amount={
            r.paymentAmount ??
            r.payments?.[0]?.amount ??
            r.billing?.amount ??
            r.doctor?.consultationFee
          }
          isPaid={r.paymentStatus === "SUCCESS"}
        />
      </td>

      {/* Payment Status */}
      <td className="px-4 py-3.5">
        <PaymentStatusCell status={effectivePaymentStatus} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <ActionButtons
          onView={onView}
          onPrint={onPrint}
          onRefund={onRefund}
          doctorId={r.doctorId}
          appointment={r}
        />
      </td>
    </tr>
  );
}

// Sub-components
function PatientCell({ name, phone }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
        {name?.[0] || "?"}
      </div>
      <div>
        <p className="font-medium text-slate-800">{name || "-"}</p>
        <p className="text-xs text-slate-500">{phone || "-"}</p>
      </div>
    </div>
  );
}

function DoctorCell({ name, department }) {
  return (
    <div>
      <p className="font-medium text-slate-700 text-sm">{name || "-"}</p>
      <p className="text-xs text-slate-500">{department || "-"}</p>
    </div>
  );
}

function ScheduleCell({ date, timeSlot }) {
  const formattedDate = date?.split("T")[0] || "-";

  return (
    <>
      <div className="flex items-center gap-2">
        <Calendar size={14} className="text-slate-400" />
        <span className="text-sm text-slate-700">{formattedDate}</span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <Clock size={14} className="text-slate-400" />
        <span className="text-xs text-slate-500">{timeSlot || "-"}</span>
      </div>
    </>
  );
}

function AmountCell({ amount, isPaid }) {
  return (
    <div
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap ${
        isPaid
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}>
      ₹{amount ?? "-"}
    </div>
  );
}

function PaymentStatusCell({ status }) {
  const statusColors = {
    PENDING: "bg-yellow-100 text-yellow-700 border-yellow-300",
    INITIATED: "bg-blue-100 text-blue-700 border-blue-300",
    SUCCESS: "bg-emerald-100 text-emerald-700 border-emerald-300",
    FAILED: "bg-red-100 text-red-700 border-red-300",
    REFUNDED: "bg-orange-100 text-orange-700 border-orange-300",
    PARTIAL: "bg-purple-100 text-purple-700 border-purple-300",
    CANCELLED: "bg-gray-100 text-gray-700 border-gray-300"
  };

  const colorClass =
    statusColors[status] || "bg-slate-100 text-slate-700 border-slate-300";

  return (
    <div className="flex items-center gap-2">
      <CreditCard size={14} className="text-slate-400" />
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${colorClass}`}>
        {status || "PENDING"}
      </span>
    </div>
  );
}

function ActionButtons({ onView, onPrint, onRefund, doctorId, appointment }) {
  // Check if refund is available
  // Find the first successful online payment with gatewayPaymentId
  const refundablePayment = appointment?.payments?.find(
    (p) =>
      p.status === "SUCCESS" &&
      p.isOnline === true &&
      p.gatewayPaymentId &&
      !p.refundedAt &&
      p.status !== "REFUNDED"
  );

  // Check if appointment is cancelled and has a refundable payment
  const canRefund =
    appointment?.status === "CANCELLED" &&
    refundablePayment &&
    refundablePayment.status !== "REFUNDED";

  return (
    <div className="flex items-center gap-2">
      <button
        className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
        onClick={onView}
        title="View Details">
        <Eye size={16} />
      </button>
      <button
        className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
        onClick={onPrint}
        title="Print Receipt">
        <Printer size={16} />
      </button>
      {canRefund && (
        <button
          className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
          onClick={() => onRefund?.(appointment)}
          title="Process Refund">
          <RotateCcw size={16} />
        </button>
      )}
      {doctorId && (
        <a
          href={`/doctor/queue-monitor/${doctorId}`}
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          title="Monitor Queue">
          <Users size={16} />
        </a>
      )}
    </div>
  );
}
