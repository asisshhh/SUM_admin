import React from "react";

export default function DateRangeFilter({
  fromDate,
  toDate,
  includeFuture,
  setFromDate,
  setToDate,
  setIncludeFuture,
  onReset
}) {
  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border">
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-slate-600">From</label>
          <input
            type="date"
            className="w-full border p-2 rounded-lg"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <label
            className={`text-sm text-slate-600 ${
              includeFuture ? "opacity-30" : ""
            }`}>
            To
          </label>
          <input
            type="date"
            disabled={includeFuture}
            className="w-full border p-2 rounded-lg disabled:bg-slate-100"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            checked={includeFuture}
            onChange={(e) => setIncludeFuture(e.target.checked)}
          />
          <label className="cursor-pointer">Show future dates</label>
        </div>
      </div>

      {/* Reset Button */}
      <button
        className="px-3 py-2 rounded-lg border text-sm hover:bg-white"
        onClick={onReset}>
        Reset Date Filter
      </button>
    </div>
  );
}
