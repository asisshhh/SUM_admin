import React from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

const PAYMENT_CONFIG = {
  SUCCESS: { color: "emerald", icon: CheckCircle2, label: "Paid" },
  PAID: { color: "emerald", icon: CheckCircle2, label: "Paid" },
  PENDING: { color: "amber", icon: Clock, label: "Pending" },
  FAILED: { color: "red", icon: XCircle, label: "Failed" },
  REFUNDED: { color: "blue", icon: AlertCircle, label: "Refunded" },
  PARTIAL: { color: "orange", icon: Clock, label: "Partial" }
};

const COLOR_CLASSES = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
  slate: "bg-slate-100 text-slate-700"
};

export default function PaymentBadge({ status, amount }) {
  const config = PAYMENT_CONFIG[status] || {
    color: "slate",
    icon: Clock,
    label: status || "Unknown"
  };
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
        COLOR_CLASSES[config.color]
      }`}>
      <Icon size={12} />
      <span>{config.label}</span>
      {amount !== undefined && amount !== null && (
        <span className="ml-1">₹{amount}</span>
      )}
    </div>
  );
}
