// src/pages/TokenWidgetPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";
import Socket from "../utils/SocketManager";

export default function TokenWidgetPage() {
  const { doctorId } = useParams();
  const today = new Date().toISOString().split("T")[0];
  const [current, setCurrent] = useState(null);
  const [next, setNext] = useState(null);

  const load = async () => {
    try {
      const res = await api.get(`/appointment-queue/doctor/${doctorId}`, {
        params: { date: today }
      });
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.list || res.data?.items || [];
      const cur = list.find((x) => x.status === "IN_QUEUE") || null;
      const nxt =
        list.find((x) => x.queuePosition === (cur?.queuePosition || 0) + 1) ||
        null;
      setCurrent(cur);
      setNext(nxt);
    } catch (err) {
      setCurrent(null);
      setNext(null);
    }
  };

  useEffect(() => {
    load();
    Socket.emit("joinDoctorRoom", { doctorId: Number(doctorId), date: today });
    const offQueueUpdated = Socket.on("queueUpdated", load);
    return () => {
      offQueueUpdated();
    };
  }, [doctorId]);

  return (
    <div className="p-8">
      <div className="bg-white p-6 rounded shadow max-w-sm">
        <div className="text-sm text-gray-500">Live Token</div>
        <div className="text-5xl font-bold mt-2">
          {current?.tokenNumber ?? "--"}
        </div>
        <div className="mt-4 text-gray-600">
          Next: {next?.tokenNumber ?? "--"}
        </div>
      </div>
    </div>
  );
}
