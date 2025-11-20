import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import StarRating from "../components/feedback/StarRating";

export default function FeedbackListPage() {
  const qc = useQueryClient();

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    search: "",
    rating: "",
    approved: "",
    doctorId: ""
  });

  const { data } = useQuery({
    queryKey: ["feedback", filters],
    queryFn: async () => (await api.get("/feedback", { params: filters })).data
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  const approve = useMutation({
    mutationFn: async ({ id, approved }) =>
      (
        await api.put(`/feedback/${id}/approve`, {
          approved,
          moderatorId: 1 // ADMIN ID (replace with auth)
        })
      ).data,
    onSuccess: () => qc.invalidateQueries(["feedback"])
  });

  const remove = useMutation({
    mutationFn: async (id) => (await api.delete(`/feedback/${id}`)).data,
    onSuccess: () => qc.invalidateQueries(["feedback"])
  });

  const update = (e) =>
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Feedback & Ratings</h1>

      {/* Filters */}
      <div className="card p-4 flex gap-4 flex-wrap">
        <div>
          <label className="text-sm">Search</label>
          <input
            name="search"
            className="input"
            value={filters.search}
            onChange={update}
            placeholder="Search comment"
          />
        </div>

        <div>
          <label className="text-sm">Rating</label>
          <select
            name="rating"
            className="select"
            value={filters.rating}
            onChange={update}>
            <option value="">All</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Status</label>
          <select
            name="approved"
            className="select"
            value={filters.approved}
            onChange={update}>
            <option value="">All</option>
            <option value="true">Approved</option>
            <option value="false">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Doctor</th>
              <th className="p-3">Rating</th>
              <th className="p-3">Comment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-3">{f.user.name}</td>

                <td className="p-3">
                  {f.appointment?.doctor?.user?.name || "—"}
                </td>

                <td className="p-3">
                  <StarRating value={f.rating} size={18} />
                </td>

                <td className="p-3">{f.comments || "—"}</td>

                <td className="p-3">
                  <span
                    className={`badge ${
                      f.approved
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {f.approved ? "Approved" : "Rejected"}
                  </span>
                </td>

                <td className="p-3 flex gap-2">
                  <button
                    className="btn"
                    onClick={() =>
                      approve.mutate({ id: f.id, approved: true })
                    }>
                    Approve
                  </button>

                  <button
                    className="btn"
                    onClick={() =>
                      approve.mutate({ id: f.id, approved: false })
                    }>
                    Reject
                  </button>

                  <button
                    className="btn bg-red-600 text-white"
                    onClick={() => remove.mutate(f.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-end items-center gap-4">
        <button
          className="btn"
          disabled={filters.page <= 1}
          onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
          Prev
        </button>

        <span>
          Page {filters.page} / {Math.ceil(total / filters.pageSize) || 1}
        </span>

        <button
          className="btn"
          disabled={filters.page >= Math.ceil(total / filters.pageSize)}
          onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
          Next
        </button>
      </div>
    </div>
  );
}
