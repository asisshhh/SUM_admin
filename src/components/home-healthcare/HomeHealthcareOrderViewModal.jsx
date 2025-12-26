import React, { useState } from "react";
import {
  Home,
  X,
  Clock,
  Calendar,
  User,
  Phone,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  RotateCcw,
  Package,
  MapPin,
  FileText,
  Building
} from "lucide-react";
import api from "../../api/client";
import { useConfirm } from "../../contexts/ConfirmContext";
import { toast } from "react-toastify";
import { OrderStatusBadge, PaymentBadge } from "../orders";

// Status badge component
function StatusBadge({ status }) {
  const config = {
    PENDING: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
    CONFIRMED: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      icon: CheckCircle2
    },
    ASSIGNED: { bg: "bg-purple-100", text: "text-purple-700", icon: User },
    IN_TRANSIT: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      icon: Clock
    },
    ARRIVED: { bg: "bg-cyan-100", text: "text-cyan-700", icon: MapPin },
    SAMPLE_COLLECTED: {
      bg: "bg-teal-100",
      text: "text-teal-700",
      icon: CheckCircle2
    },
    ARRIVED_AT_HOSPITAL: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      icon: Building
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

function HomeHealthcareOrderViewModal({ order, onClose, onUpdated }) {
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

  // Get package info
  const pkg = order.package || {};
  const packageName =
    pkg.name || order.packageName || "Home Healthcare Package";

  // Get services from items (snapshot) or package.services (current)
  const services =
    order.items ||
    pkg.services?.map((s) => ({
      serviceName: s.service?.name || s.serviceName,
      servicePrice: s.service?.price || s.servicePrice,
      serviceCode: s.service?.code || s.serviceCode
    })) ||
    [];

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
      message: `Are you sure you want to process a refund of ₹${refundablePayment.amount} for this cancelled home healthcare package order?`
    });

    if (!ok) return;

    setLoading(true);
    try {
      const response = await api.post(
        `/ccavenue/refund/${refundablePayment.id}`,
        {
          reason: "Home healthcare package order cancelled"
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

  // Map status for display
  const mapStatusForDisplay = (status) => {
    const statusMap = {
      REQUESTED: "PENDING",
      IN_PROGRESS: "PROCESSING"
    };
    return statusMap[status] || status;
  };

  const displayStatus = mapStatusForDisplay(order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-pink-600 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-4">
            {pkg.imageUrl ? (
              <img
                src={pkg.imageUrl}
                alt=""
                className="w-14 h-14 rounded-xl object-cover border-2 border-white/30"
              />
            ) : (
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Home className="text-white" size={28} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{packageName}</h2>
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
            <StatusBadge status={displayStatus} />
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
            {displayStatus === "CANCELLED" && refundablePayment && (
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

          {/* Package Services */}
          {services.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-purple-50 border-b p-4">
                <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                  <Package size={16} />
                  Included Services ({services.length})
                </h3>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y">
                {services.map((service, idx) => {
                  const serviceName =
                    service.serviceName ||
                    service.service?.name ||
                    `Service #${service.serviceId || idx + 1}`;
                  const servicePrice =
                    service.servicePrice ||
                    service.service?.price ||
                    service.service?.discountPrice ||
                    0;
                  const serviceCode =
                    service.serviceCode || service.service?.code;

                  return (
                    <div
                      key={service.id || service.serviceId || idx}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">
                          {serviceName}
                        </p>
                        {serviceCode && (
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {serviceCode}
                          </p>
                        )}
                      </div>
                      {servicePrice > 0 && (
                        <span className="text-sm font-semibold text-slate-700">
                          ₹{servicePrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            {order.assignedTo && order.assignee && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Assigned To</p>
                <p className="font-medium text-slate-700">
                  {order.assignee.name}
                </p>
                {order.assignee.role && (
                  <p className="text-xs text-slate-500 mt-1">
                    {order.assignee.role}
                  </p>
                )}
              </div>
            )}
            {order.assignedAt && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">Assigned At</p>
                <p className="font-medium text-slate-700">
                  {new Date(order.assignedAt).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-xs text-amber-700 mb-2 font-medium flex items-center gap-2">
                <FileText size={14} /> Notes
              </p>
              <p className="text-amber-800">{order.notes}</p>
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

export default React.memo(HomeHealthcareOrderViewModal);
