import React from "react";
import { Calendar, Sparkles, RefreshCw } from "lucide-react";

export default function PageHeader({
  isShowingToday,
  today,
  onGenerateQueue,
  onRefresh,
  genLoading,
  loading
}) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Calendar className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
            <p className="text-sm text-slate-500">
              {isShowingToday ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Showing today's appointments • {today}
                </span>
              ) : (
                "Manage all appointment orders"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:-translate-y-0.5 transition-all duration-200"
          onClick={onGenerateQueue}
          disabled={genLoading}>
          <Sparkles size={18} />
          {genLoading ? "Generating..." : "Generate Queue"}
        </button>
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

