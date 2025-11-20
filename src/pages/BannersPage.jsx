import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BannerModal from "../components/banner/BannerModal";
import api from "../api/client";

export default function BannersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const { data: banners } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => (await api.get("/banners")).data.items
  });

  const del = useMutation({
    mutationFn: async (id) => await api.delete(`/banners/${id}`),
    onSuccess: () => qc.invalidateQueries(["banners"])
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Home Screen Banners</h1>
        <button
          className="btn bg-blue-600 text-white"
          onClick={() => setAdding(true)}>
          + Add Banner
        </button>
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">Title</th>
              <th className="p-3">Action</th>
              <th className="p-3">Order</th>
              <th className="p-3">Active</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners?.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">
                  <img
                    src={b.imageUrl}
                    className="w-20 h-12 object-cover rounded"
                  />
                </td>

                <td className="p-3">{b.title || "—"}</td>

                <td className="p-3">
                  {b.actionType}
                  {b.actionValue && (
                    <span className="text-xs text-slate-500">
                      {" "}
                      → {b.actionValue}
                    </span>
                  )}
                </td>

                <td className="p-3">{b.positionOrder ?? "—"}</td>

                <td className="p-3">
                  <span
                    className={`badge ${
                      b.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                    {b.active ? "Yes" : "No"}
                  </span>
                </td>

                <td className="p-3">{b.targetUserRole}</td>

                <td className="p-3 flex gap-2">
                  <button className="btn" onClick={() => setEditing(b)}>
                    Edit
                  </button>
                  <button
                    className="btn bg-red-600 text-white"
                    onClick={() => del.mutate(b.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(adding || editing) && (
        <BannerModal
          banner={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
