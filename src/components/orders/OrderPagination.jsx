import React from "react";

export default function OrderPagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.ceil(total / limit);
  const maxVisiblePages = 5;

  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page <span className="font-semibold text-slate-700">{page}</span> •
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {start}-{end}
          </span>{" "}
          of <span className="font-semibold text-slate-700">{total}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}>
            Previous
          </button>

          <div className="flex items-center gap-1">
            {getVisiblePages().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                  page === pageNum
                    ? "bg-violet-600 text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}>
                {pageNum}
              </button>
            ))}
          </div>

          <button
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

