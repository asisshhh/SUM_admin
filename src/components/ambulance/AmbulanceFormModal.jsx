import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function AmbulanceFormModal({ data, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!data?.id;

  const [form, setForm] = useState({
    vehicleNumber: data?.vehicleNumber || "",
    model: data?.model || "",
    registrationNumber: data?.registrationNumber || "",
    type: data?.type || "ALS",
    baseFare: data?.baseFare || "",
    perKmFare: data?.perKmFare || "",
    insuranceExpiry: data?.insuranceExpiry
      ? data.insuranceExpiry.split("T")[0]
      : "",
    lastMaintenanceDate: data?.lastMaintenanceDate
      ? data.lastMaintenanceDate.split("T")[0]
      : "",
    available: data?.available ?? true,
    driverId: data?.driverId || ""
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return (
          await api.put(`/ambulance/${data.id}`, {
            ...form,
            baseFare: Number(form.baseFare),
            perKmFare: Number(form.perKmFare),
            driverId: form.driverId ? Number(form.driverId) : null
          })
        ).data;
      }
      return (
        await api.post("/ambulance", {
          ...form,
          baseFare: Number(form.baseFare),
          perKmFare: Number(form.perKmFare),
          driverId: form.driverId ? Number(form.driverId) : null
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulances"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="card p-6 w-full max-w-xl space-y-4 max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold">
          {isEdit ? "Edit Ambulance" : "Add Ambulance"}
        </h2>

        <div className="grid gap-3">
          <div>
            <label className="text-sm">Vehicle Number</label>
            <input
              className="input"
              value={form.vehicleNumber}
              onChange={(e) => update("vehicleNumber", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Model</label>
            <input
              className="input"
              value={form.model}
              onChange={(e) => update("model", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Registration Number</label>
            <input
              className="input"
              value={form.registrationNumber}
              onChange={(e) => update("registrationNumber", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Type</label>
            <select
              className="select"
              value={form.type}
              onChange={(e) => update("type", e.target.value)}>
              <option value="BLS">Basic Life Support</option>
              <option value="ALS">Advanced Life Support With Paramedic</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Base Fare</label>
              <input
                className="input"
                type="number"
                value={form.baseFare}
                onChange={(e) => update("baseFare", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm">Per KM Fare</label>
              <input
                className="input"
                type="number"
                value={form.perKmFare}
                onChange={(e) => update("perKmFare", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Insurance Expiry</label>
              <input
                type="date"
                className="input"
                value={form.insuranceExpiry}
                onChange={(e) => update("insuranceExpiry", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm">Last Maintenance Date</label>
              <input
                type="date"
                className="input"
                value={form.lastMaintenanceDate}
                onChange={(e) => update("lastMaintenanceDate", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Available</label>
            <select
              className="select"
              value={String(form.available)}
              onChange={(e) => update("available", e.target.value === "true")}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
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
