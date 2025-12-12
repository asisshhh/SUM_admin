// src/pages/DoctorActionPanel.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import Socket from "../utils/SocketManager";

export default function DoctorActionPanel() {
  const { doctorId } = useParams();
  const today = new Date().toISOString().split("T")[0];

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const res = await api.get(`/appointment-queue/doctor/${doctorId}`, {
        params: { date: today }
      });
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.list || res.data?.items || [];
      setQueue(list);
    } catch (err) {
      setQueue([]);
      console.error(err);
    }
    setLoading(false);
  }, [doctorId, today]);

  useEffect(() => {
    load();
    Socket.emit("joinDoctorRoom", { doctorId: Number(doctorId), date: today });
    const offQueueUpdated = Socket.on("queueUpdated", load);
    return () => {
      offQueueUpdated();
    };
  }, [doctorId, load, today]);

  const callNext = async () => {
    await Socket.emit("doctorNext", {
      doctorId: Number(doctorId),
      date: today
    });
  };

  const skip = async () => {
    await Socket.emit("doctorSkip", {
      doctorId: Number(doctorId),
      date: today,
      reason: "Skipped by doctor"
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Doctor Action Panel — Dr {doctorId}
      </h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={callNext}
          className="px-4 py-2 bg-green-600 text-white rounded">
          Call Next
        </button>
        <button
          onClick={skip}
          className="px-4 py-2 bg-red-600 text-white rounded">
          Skip
        </button>
        <button onClick={load} className="px-4 py-2 border rounded">
          Refresh
        </button>
      </div>

      <div className="bg-white rounded shadow">
        <div className="p-4 border-b">
          <strong>Queue</strong> (Total {queue.length})
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">Pos</th>
                <th className="p-2">Token</th>
                <th className="p-2">Patient</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((q) => (
                <tr key={q.id} className="border-b">
                  <td className="p-2">{q.queuePosition}</td>
                  <td className="p-2">{q.tokenNumber}</td>
                  <td className="p-2">{q.patient?.name}</td>
                  <td className="p-2">{q.status}</td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td className="p-4" colSpan={4}>
                    No queue
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
