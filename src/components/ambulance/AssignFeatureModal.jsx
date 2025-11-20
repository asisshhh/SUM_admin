import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function AssignFeatureModal({ ambulance, onClose }) {
  const qc = useQueryClient();

  const { data: features } = useQuery({
    queryKey: ["features"],
    queryFn: async () => (await api.get("/ambulance-features")).data
  });

  const addFeature = useMutation({
    mutationFn: async (featureId) =>
      (await api.post(`/ambulance/${ambulance.id}/features`, { featureId }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulances"] })
  });

  const removeFeature = useMutation({
    mutationFn: async (featureId) =>
      (await api.delete(`/ambulance/${ambulance.id}/features/${featureId}`))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ambulances"] })
  });

  const assigned = ambulance.features.map((f) => f.feature.id);

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="card p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold">
          Manage Features — {ambulance.vehicleNumber}
        </h2>

        <div className="space-y-2">
          {features?.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-2 border rounded">
              <span>{f.name}</span>

              {!assigned.includes(f.id) ? (
                <button
                  className="btn bg-blue-600 text-white"
                  onClick={() => addFeature.mutate(f.id)}>
                  Add
                </button>
              ) : (
                <button
                  className="btn bg-red-600 text-white"
                  onClick={() => removeFeature.mutate(f.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-3">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
