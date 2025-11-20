import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function AssignDriverModal({ ambulance, onClose }) {
  const qc = useQueryClient();

  const { data: drivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => (await api.get("/drivers")).data
  });

  const [selected, setSelected] = useState(ambulance.driverId || "");

  const assign = useMutation({
    mutationFn: async () =>
      (
        await api.put(`/ambulance/${ambulance.id}`, {
          ...ambulance,
          driverId: Number(selected)
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulances"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="card p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">
          Assign Driver — {ambulance.vehicleNumber}
        </h2>

        <select
          className="select w-full"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}>
          <option value="">Select Driver</option>

          {drivers?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.phone}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-blue-600 text-white"
            onClick={() => assign.mutate()}>
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
