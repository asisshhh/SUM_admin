import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { SearchableDropdown } from "../shared";

export default function AmbulanceBookingModal({ onClose }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    userId: "",
    pickupAddress: "",
    destination: "",
    emergency: false,
    patientName: "",
    contactNumber: "",
    pickupLatitude: "",
    pickupLongitude: "",
    destLatitude: "",
    destLongitude: "",
    eta: "",
    ambulanceId: ""
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: ambulances } = useQuery({
    queryKey: ["ambulances-available"],
    queryFn: async () =>
      (await api.get("/ambulance", { params: { available: "true" } })).data
        .items
  });

  const save = useMutation({
    mutationFn: async () => {
      return (
        await api.post(`/ambulance/${form.ambulanceId}/book`, {
          ...form,
          userId: Number(form.userId),
          pickupLatitude: Number(form.pickupLatitude),
          pickupLongitude: Number(form.pickupLongitude),
          destLatitude: Number(form.destLatitude),
          destLongitude: Number(form.destLongitude)
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-bookings"] });
      qc.invalidateQueries({ queryKey: ["ambulances"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="card p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold">Book Ambulance</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm">User ID</label>
            <input
              className="input"
              value={form.userId}
              onChange={(e) => update("userId", e.target.value)}
            />
          </div>

          <div>
            <SearchableDropdown
              label="Ambulance"
              value={form.ambulanceId || ""}
              options={[
                { value: "", label: "Choose" },
                ...(ambulances || []).map((a) => ({
                  value: String(a.id),
                  label: `${a.vehicleNumber} — ${a.type}`
                }))
              ]}
              onChange={(value) => update("ambulanceId", value)}
              placeholder="Choose"
              className=""
            />
          </div>

          <div>
            <label className="text-sm">Pickup Address</label>
            <input
              className="input"
              value={form.pickupAddress}
              onChange={(e) => update("pickupAddress", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Destination</label>
            <input
              className="input"
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Patient Name</label>
            <input
              className="input"
              value={form.patientName}
              onChange={(e) => update("patientName", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Contact Number</label>
            <input
              className="input"
              value={form.contactNumber}
              onChange={(e) => update("contactNumber", e.target.value)}
            />
          </div>

          <div>
            <SearchableDropdown
              label="Emergency"
              value={String(form.emergency)}
              options={[
                { value: "false", label: "No" },
                { value: "true", label: "Yes (Emergency)" }
              ]}
              onChange={(value) => update("emergency", value === "true")}
              placeholder="Select"
              className=""
            />
          </div>

          <div>
            <label className="text-sm">ETA (minutes)</label>
            <input
              type="number"
              className="input"
              value={form.eta}
              onChange={(e) => update("eta", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm">Pickup Latitude</label>
            <input
              className="input"
              value={form.pickupLatitude}
              onChange={(e) => update("pickupLatitude", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Pickup Longitude</label>
            <input
              className="input"
              value={form.pickupLongitude}
              onChange={(e) => update("pickupLongitude", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Destination Latitude</label>
            <input
              className="input"
              value={form.destLatitude}
              onChange={(e) => update("destLatitude", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm">Destination Longitude</label>
            <input
              className="input"
              value={form.destLongitude}
              onChange={(e) => update("destLongitude", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button
            className="btn bg-blue-600 text-white"
            onClick={() => save.mutate()}>
            Book
          </button>
        </div>
      </div>
    </div>
  );
}
