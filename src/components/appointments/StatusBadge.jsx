import React from "react";
import {
  Timer,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users
} from "lucide-react";

// Status configurations with colors and icons
export const STATUS_CONFIG = {
  PENDING: { color: "amber", icon: Timer, label: "Pending" },
  CONFIRMED: { color: "blue", icon: CheckCircle2, label: "Confirmed" },
  COMPLETED: { color: "emerald", icon: CheckCircle2, label: "Completed" },
  CANCELLED: { color: "red", icon: XCircle, label: "Cancelled" },
  IN_QUEUE: { color: "violet", icon: Users, label: "In Queue" },
  CHECKED_IN: { color: "cyan", icon: CheckCircle2, label: "Checked In" },
  NO_SHOW: { color: "slate", icon: AlertCircle, label: "No Show" }
};

const COLOR_CLASSES = {
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200"
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    color: "slate",
    icon: AlertCircle,
    label: status
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

