import React from "react";
import {
  Timer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Truck,
  Package,
  FlaskConical
} from "lucide-react";

// Status configurations
const STATUS_CONFIG = {
  PENDING: { color: "amber", icon: Timer, label: "Pending" },
  CONFIRMED: { color: "blue", icon: CheckCircle2, label: "Confirmed" },
  COMPLETED: { color: "emerald", icon: CheckCircle2, label: "Completed" },
  CANCELLED: { color: "red", icon: XCircle, label: "Cancelled" },
  PROCESSING: { color: "violet", icon: Clock, label: "Test in Progress" },
  SAMPLE_COLLECTED: {
    color: "cyan",
    icon: FlaskConical,
    label: "Sample Collected"
  },
  PAYMENT_COMPLETED: {
    color: "emerald",
    icon: CheckCircle2,
    label: "Payment Done"
  },
  PAY_AT_HOSPITAL: { color: "orange", icon: Timer, label: "Pay at Hospital" },
  REQUESTED: { color: "amber", icon: Timer, label: "Requested" },
  ASSIGNED: { color: "blue", icon: Truck, label: "Assigned" },
  IN_PROGRESS: { color: "violet", icon: Clock, label: "In Progress" },
  REVIEWED: { color: "emerald", icon: CheckCircle2, label: "Reviewed" }
};

const COLOR_CLASSES = {
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200"
};

export default function OrderStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    color: "slate",
    icon: AlertCircle,
    label: status || "Unknown"
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        COLOR_CLASSES[config.color]
      }`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}
