import React from "react";
import { Search, Filter, Calendar } from "lucide-react";
import { SearchableDropdown } from "../shared";

export default function OrderFilterCard({
  // Search
  search,
  onSearchChange,
  searchPlaceholder = "Search by name, phone, or ID...",
  // Status
  status,
  onStatusChange,
  statusOptions = [],
  // Dates
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  includeFuture,
  onIncludeFutureChange,
  // Actions
  onAllTime,
  onToday,
  isShowingToday,
  isAllTime,
  // Results
  rowCount,
  total,
  // Custom filters slot
  children
}) {
  return (
    <div className="relative" style={{ zIndex: 1 }}>
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 rounded-3xl" />
      <div
        className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-slate-200/50 p-6"
        style={{ overflow: "visible" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200">
              <Filter size={18} className="text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Smart Filters</h3>
              <p className="text-xs text-slate-500">Refine your search</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAllTime}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isAllTime
                  ? "bg-violet-100 text-violet-700 border-2 border-violet-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              All Time
            </button>
            <button
              onClick={onToday}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isShowingToday
                  ? "bg-violet-100 text-violet-700 border-2 border-violet-300"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              Today
            </button>
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Search
            </label>
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>
          </div>

          {/* Status */}
          {statusOptions.length > 0 && (
            <div className="relative" style={{ zIndex: 10 }}>
              <SearchableDropdown
                label="Status"
                value={status || ""}
                options={statusOptions}
                onChange={onStatusChange}
                placeholder="All Status"
                className=""
                maxHeight={300}
              />
            </div>
          )}

          {/* Custom filters */}
          {children}
        </div>

        {/* Date Range */}
        <div className="mt-6 pt-6 border-t border-slate-200/60">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Calendar size={12} className="inline mr-1" />
                Date Range
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => onFromDateChange(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
                <span className="text-slate-400 font-medium">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => onToDateChange(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeFuture}
                  onChange={(e) => onIncludeFutureChange(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                  Include future
                </span>
              </label>

              <div className="h-8 w-px bg-slate-200" />

              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Showing</span>
                <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg font-semibold">
                  {rowCount}
                </span>
                <span className="text-slate-500">of</span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                  {total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
