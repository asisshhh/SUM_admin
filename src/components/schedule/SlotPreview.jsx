import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";

export default function SlotPreview({ doctorId }) {
  const [date, setDate] = useState("");

  const { data: slots } = useQuery({
    queryKey: ["slot-preview", doctorId, date],
    enabled: !!date,
    queryFn: async () =>
      (await api.get(`/schedule/${doctorId}/slots`, { params: { date } })).data
  });

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold">Slot Preview</h2>

      <input
        type="date"
        className="input mt-3"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {date && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {slots?.map((s, i) => (
            <div
              key={i}
              className={`border p-2 rounded text-sm text-center ${
                s.status === "AVAILABLE"
                  ? "bg-green-100 text-green-700"
                  : s.status === "BOOKED"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }`}>
              {s.time}
              <div className="text-xs">{s.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
