import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import api from "../api/client";
import { Users, User, Phone, Clock, Loader2, RefreshCw } from "lucide-react";

// Design reference image (uploaded by user): /mnt/data/1cba9466-1c3c-450e-ae1c-35df1927733e.png

/**
 * DoctorQueue.jsx
 * Premium enterprise-grade doctor queue UI
 * - Live socket updates
 * - Department -> Doctor interlinked dropdowns
 * - Current / Upcoming / Skipped sections
 * - Action controls for receptionist/doctor (Next / Skip / Check-in)
 * - Clean responsive layout (TailwindCSS)
 *
 * Usage: Place this file in your frontend src/pages and ensure `api` and
 * import.meta.env.VITE_SOCKET_URL are configured. Make sure Tailwind & lucide-react are installed.
 */

export default function DoctorQueue() {
  const today = new Date().toISOString().split("T")[0];

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const socketRef = useRef(null);

  // Load departments once
  useEffect(() => {
    let mounted = true;
    api
      .get("/departments")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDepartments(list);
      })
      .catch((err) => {
        console.error("Failed to load departments", err);
      });

    return () => (mounted = false);
  }, []);

  // Load doctors when department changes
  useEffect(() => {
    if (!department) {
      setDoctors([]);
      setDoctor("");
      return;
    }
    api
      .get("/doctors", { params: { departmentId: department } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDoctors(list);
      })
      .catch((err) => {
        console.error("Failed to load doctors", err);
        setDoctors([]);
      });
  }, [department]);

  // load queue from API
  const loadQueue = async (docId = doctor) => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await api.get(`/appointment-queue/doctor/${docId}`, {
        params: { date: today }
      });

      // Server returns array or { list }
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.list || res.data?.data || [];

      // Ensure queuePosition & tokenNumber present
      const normalized = list.map((a, idx) => ({
        ...a,
        queuePosition: a.queuePosition ?? a.tokenNumber ?? idx + 1,
        tokenNumber: a.tokenNumber ?? a.queuePosition ?? idx + 1
      }));

      // sort by queuePosition asc
      normalized.sort(
        (x, y) => (x.queuePosition || 0) - (y.queuePosition || 0)
      );

      setQueue(normalized);
    } catch (err) {
      console.error("Queue load error", err);
      setQueue([]);
    }
    setLoading(false);
  };

  // Socket initialization and handlers
  useEffect(() => {
    // create socket once per page
    setConnecting(true);
    const token = localStorage.getItem("token");
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
      transports: ["websocket"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnecting(false);
      console.log("socket connected", socket.id);
      if (doctor)
        socket.emit("joinDoctorRoom", { doctorId: doctor, date: today });
    });

    socket.on("connect_error", (err) => {
      console.warn("socket connect_error", err.message);
    });

    // When the server emits new queue for the joined room
    socket.on("queueUpdated", (payload) => {
      // payload may be array or { list, current, next }
      const list = Array.isArray(payload) ? payload : payload?.list || [];
      if (list.length) {
        const normalized = list.map((a, idx) => ({
          ...a,
          queuePosition: a.queuePosition ?? a.tokenNumber ?? idx + 1,
          tokenNumber: a.tokenNumber ?? a.queuePosition ?? idx + 1
        }));
        normalized.sort(
          (x, y) => (x.queuePosition || 0) - (y.queuePosition || 0)
        );
        setQueue(normalized);
      } else {
        // empty payload -> reload
        loadQueue(doctor);
      }
    });

    // Admin-wide event (when admin regenerates all queues)
    socket.on("queueUpdatedForAllDoctors", ({ date }) => {
      // if current date is same (or if no date passed), refresh current view
      if (!date || date === today) loadQueue(doctor);
    });

    // gently cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // join room whenever doctor changes
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    if (!doctor) return;
    s.emit("joinDoctorRoom", { doctorId: doctor, date: today });
    loadQueue(doctor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor]);

  // action helpers
  const emitAction = (event, payload) => {
    const s = socketRef.current;
    if (!s) return Promise.reject(new Error("Socket not connected"));
    return new Promise((resolve) => {
      s.emit(event, payload, (ack) => resolve(ack));
      // Some servers may not ack; still resolve
      setTimeout(() => resolve(true), 1500);
    });
  };

  const onNext = async () => {
    if (!doctor) return;
    try {
      await emitAction("doctorNext", { doctorId: doctor, date: today });
      // optimistic reload
      setTimeout(() => loadQueue(doctor), 300);
    } catch (err) {
      console.error(err);
    }
  };

  const onSkip = async (reason = "") => {
    if (!doctor) return;
    try {
      await emitAction("doctorSkip", { doctorId: doctor, date: today, reason });
      setTimeout(() => loadQueue(doctor), 300);
    } catch (err) {
      console.error(err);
    }
  };

  const onCheckIn = async (appointmentId) => {
    if (!appointmentId) return;
    try {
      await emitAction("checkInPatient", { appointmentId });
      setTimeout(() => loadQueue(doctor), 300);
    } catch (err) {
      console.error(err);
    }
  };

  const onGenerateToken = async (appointmentId) => {
    if (!appointmentId) return;
    try {
      await emitAction("generateToken", { appointmentId });
      setTimeout(() => loadQueue(doctor), 300);
    } catch (err) {
      console.error(err);
    }
  };

  // UI small helpers
  const current =
    queue.find((q) => q.status === "IN_QUEUE") || queue[0] || null;
  const upcoming = queue.filter((q) => q.id !== (current?.id ?? null));

  return (
    <div className="min-h-[400px] bg-white p-6 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Users size={22} /> Live Doctor Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time queue for selected doctor. Actions update queue for all
            connected clients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">Socket:</div>
          <div
            className={`px-3 py-1 rounded-full text-sm ${
              connecting
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-50 text-green-700"
            }`}>
            {connecting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Connecting
              </span>
            ) : (
              <span className="flex items-center gap-2">Connected</span>
            )}
          </div>
          <button
            onClick={() => loadQueue(doctor)}
            className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-slate-50">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-12 gap-4">
        <div className="col-span-5">
          <label className="text-sm text-slate-600">Department</label>
          <select
            className="w-full border rounded-lg p-2"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}>
            <option value="">-- Select Department --</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-5">
          <label className="text-sm text-slate-600">Doctor</label>
          <select
            className="w-full border rounded-lg p-2"
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            disabled={!department}>
            <option value="">-- Select Doctor --</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user?.name || d.id}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2 flex items-end justify-end">
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700"
            disabled={!doctor}
            onClick={() => loadQueue(doctor)}>
            Load Queue
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="mt-6 grid grid-cols-12 gap-6">
        {/* Current patient card */}
        <div className="col-span-5">
          <div className="rounded-xl border p-6 bg-gradient-to-br from-white to-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Current Patient</div>
                <div className="text-3xl font-bold mt-2">
                  {current ? `Token #${current.tokenNumber}` : "—"}
                </div>
                <div className="text-sm text-slate-500">
                  {current ? current.timeSlot : "No slot"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Status</div>
                <div
                  className={`mt-2 px-3 py-1 rounded-full text-white ${
                    current?.status === "IN_QUEUE"
                      ? "bg-green-600"
                      : "bg-slate-400"
                  }`}>
                  {current?.status || "-"}
                </div>
              </div>
            </div>

            {current ? (
              <div className="mt-6 grid grid-cols-1 gap-2">
                <div className="flex items-center gap-3">
                  <User size={18} />{" "}
                  <div className="font-medium">{current.patient?.name}</div>
                </div>

                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} /> {current.patient?.phone}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={onNext}
                    className="px-4 py-2 bg-green-600 text-white rounded-md">
                    Next
                  </button>
                  <button
                    onClick={() => onSkip("Skipped by doctor")}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md">
                    Skip
                  </button>
                  <button
                    onClick={() => onCheckIn(current.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md">
                    Check-in
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 text-slate-500">
                No patient is currently in queue.
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                if (!confirm("Generate today's queue for all doctors?")) return;
                api
                  .post("/admin/generate-day-queue", { date: today })
                  .then(() => alert("Generated"))
                  .catch((e) => alert("Failed"));
              }}
              className="px-3 py-2 border rounded-md bg-purple-600 text-white">
              Generate Full Queue
            </button>

            <button
              onClick={() => {
                if (!confirm("Generate missing tokens?")) return;
                api
                  .post("/admin/generate-missing-tokens", { date: today })
                  .then(() => alert("Done"))
                  .catch(() => alert("Failed"));
              }}
              className="px-3 py-2 border rounded-md bg-yellow-600 text-white">
              Missing Tokens
            </button>

            <button
              onClick={() => {
                if (!confirm("Reassign queue?")) return;
                api
                  .post("/admin/reassign-queue", { date: today })
                  .then(() => alert("Reassigned"))
                  .catch(() => alert("Failed"));
              }}
              className="px-3 py-2 border rounded-md bg-slate-100">
              Reassign
            </button>
          </div>
        </div>

        {/* Upcoming list */}
        <div className="col-span-7">
          <div className="rounded-xl border p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Clock size={18} />
                <div>
                  <div className="text-sm text-slate-500">
                    Upcoming Patients
                  </div>
                  <div className="text-xs text-slate-400">
                    {queue.length} total
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-500">Date: {today}</div>
              </div>
            </div>

            <div className="space-y-3">
              {loading && (
                <div className="p-6 text-center">
                  <Loader2 className="animate-spin mx-auto" />
                </div>
              )}

              {!loading && upcoming.length === 0 && (
                <div className="p-6 text-center text-slate-500">
                  No upcoming patients
                </div>
              )}

              {!loading &&
                upcoming.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-md bg-slate-100 flex items-center justify-center font-semibold">
                        {q.tokenNumber}
                      </div>
                      <div>
                        <div className="font-medium">{q.patient?.name}</div>
                        <div className="text-sm text-slate-500">
                          {q.timeSlot} • {q.patient?.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm px-2 py-1 rounded-full bg-slate-100">
                        {q.status}
                      </div>
                      <button
                        onClick={() => onGenerateToken(q.id)}
                        className="px-3 py-1 border rounded text-sm">
                        Token
                      </button>
                      <button
                        onClick={() => onCheckIn(q.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                        Check-in
                      </button>
                      <button
                        onClick={() => onSkip("manual skip")}
                        className="px-3 py-1 bg-orange-500 text-white rounded text-sm">
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
