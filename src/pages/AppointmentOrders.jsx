import React, { useEffect, useState, useRef } from "react";
import api from "../api/client";

import useDateRange from "../hooks/useDateRange";
import DateRangeFilter from "../components/DateRangeFilter";
import SearchBar from "../components/SearchBar";
import StatusFilter from "../components/StatusFilter";
import OrderDetailsModal from "../components/OrderDetailsModal";
import { printReceipt } from "../components/ReceiptPrint";
import io from "socket.io-client";

const DEFAULT_LIMIT = 20;

export default function AppointmentOrders() {
  // ---------------- Date Filters ----------------
  const {
    fromDate,
    toDate,
    includeFuture,
    setFromDate,
    setToDate,
    setIncludeFuture,
    buildDateParams,
    resetDates
  } = useDateRange();

  const today = new Date().toISOString().split("T")[0];

  // ---------------- Filters ----------------
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");

  // Dropdown Data
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Data Table
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Queue generation loading
  const [genLoading, setGenLoading] = useState(false);

  // Sockets
  const [socketInstance, setSocketInstance] = useState(null);

  // --------------- Fetch Appointments ---------------
  const fetchOrders = async () => {
    return await load(page);
  };

  const load = async (p = 1) => {
    setLoading(true);

    try {
      const params = {
        type: "appointments",
        page: p,
        limit,
        search: search || undefined,
        status: status || undefined,
        doctorId: doctor || undefined,
        departmentId: department || undefined,
        ...buildDateParams()
      };

      const res = await api.get("/orders", { params });

      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const totalCount =
        res.data?.total ??
        res.data?.count ??
        (Array.isArray(res.data) ? res.data.length : 0);
      const currentPage = res.data?.page ?? p;

      setRows(data);
      setTotal(totalCount);
      setPage(currentPage);

      return data;
    } catch (err) {
      console.error("LOAD ERROR:", err);
      setRows([]);
      setTotal(0);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    load(1);
  }, []);

  // ---------------- Debounced Search ----------------
  const searchRef = useRef(null);
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(1), 500);

    return () => clearTimeout(searchRef.current);
  }, [search]);

  // ---------------- Load Departments ----------------
  useEffect(() => {
    api
      .get("/departments")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDepartments(list);
      })
      .catch((err) => console.error("DEPT LOAD ERROR:", err));
  }, []);

  // ---------------- Load Doctors on Department Change ----------------
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
      .catch(() => setDoctors([]));
  }, [department]);

  // ---------------- Socket Connection ----------------
  useEffect(() => {
    const token = localStorage.getItem("token");

    const s = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token }
    });

    setSocketInstance(s);

    // Listen from backend when any queue changes
    s.on("queueUpdatedForAllDoctors", () => {
      load(page);
    });

    // Listen for doctor-specific updates too
    s.on("queueUpdated", () => {
      load(page);
    });

    return () => s.disconnect();
  }, []);

  // ---------------- Handle Modal Update Refresh ----------------
  const handleUpdated = async () => {
    const fresh = await fetchOrders();
    const updatedRow = fresh.find((x) => x.id === selectedOrder?.id);
    if (updatedRow) setSelectedOrder(updatedRow);
  };

  // ---------------- Generate Full Queue ----------------
  const generateFullQueue = async () => {
    if (!confirm("Generate today’s queue for ALL doctors?")) return;

    setGenLoading(true);

    try {
      await api.post("/appointment-queue/generate-day-queue", { date: today });
      await fetchOrders();
      alert("Queue generated successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate queue");
    }

    setGenLoading(false);
  };

  // ---------------- Reset All Filters ----------------
  const handleResetAll = () => {
    setSearch("");
    setStatus("");
    setDepartment("");
    setDoctor("");
    resetDates();
    load(1);
  };

  // ---------------- Render ----------------
  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">Appointments</h3>
          <p className="text-sm text-slate-500">
            Manage appointments, view details, print receipts & manage queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Generate all tokens */}
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            onClick={generateFullQueue}
            disabled={genLoading}>
            {genLoading ? "Generating..." : "Generate Today's Queue"}
          </button>

          {/* Missing tokens */}
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            onClick={async () => {
              if (!confirm("Generate missing tokens?")) return;
              await api.post("/appointment-queue/generate-missing-tokens", {
                date: today
              });
              load(1);
            }}>
            Missing Tokens
          </button>

          {/* Reassign */}
          <button
            className="px-4 py-2 bg-orange-600 text-white rounded-lg"
            onClick={async () => {
              if (!confirm("Reassign queue for all doctors?")) return;
              await api.post("/appointment-queue/reassign-queue", {
                date: today
              });
              load(1);
            }}>
            Reassign Queue
          </button>

          <button
            className="px-3 py-1 border rounded"
            onClick={() => load(page)}>
            Refresh
          </button>

          <button
            className="px-3 py-1 bg-red-50 text-red-700 border rounded"
            onClick={handleResetAll}>
            Reset All
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid md:grid-cols-3 gap-4">
        <SearchBar value={search} onChange={setSearch} />
        <StatusFilter value={status} onChange={setStatus} />
        <DateRangeFilter
          fromDate={fromDate}
          toDate={toDate}
          includeFuture={includeFuture}
          setFromDate={setFromDate}
          setToDate={setToDate}
          setIncludeFuture={setIncludeFuture}
          onReset={resetDates}
        />
      </div>

      {/* More Filters */}
      <div className="grid md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-sm">Department</label>
          <select
            className="w-full border p-2 rounded"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Doctor</label>
          <select
            className="w-full border p-2 rounded"
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            disabled={!department}>
            <option value="">All</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.user?.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex gap-3 items-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => load(1)}>
            Apply
          </button>

          <button className="px-4 py-2 border rounded" onClick={handleResetAll}>
            Reset
          </button>

          <div className="ml-auto text-sm text-slate-500">
            Showing {rows.length} of {total}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3 text-sm">#</th>
              <th className="p-3 text-sm">Patient</th>
              <th className="p-3 text-sm">Phone</th>
              <th className="p-3 text-sm">Doctor</th>
              <th className="p-3 text-sm">Department</th>
              <th className="p-3 text-sm">Date</th>
              <th className="p-3 text-sm">Slot</th>
              <th className="p-3 text-sm">Status</th>
              <th className="p-3 text-sm">Queue Tools</th>
              <th className="p-3 text-sm">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="p-4 text-center">
                  No records found
                </td>
              </tr>
            )}

            {rows.map((r, i) => (
              <tr key={r.id} className="border-b hover:bg-slate-50">
                <td className="p-3 text-sm">{(page - 1) * limit + i + 1}</td>
                <td className="p-3 text-sm">{r.patient?.name}</td>
                <td className="p-3 text-sm">{r.patient?.phone}</td>
                <td className="p-3 text-sm">{r.doctor?.user?.name}</td>
                <td className="p-3 text-sm">{r.department?.name}</td>
                <td className="p-3 text-sm">{r.date?.split("T")[0]}</td>
                <td className="p-3 text-sm">{r.timeSlot}</td>
                <td className="p-3 text-sm">{r.status}</td>
                <td className="p-3 text-sm">
                  {r.doctorId && (
                    <div className="flex gap-2">
                      <a
                        href={`/doctor/queue-monitor/${r.doctorId}`}
                        target="_blank"
                        className="text-purple-600 underline">
                        Monitor
                      </a>

                      <a
                        href={`/doctor/actions/${r.doctorId}`}
                        target="_blank"
                        className="text-blue-600 underline">
                        Actions
                      </a>

                      <a
                        href={`/widgets/token/${r.doctorId}`}
                        target="_blank"
                        className="text-green-600 underline">
                        Token
                      </a>
                    </div>
                  )}
                </td>

                <td className="p-3 text-sm">
                  <div className="flex gap-3">
                    <button
                      className="text-blue-600 underline"
                      onClick={() => {
                        setSelectedOrder(r);
                        setDetailsOpen(true);
                      }}>
                      View
                    </button>

                    <button
                      className="text-green-600 underline"
                      onClick={() => printReceipt(r)}>
                      Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {loading && (
              <tr>
                <td colSpan={9} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div>Total: {total}</div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 border rounded"
            disabled={page <= 1}
            onClick={() => load(page - 1)}>
            Prev
          </button>

          <span className="px-3 py-1 border rounded">{page}</span>

          <button
            className="px-3 py-1 border rounded"
            disabled={page * limit >= total}
            onClick={() => load(page + 1)}>
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      <OrderDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        data={selectedOrder}
        socket={socketInstance}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
