import React from "react";
import { Calendar, RefreshCw } from "lucide-react";
import AppointmentRow from "./AppointmentRow";

const TABLE_HEADERS = [
  { key: "index", label: "#" },
  { key: "patient", label: "Patient" },
  { key: "doctor", label: "Doctor" },
  { key: "schedule", label: "Schedule" },
  { key: "status", label: "Status" },
  { key: "amount", label: "Amount" },
  { key: "paymentStatus", label: "Payment Status" },
  { key: "actions", label: "Actions" }
];

export default function AppointmentTable({
  rows,
  loading,
  page,
  limit,
  onViewDetails,
  onPrintReceipt
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden">
      {/* Table Header */}
      <TableHeader loading={loading} />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50">
              {TABLE_HEADERS.map((header) => (
                <th
                  key={header.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && <EmptyState />}
            {rows.map((appointment, i) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                index={(page - 1) * limit + i + 1}
                onView={() => onViewDetails(appointment)}
                onPrint={() => onPrintReceipt(appointment)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHeader({ loading }) {
  return (
    <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Appointment Records</h3>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-violet-600">
            <RefreshCw size={14} className="animate-spin" />
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={8} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Calendar size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No appointments found</p>
          <p className="text-sm text-slate-400">
            Try adjusting your filters or date range
          </p>
        </div>
      </td>
    </tr>
  );
}
