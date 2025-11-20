import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function AmbulanceDispatchPanel({ booking, onClose }) {
  const qc = useQueryClient();

  const [fare, setFare] = useState("");

  const dispatch = useMutation({
    mutationFn: async () =>
      (await api.post(`/ambulance/dispatch/${booking.id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulance-bookings"] });
    }
  });

  const complete = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/ambulance/complete/${booking.id}`, {
          totalFare: Number(fare),
          ambulanceId: booking.ambulanceId
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ambulances"] });
      qc.invalidateQueries({ queryKey: ["ambulance-bookings"] });
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="card w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Dispatch Ambulance — #{booking.id}
        </h2>

        <div>
          <div className="text-sm text-slate-500">Pickup Address</div>
          <div className="font-medium">{booking.pickupAddress}</div>
        </div>

        <div>
          <div className="text-sm text-slate-500">Destination</div>
          <div className="font-medium">{booking.destination}</div>
        </div>

        <div>
          <div className="text-sm text-slate-500">Patient</div>
          <div className="font-medium">
            {booking.patientName} ({booking.contactNumber})
          </div>
        </div>

        <div className="pt-3 space-y-2">
          {booking.status === "REQUESTED" && (
            <button
              className="btn bg-blue-600 text-white w-full"
              onClick={() => dispatch.mutate()}>
              Dispatch Ambulance
            </button>
          )}

          {booking.status === "DISPATCHED" && (
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Total Fare (₹)"
                value={fare}
                onChange={(e) => setFare(e.target.value)}
              />

              <button
                className="btn bg-green-600 text-white w-full"
                onClick={() => complete.mutate()}>
                Mark as Completed
              </button>
            </div>
          )}

          {booking.status === "COMPLETED" && (
            <div className="text-center text-green-700 font-medium">
              🚑 Booking Completed
            </div>
          )}
        </div>

        <button className="btn w-full mt-4" onClick={onClose}>
          Close Panel
        </button>
      </div>
    </div>
  );
}
