import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import StarRating from "../components/feedback/StarRating";
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Star,
  User,
  Stethoscope,
  Calendar,
  ChevronDown
} from "lucide-react";
import { toast } from "react-toastify";
import { useConfirm } from "../contexts/ConfirmContext";

export default function FeedbackPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    search: "",
    rating: "",
    approved: ""
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["feedback", filters],
    queryFn: async () => (await api.get("/feedback", { params: filters })).data
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const approve = useMutation({
    mutationFn: async ({ id, approved }) =>
      (
        await api.put(`/feedback/${id}/approve`, {
          approved,
          moderatorId: 1 // ADMIN
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries(["feedback"]);
      toast.success("Feedback status updated successfully");
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to update feedback");
    }
  });

  const remove = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/feedback/${id}`);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["feedback"]);
      toast.success("Feedback deleted successfully");
    },
    onError: (err) => {
      console.error("Delete feedback error:", err);
      const errorMessage =
        err.response?.data?.error || err.message || "Failed to delete feedback";
      toast.error(errorMessage);
    }
  });

  const update = useCallback(
    (e) =>
      setFilters((f) => ({ ...f, [e.target.name]: e.target.value, page: 1 })),
    []
  );

  const handleApprove = useCallback(
    async (id) => {
      const ok = await confirm({
        title: "Approve Feedback",
        message: "Are you sure you want to approve this feedback?",
        danger: false
      });
      if (ok) approve.mutate({ id, approved: true });
    },
    [confirm, approve]
  );

  const handleReject = useCallback(
    async (id) => {
      const ok = await confirm({
        title: "Reject Feedback",
        message: "Are you sure you want to reject this feedback?",
        danger: true
      });
      if (ok) approve.mutate({ id, approved: false });
    },
    [confirm, approve]
  );

  const handleDelete = useCallback(
    async (id) => {
      const ok = await confirm({
        title: "Delete Feedback",
        message:
          "Are you sure you want to delete this feedback? This action cannot be undone.",
        danger: true
      });
      if (ok) remove.mutate(id);
    },
    [confirm, remove]
  );

  const getStatusBadge = useCallback((approved) => {
    if (approved === true) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
          <CheckCircle size={12} />
          Approved
        </span>
      );
    }
    if (approved === false) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
          <XCircle size={12} />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
        Pending
      </span>
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
                <MessageSquare className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Feedback & Ratings
                </h1>
                <p className="text-sm text-slate-500">
                  Manage patient feedback and reviews
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
              onClick={() => refetch()}>
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 rounded-3xl" />
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-slate-200/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200">
                  <Filter size={18} className="text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Smart Filters
                  </h3>
                  <p className="text-xs text-slate-500">
                    Refine your feedback search
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="relative flex-[2] min-w-[250px] max-w-[400px]">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={update}
                  placeholder="Search feedback comments..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="relative flex-1 min-w-[140px]">
                <select
                  name="rating"
                  value={filters.rating}
                  onChange={update}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                  <option value="">All Ratings</option>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>
                      {r} {r === 1 ? "Star" : "Stars"}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={18}
                />
              </div>

              <div className="relative flex-1 min-w-[140px]">
                <select
                  name="approved"
                  value={filters.approved}
                  onChange={update}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none cursor-pointer">
                  <option value="">All Status</option>
                  <option value="true">Approved</option>
                  <option value="false">Rejected</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={18}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span className="font-medium">
            Showing {items.length} of {total} feedback{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Comment
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <MessageSquare
                        className="mx-auto text-slate-300 mb-3"
                        size={48}
                      />
                      <p className="text-slate-500 font-medium">
                        No feedback found
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Try adjusting your filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((f) => (
                    <tr
                      key={f.id}
                      className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
                            <User size={16} className="text-violet-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {f.user?.name || "—"}
                            </div>
                            {f.user?.phone && (
                              <div className="text-xs text-slate-500">
                                {f.user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Stethoscope size={16} className="text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {f.appointment?.doctor?.user?.name || "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StarRating value={f.rating} size={18} />
                          <span className="text-sm font-medium text-slate-600">
                            {f.rating}/5
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700 max-w-md line-clamp-2">
                          {f.comments || (
                            <span className="text-slate-400 italic">
                              No comment
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(f.approved)}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {f.approved !== true && (
                            <button
                              onClick={() => handleApprove(f.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                              <CheckCircle size={14} />
                              Approve
                            </button>
                          )}
                          {f.approved !== false && (
                            <button
                              onClick={() => handleReject(f.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                              <XCircle size={14} />
                              Reject
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(f.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-6 py-4">
            <div className="text-sm text-slate-600">
              Page {filters.page} of {Math.ceil(total / filters.pageSize) || 1}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                Previous
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={filters.page >= Math.ceil(total / filters.pageSize)}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
