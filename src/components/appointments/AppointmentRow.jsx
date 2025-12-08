import React from "react";
import { Calendar, Clock, Eye, Printer, Users } from "lucide-react";
import StatusBadge from "./StatusBadge";

export default function AppointmentRow({
  appointment,
  index,
  onView,
  onPrint
}) {
  const r = appointment;

  return (
    <tr className="hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-transparent transition-all duration-200 border-b border-slate-100 last:border-0">
      {/* Index */}
      <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">
        #{index}
      </td>

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

      {/* Actions */}
      <td className="px-4 py-3.5">
        <ActionButtons
          onView={onView}
          onPrint={onPrint}
          doctorId={r.doctorId}
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
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ${
        isPaid
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}>
      ₹ {amount ?? "-"}
    </div>
  );
}

function ActionButtons({ onView, onPrint, doctorId }) {
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

