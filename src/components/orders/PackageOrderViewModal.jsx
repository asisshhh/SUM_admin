import React, { useState } from "react";
import {
  Package,
  X,
  Clock,
  Calendar,
  User,
  Phone,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Star,
  Sparkles,
  FlaskConical,
  RotateCcw,
  CreditCard,
  MapPin,
  FileText
} from "lucide-react";
import api from "../../api/client";
import { useConfirm } from "../../contexts/ConfirmContext";
import { toast } from "react-toastify";
import { OrderStatusBadge, PaymentBadge } from "./";

// Status badge component
function StatusBadge({ status }) {
  const config = {
    PENDING: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
    CONFIRMED: { bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle2 },
    SAMPLE_COLLECTED: {
      bg: "bg-teal-100",
      text: "text-teal-700",
      icon: CheckCircle2
    },
    PROCESSING: {
      bg: "bg-violet-100",
      text: "text-violet-700",
      icon: Clock
    },
    COMPLETED: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      icon: CheckCircle2
    },
    CANCELLED: { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle }
  }[status] || {
    bg: "bg-slate-100",
    text: "text-slate-700",
    icon: AlertCircle
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <Icon size={14} />
      {status}
    </span>
  );
}

function PackageOrderViewModal({ order, onClose, onUpdated }) {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  // Get customer info
  const customerName = order.user?.name || "Unknown";
  const customerPhone = order.user?.phone || "-";
  const customerEmail = order.user?.email || "-";

  // Get patient info
  const patientName = order.patient?.name || "-";
  const patientPhone =
    order.patient?.phone || order.patient?.user?.phone || "-";

  const pkg = order.package || {};
  const tests = pkg.tests || order.tests || [];

  const savings =
    order.totalAmount && pkg.mrp
      ? (pkg.mrp - order.totalAmount).toFixed(0)
      : null;

  // Get all payments
  const payments = order.payments || [];
  const totalPaid = payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Check for refundable payment
  const refundablePayment = payments.find(
    (p) =>
      p.status === "SUCCESS" &&
      (p.isOnline === true ||
        p.isOnline === "true" ||
        p.isOnline === 1 ||
        String(p.isOnline).toLowerCase() === "true") &&
      p.gatewayPaymentId &&
      !p.refundedAt &&
      p.status !== "REFUNDED"
  );

  const handleRefund = async () => {
    if (!refundablePayment) {
      toast.error("No eligible payment found for refund");
      return;
    }

    const ok = await confirm({
      title: "Process Refund",
      message: `Are you sure you want to process a refund of ₹${refundablePayment.amount} for this cancelled health package order?`
    });

    if (!ok) return;

    setLoading(true);
    try {
      const response = await api.post(
        `/ccavenue/refund/${refundablePayment.id}`,
        {
          reason: "Health package order cancelled"
        }
      );

      if (response.data.success) {
        toast.success("Refund processed successfully");
        await onUpdated?.();
        onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-4">
            {pkg.imageUrl ? (
              <img
                src={pkg.imageUrl}
                alt=""
                className="w-14 h-14 rounded-xl object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="text-white" size={28} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {pkg.name || order.packageName || "Health Package Order"}
              </h2>
              <span className="text-white/80 text-sm">
                {order.orderNumber || `#${order.id}`}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Status & Order Info */}
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            {pkg.popular && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium flex items-center gap-1">
                <Star size={14} /> Popular
              </span>
            )}
            {pkg.featured && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
                <Sparkles size={14} /> Featured
              </span>
            )}
            <div className="ml-auto text-sm text-slate-500 flex items-center gap-2">
              <Calendar size={14} />
              {order.scheduledDate?.split("T")[0] ||
                order.createdAt?.split("T")[0] ||
                "-"}
              {order.scheduledTime && (
                <>
                  <span className="mx-1">•</span>
                  <Clock size={14} />
                  {order.scheduledTime}
                </>
              )}
            </div>
          </div>

          {/* Customer & Patient Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <User size={16} /> Customer Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Name</p>
                  <p className="font-medium text-slate-800">{customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="font-medium text-slate-800 flex items-center gap-1">
                    <Phone size={12} /> {customerPhone}
                  </p>
                </div>
                {customerEmail !== "-" && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Email</p>
                    <p className="font-medium text-slate-800">
                      {customerEmail}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <User size={16} /> Patient Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Name</p>
                  <p className="font-medium text-slate-800">{patientName}</p>
                </div>
                {patientPhone !== "-" && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                    <p className="font-medium text-slate-800 flex items-center gap-1">
                      <Phone size={12} /> {patientPhone}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collection Address */}
          {(order.collectionAddress ||
            order.collectionCity ||
            order.collectionPin) && (
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <MapPin size={16} /> Collection Address
              </h3>
              <div className="space-y-1 text-slate-700">
                {order.collectionAddress && (
                  <p className="font-medium">{order.collectionAddress}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  {order.collectionCity && <span>{order.collectionCity}</span>}
                  {order.collectionPin && (
                    <>
                      {order.collectionCity && <span>•</span>}
                      <span>{order.collectionPin}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center gap-2">
              <CreditCard size={16} /> Payment Details
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-slate-800">
                  ₹{order.totalAmount?.toLocaleString() || "-"}
                </p>
                {pkg.mrp && pkg.mrp > (order.totalAmount || 0) && (
                  <p className="text-sm text-slate-400 line-through mt-1">
                    MRP: ₹{pkg.mrp?.toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Amount Paid</p>
                <p className="text-xl font-bold text-emerald-700">
                  ₹{totalPaid.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                <div className="mt-1">
                  <PaymentBadge
                    status={order.paymentStatus || "PENDING"}
                    amount={order.paymentAmount || order.totalAmount || 0}
                  />
                </div>
              </div>
            </div>
            {savings && parseFloat(savings) > 0 && (
              <p className="mb-4 text-sm text-green-700 font-medium">
                💸 Customer saved ₹{savings}
              </p>
            )}

            {/* Payment History */}
            {payments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <h4 className="text-xs font-semibold text-slate-600 mb-3">
                  Payment History
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {payments.map((payment, idx) => (
                    <div
                      key={payment.id || idx}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">
                            ₹{payment.amount?.toLocaleString() || 0}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              payment.status === "SUCCESS"
                                ? "bg-emerald-100 text-emerald-700"
                                : payment.status === "REFUNDED"
                                ? "bg-orange-100 text-orange-700"
                                : payment.status === "FAILED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                            {payment.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {payment.method || "N/A"}
                          </span>
                          {payment.isOnline && (
                            <span className="text-xs text-blue-600">
                              • Online
                            </span>
                          )}
                          {payment.gatewayPaymentId && (
                            <span className="text-xs text-slate-400 font-mono">
                              • {payment.gatewayPaymentId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                      {payment.refundedAt && (
                        <div className="text-xs text-orange-600">Refunded</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Refund option for cancelled orders */}
            {order.status === "CANCELLED" && refundablePayment && (
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <button
                  onClick={handleRefund}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl shadow-lg hover:shadow-xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <RotateCcw size={18} />
                  {loading ? "Processing Refund..." : "Process Refund"}
                </button>
              </div>
            )}
          </div>

          {/* Package Details */}
          {pkg.shortDesc && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Package Description</p>
              <p className="text-slate-700">{pkg.shortDesc}</p>
            </div>
          )}

          {/* Included Tests */}
          {tests.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-emerald-50 border-b p-4">
                <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <FlaskConical size={16} />
                  Included Lab Tests ({tests.length})
                </h3>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y">
                {tests.map((t, idx) => {
                  const testData = t.test || t;
                  return (
                    <div
                      key={t.testId || t.id || idx}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-medium text-slate-800">
                          {testData.name || `Test #${t.testId || t.id}`}
                        </p>
                        {testData.code && (
                          <p className="text-xs text-slate-500 font-mono">
                            {testData.code}
                          </p>
                        )}
                      </div>
                      {testData.price && (
                        <span className="text-sm text-slate-600">
                          ₹{testData.price?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {pkg.sampleType && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Sample Type</p>
                <p className="font-medium text-slate-700">{pkg.sampleType}</p>
              </div>
            )}
            {pkg.reportTime && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Report Time</p>
                <p className="font-medium text-slate-700">{pkg.reportTime}</p>
              </div>
            )}
            {pkg.validityDays && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Validity</p>
                <p className="font-medium text-slate-700">
                  {pkg.validityDays} days
                </p>
              </div>
            )}
          </div>

          {/* Preparation Instructions */}
          {pkg.preparation && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-xs text-amber-700 mb-2 font-medium flex items-center gap-2">
                <AlertCircle size={14} /> Preparation Required
              </p>
              <p className="text-amber-800">{pkg.preparation}</p>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs text-slate-600 mb-2 font-medium flex items-center gap-2">
                <FileText size={14} /> Notes
              </p>
              <p className="text-slate-700">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-2xl flex-shrink-0">
          <button
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-all hover:scale-105"
            onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(PackageOrderViewModal);
