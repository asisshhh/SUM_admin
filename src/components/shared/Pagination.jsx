import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable Pagination Component
 * @param {number} page - Current page number
 * @param {number} total - Total number of items
 * @param {number} pageSize - Items per page
 * @param {function} onPage - Callback when page changes
 */
function Pagination({ page = 1, total = 0, pageSize = 20, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 20)));
  const start = Math.min((page - 1) * pageSize + 1, total || 0);
  const end = Math.min(page * pageSize, total || 0);

  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium">{start}</span> to{" "}
        <span className="font-medium">{end}</span> of{" "}
        <span className="font-medium">{total}</span> results
      </p>
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page">
          <ChevronLeft size={18} />
        </button>
        <span className="px-3 py-1 text-sm font-medium bg-slate-100 rounded-lg">
          {page} / {pages}
        </span>
        <button
          className="p-2 rounded-lg border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default React.memo(Pagination);

