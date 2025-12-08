import React from "react";
import { FlaskConical, X, Clock, Calendar, User, Phone, FileText, IndianRupee, CheckCircle2, AlertCircle, Beaker } from "lucide-react";

// Status badge component
function StatusBadge({ status }) {
  const config = {
    PENDING: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
    PROCESSING: { bg: "bg-cyan-100", text: "text-cyan-700", icon: Clock },
    COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
    CANCELLED: { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle }
  }[status] || { bg: "bg-slate-100", text: "text-slate-700", icon: AlertCircle };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}

function LabOrderViewModal({ order, onClose }) {
  if (!order) return null;

  const patientName = order.patient?.name || order.user?.name || "Unknown";
  const patientPhone = order.patient?.phone || order.user?.phone || "-";
  const patientEmail = order.patient?.email || order.user?.email || "-";

  const tests = order.items || [];
  const testName = order.testName || tests.map(i => i.testName || i.test?.name).filter(Boolean).join(", ") || "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <FlaskConical className="text-white" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white">Lab Test Order</h2>
              <span className="text-white/80 text-sm">
                {order.orderNumber || `#${order.id}`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <div className="text-sm text-slate-500">
              <Calendar size={14} className="inline mr-1" />
              {order.scheduledDate?.split("T")[0] || order.createdAt?.split("T")[0] || "-"}
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <User size={16} /> Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Name</p>
                <p className="font-medium text-slate-800">{patientName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Phone</p>
                <p className="font-medium text-slate-800 flex items-center gap-1">
                  <Phone size={12} /> {patientPhone}
                </p>
              </div>
              {patientEmail !== "-" && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="font-medium text-slate-800">{patientEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* Test Details */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-blue-50 border-b p-4">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <Beaker size={16} />
                Test Details
              </h3>
            </div>
            {tests.length > 0 ? (
              <div className="divide-y">
                {tests.map((item, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">
                        {item.testName || item.test?.name || `Test #${idx + 1}`}
                      </p>
                      {item.test?.code && (
                        <p className="text-xs text-slate-500 font-mono">{item.test.code}</p>
                      )}
                    </div>
                    {(item.price || item.test?.price) && (
                      <span className="text-sm font-medium text-slate-600">
                        ₹{(item.price || item.test?.price)?.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="font-medium text-slate-800">{testName}</p>
              </div>
            )}
          </div>

          {/* Payment Info */}
          {(order.totalAmount || order.amount) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <IndianRupee size={16} /> Payment Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-slate-800">
                    ₹{(order.totalAmount || order.amount)?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    order.paymentStatus === "SUCCESS" || order.paymentStatus === "PAID"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {order.paymentStatus === "SUCCESS" || order.paymentStatus === "PAID" ? (
                      <><CheckCircle2 size={14} /> Paid</>
                    ) : (
                      <><Clock size={14} /> {order.paymentStatus || "Pending"}</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Report Link */}
          {order.reportUrl && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <a
                href={order.reportUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 text-emerald-700 hover:text-emerald-800 font-medium">
                <FileText size={20} />
                <span>View Lab Report</span>
              </a>
            </div>
          )}

          {/* Additional Info */}
          {(order.notes || order.remarks) && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-2">Notes</p>
              <p className="text-slate-700">{order.notes || order.remarks}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl flex-shrink-0">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(LabOrderViewModal);

