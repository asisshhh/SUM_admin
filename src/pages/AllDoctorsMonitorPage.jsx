import React, { useEffect, useState } from "react";
import Socket from "../utils/SocketManager";
import api from "../api/client";
import {
  Stethoscope,
  Clock,
  User,
  Users,
  Activity,
  RefreshCw
} from "lucide-react";

export default function AllDoctorsMonitor() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = React.useRef(null);

  const today = new Date().toISOString().split("T")[0];

  // -------------------------------------------------------
  // LOAD ALL DOCTORS + THEIR QUEUE STATUS
  // -------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true);

      const res = await api.get("/admin/doctors"); // your backend already has this
      const docs = res.data?.data || res.data || [];

      const final = [];

      for (const d of docs) {
        const q = await api.get(
          `/admin/appointment-queue/doctor/${d.id}?date=${today}`
        );

        const list = q.data || [];

        const current = list.find((a) => a.status === "IN_QUEUE") || null;
        const next =
          list.find(
            (a) => a.queuePosition === (current?.queuePosition || 0) + 1
          ) || null;

        const waiting = list.filter((a) => a.status !== "IN_QUEUE").length;

        final.push({
          ...d,
          current,
          next,
          waiting,
          list
        });
      }

      setDoctors(final);
    } catch (err) {
      console.error("Load doctors monitor error:", err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // SOCKET LIVE UPDATES
  // -------------------------------------------------------
  useEffect(() => {
    socketRef.current = Socket.getSocket();

    const offConnect = Socket.onConnect(() => {
      console.log("📡 All Doctors Monitor Connected");
    });

    // whenever any doctor queue changes
    const offQueueUpdatedForAll = Socket.on("queueUpdatedForAllDoctors", () => {
      console.log("🔄 Monitor refresh triggered");
      loadData();
    });

    const offQueueUpdated = Socket.on("queueUpdated", () => {
      console.log("🔄 Individual queue updated");
      loadData();
    });

    return () => {
      offConnect();
      offQueueUpdatedForAll();
      offQueueUpdated();
    };
  }, []);

  // Init Load
  useEffect(() => {
    loadData();
  }, []);

  // -------------------------------------------------------
  // UI COMPONENTS
  // -------------------------------------------------------

  const DoctorCard = ({ d }) => (
    <div className="p-6 bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 hover:shadow-2xl transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold">
          {d.user?.name?.charAt(0)}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {d.user?.name}
          </h3>
          <p className="text-sm text-slate-500">{d.specialization}</p>
        </div>
      </div>

      {/* Current Patient */}
      <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} className="text-purple-700" />
          <span className="text-purple-700 font-medium text-sm">
            CURRENT PATIENT
          </span>
        </div>
        {d.current ? (
          <p className="font-semibold text-slate-800">
            {d.current.patient?.name} (Token {d.current.tokenNumber})
          </p>
        ) : (
          <p className="text-slate-500">No one in consultation</p>
        )}
      </div>

      {/* Next Patient */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-blue-700" />
          <span className="text-blue-700 font-medium text-sm">NEXT</span>
        </div>
        {d.next ? (
          <p className="font-semibold text-slate-800">
            {d.next.patient?.name} (Token {d.next.tokenNumber})
          </p>
        ) : (
          <p className="text-slate-500">No next patient</p>
        )}
      </div>

      {/* Waiting */}
      <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} className="text-orange-700" />
          <span className="text-orange-700 font-medium text-sm">WAITING</span>
        </div>
        <p className="font-semibold text-slate-800">{d.waiting} patients</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Dept: {d.department?.name}</span>
        <span className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Live
        </span>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-slate-800 flex items-center gap-3">
        <Stethoscope size={30} className="text-blue-600" />
        All Doctors – Live Queue Monitor
      </h1>

      <div className="mb-6 flex justify-end">
        <button
          onClick={loadData}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 shadow">
          Refresh Now
        </button>
      </div>

      {loading ? (
        <p className="text-center mt-20 text-slate-500 text-lg">
          Loading monitor…
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {doctors.map((d) => (
            <DoctorCard key={d.id} d={d} />
          ))}
        </div>
      )}
    </div>
  );
}
