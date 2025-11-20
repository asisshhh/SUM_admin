import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export default function ReceptionistCheckin({ doctorId }) {
  const { fromDate, buildDateParams } = useDateRange(); // default = today

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const s = io(SOCKET_URL, {
      path: "/socket.io",
      auth: { token: token ? `Bearer ${token}` : "" }
    });

    setSocket(s);

    s.on("connect", () => {
      console.log("Reception connected");
    });

    s.on("actionSuccess", (m) => console.log("Success:", m));
    s.on("actionError", (m) => alert(m.message));

    return () => {
      s.disconnect();
    };
  }, []);

  // LOAD today's appointments
  const load = async () => {
    setLoading(true);
    try {
      const params = {
        type: "appointments",
        doctorId,
        page: 1,
        limit: 200,
        ...buildDateParams()
      };

      const res = await api.get("/orders", { params });

      const rows = Array.isArray(res.data.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];

      setAppointments(rows);
    } catch (err) {
      console.error(err);
      alert("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [doctorId]);

  // CHECK-IN + TOKEN GENERATION
  const handleCheckIn = async (id) => {
    try {
      // Update status → CONFIRMED
      await api.patch(`/orders/${id}/update-status?type=appointments`, {
        status: "CONFIRMED"
      });

      // Generate token
      await api.post(`/appointments/generate-token`, { appointmentId: id });

      // Emit refresh event to doctor room
      if (socket) socket.emit("refreshQueue", { doctorId, date: fromDate });

      load();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Check-in failed");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Receptionist – Check-In</h3>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded-lg"
          onClick={load}
          disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-3">#</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Slot</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {!loading && appointments.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4">
                  No appointments for today
                </td>
              </tr>
            )}

            {appointments.map((a, i) => (
              <tr key={a.id} className="border-b hover:bg-slate-50">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{a.patient?.name || "-"}</td>
                <td className="p-3">{a.patient?.phone || "-"}</td>
                <td className="p-3">{a.timeSlot}</td>
                <td className="p-3">{a.status}</td>
                <td className="p-3">
                  {a.status !== "IN_QUEUE" && (
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded-lg"
                      onClick={() => handleCheckIn(a.id)}>
                      Check-In + Token
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {loading && (
              <tr>
                <td colSpan={6} className="p-4">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
