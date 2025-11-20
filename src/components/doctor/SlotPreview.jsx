import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";

export default function SlotPreview({ doctorId }) {
  const [date, setDate] = useState("");

  const { data: slots } = useQuery({
    queryKey: ["doctor-slots", doctorId, date],
    queryFn: async () =>
      date
        ? (await api.get(`/doctors/${doctorId}/slots`, { params: { date } }))
            .data
        : [],
    enabled: !!date
  });

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">Slot Preview</h2>

      <input
        type="date"
        className="input w-60"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {!date && <div>Select date</div>}

      {date && (
        <div className="flex flex-wrap gap-3">
          {slots?.map((s, i) => (
            <div
              key={i}
              className={`px-3 py-2 rounded text-sm ${
                s.status === "AVAILABLE"
                  ? "bg-green-100 text-green-700"
                  : s.status === "BOOKED"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}>
              {s.time} — {s.status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
