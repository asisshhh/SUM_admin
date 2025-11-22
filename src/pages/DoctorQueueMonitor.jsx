// DoctorQueueMonitorOptimized.jsx
// Production-grade version with socket auto-reconnect + safe reload + toast notifications

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import Socket from "../utils/SocketManager";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function DoctorQueueMonitor() {
  const { doctorId } = useParams();
  const today = new Date().toISOString().split("T")[0];

  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [next, setNext] = useState(null);

  const loadQueue = useCallback(async () => {
    try {
      const res = await api.get(`/appointment-queue/doctor/${doctorId}`, {
        params: { date: today }
      });

      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.list || res.data?.items || [];
      setQueue(list);

      const cur = list.find((x) => x.status === "IN_QUEUE") || null;
      const nxt =
        list.find((x) => x.queuePosition === (cur?.queuePosition || 0) + 1) ||
        null;

      setCurrent(cur);
      setNext(nxt);
    } catch (e) {
      toast.error("Failed to load queue");
    }
  }, [doctorId, today]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // SOCKET HANDLERS (Optimized)
  useEffect(() => {
    if (!doctorId) return;

    const roomPayload = { doctorId: Number(doctorId), date: today };
    Socket.emit("joinDoctorRoom", roomPayload);

    const off1 = Socket.on("queueUpdated", ({ date }) => {
      if (date === today) loadQueue();
    });

    const off2 = Socket.on("queueUpdatedForAllDoctors", ({ date }) => {
      if (date === today) loadQueue();
    });

    return () => {
      off1();
      off2();
    };
  }, [doctorId, today, loadQueue]);

  return (
    <div className="min-h-screen p-8 bg-slate-900 text-white">
      <ToastContainer />

      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">
              Live Queue Monitor (Optimized)
            </h1>
            <p className="text-slate-300 mt-1">
              Doctor ID: {doctorId} • {today}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-1 bg-green-700 p-8 rounded-lg">
            <div className="text-sm">CURRENT</div>
            <div className="text-7xl font-extrabold mt-2">
              {current?.tokenNumber ?? "--"}
            </div>
            <div className="mt-2 text-lg">
              {current?.patient?.name ?? "No patient"}
            </div>
          </div>

          <div className="col-span-1 bg-blue-700 p-8 rounded-lg">
            <div className="text-sm">NEXT</div>
            <div className="text-5xl font-bold mt-2">
              {next?.tokenNumber ?? "--"}
            </div>
            <div className="mt-1">{next?.patient?.name ?? "No patient"}</div>
          </div>

          <div className="col-span-1 bg-slate-800 p-6 rounded-lg">
            <div className="text-sm text-slate-300">Summary</div>
            <div className="mt-3 text-xl">
              Total Queue: <span className="font-semibold">{queue.length}</span>
            </div>
            <div className="mt-2 text-sm text-slate-300">
              Updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Full Queue Table */}
        <section className="bg-white rounded-lg overflow-hidden text-black">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Full Queue</h2>
          </div>

          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Token</th>
                  <th className="p-3">Pos</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => (
                  <tr key={q.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-semibold">
                      {q.tokenNumber ?? "-"}
                    </td>
                    <td className="p-3">{q.queuePosition ?? "-"}</td>
                    <td className="p-3">{q.patient?.name}</td>
                    <td className="p-3">{q.patient?.phone}</td>
                    <td className="p-3">{q.status}</td>
                  </tr>
                ))}

                {queue.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center">
                      No queue
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
