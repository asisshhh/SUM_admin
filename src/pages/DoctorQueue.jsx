import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { User, Clock, ChevronRight } from "lucide-react";
import api from "../api/client";

export default function DoctorQueue({ doctorId }) {
  const [queue, setQueue] = useState(null);
  const [socket, setSocket] = useState(null);

  const dateStr = new Date().toISOString().split("T")[0];

  // Connect socket
  useEffect(() => {
    const token = localStorage.getItem("token");
    const s = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token }
    });
    setSocket(s);

    s.emit("joinDoctorRoom", { doctorId, date: dateStr });

    s.on("queueUpdated", (payload) => {
      setQueue(payload);
    });

    return () => s.disconnect();
  }, [doctorId]);

  if (!queue) return <div className="p-6">Loading queue...</div>;

  const { current, next, waiting } = queue;

  const Card = ({ title, appt }) => (
    <div className="p-4 border rounded-xl bg-white shadow-sm mb-3">
      <h3 className="font-semibold mb-2">{title}</h3>
      {appt ? (
        <div className="flex items-center gap-3">
          <User size={28} className="text-blue-600" />
          <div>
            <p className="font-bold text-lg">{appt.patient?.name}</p>
            <p className="text-sm text-slate-600">
              Token {appt.tokenNumber} • {appt.timeSlot}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-slate-500">No patient</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4 p-6 max-w-lg mx-auto">
      <Card title="Current Patient" appt={current} />
      <Card title="Next Patient" appt={next} />

      <div className="p-4 border rounded-xl bg-white shadow-sm">
        <h3 className="font-semibold mb-2">Waiting List</h3>
        {waiting?.length > 0 ? (
          waiting.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <User size={20} />
                <span>{a.patient?.name}</span>
              </div>
              <span className="text-slate-600 text-sm">#{a.tokenNumber}</span>
            </div>
          ))
        ) : (
          <p className="text-slate-500">No waiting patients</p>
        )}
      </div>
    </div>
  );
}
