import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function BannerModal({ banner, onClose }) {
  const qc = useQueryClient();

  const [data, setData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    actionType: "none",
    actionValue: "",
    positionOrder: "",
    targetUserRole: "PATIENT",
    active: true,
    startDate: "",
    endDate: ""
  });

  useEffect(() => {
    if (banner) setData(banner);
  }, [banner]);

  const update = (k, v) => setData({ ...data, [k]: v });

  const save = useMutation({
    mutationFn: async () => {
      if (banner) {
        return (await api.put(`/banners/${banner.id}`, data)).data;
      }
      return (await api.post("/banners", data)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["banners"]);
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center">
      <div className="card p-6 w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-semibold">
          {banner ? "Edit Banner" : "Add Banner"}
        </h2>

        <div>
          <label className="text-sm font-medium">Image</label>

          <input
            type="file"
            accept="image/*"
            className="input"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const form = new FormData();
              form.append("file", file);

              const res = await api.post("/banners/upload", form, {
                headers: { "Content-Type": "multipart/form-data" }
              });

              setData((d) => ({
                ...d,
                imageUrl: res.data.imageUrl
              }));
            }}
          />

          {data.imageUrl && (
            <img
              src={data.imageUrl}
              className="w-32 h-16 object-cover rounded mt-2"
            />
          )}
        </div>

        <div>
          <label className="text-sm">Title</label>
          <input
            className="input"
            value={data.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Description</label>
          <textarea
            className="input"
            value={data.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Action Type</label>
          <select
            className="select"
            value={data.actionType}
            onChange={(e) => update("actionType", e.target.value)}>
            <option value="none">None</option>
            <option value="navigation">Navigation</option>
            <option value="external_link">External Link</option>
          </select>
        </div>

        {data.actionType !== "none" && (
          <div>
            <label className="text-sm">Action Value</label>
            <input
              className="input"
              value={data.actionValue}
              onChange={(e) => update("actionValue", e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-sm">Display Order</label>
          <input
            type="number"
            className="input"
            value={data.positionOrder || ""}
            onChange={(e) => update("positionOrder", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">User Role</label>
          <select
            className="select"
            value={data.targetUserRole}
            onChange={(e) => update("targetUserRole", e.target.value)}>
            <option>PATIENT</option>
            <option>DOCTOR</option>
            <option>ADMIN</option>
            <option>RECEPTIONIST</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Active</label>
          <select
            className="select"
            value={String(data.active)}
            onChange={(e) => update("active", e.target.value === "true")}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Start Date</label>
            <input
              type="date"
              className="input"
              value={data.startDate ? data.startDate.split("T")[0] : ""}
              onChange={(e) => update("startDate", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">End Date</label>
            <input
              type="date"
              className="input"
              value={data.endDate ? data.endDate.split("T")[0] : ""}
              onChange={(e) => update("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-blue-600 text-white"
            onClick={() => save.mutate()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
