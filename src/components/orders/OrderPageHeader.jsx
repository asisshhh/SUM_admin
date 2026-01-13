import React from "react";
import { RefreshCw } from "lucide-react";

export default function OrderPageHeader({
  icon: Icon,
  iconColor = "violet",
  title,
  subtitle,
  isShowingToday,
  today,
  onRefresh,
  loading,
  actions
}) {
  const colorMap = {
    violet: "from-violet-500 to-purple-600 shadow-violet-200",
    purple: "from-purple-500 to-purple-600 shadow-purple-200",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-200",
    blue: "from-blue-500 to-indigo-600 shadow-blue-200",
    amber: "from-amber-500 to-orange-600 shadow-amber-200"
  };

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
              colorMap[iconColor] || colorMap.violet
            } flex items-center justify-center shadow-lg`}>
            {Icon && <Icon color="white" size={24} strokeWidth={2} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            <p className="text-sm text-slate-500">
              {isShowingToday ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Showing today's orders • {today}
                </span>
              ) : (
                subtitle
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {actions}
        <button
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
          onClick={onRefresh}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>
    </div>
  );
}
