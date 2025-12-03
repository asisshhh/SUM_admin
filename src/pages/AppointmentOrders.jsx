// AppointmentOrders.jsx — Premium Filters & Header UI (Soft Modern Clinic)
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
  // date range hook
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

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");

  // dropdown data
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // table data + pagination
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // generate queue loading
  const [genLoading, setGenLoading] = useState(false);

  // socket instance
  const [socketInstance, setSocketInstance] = useState(null);

  // fetch loader
  const fetchOrders = async () => load(page);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced search + run when filter changes
  const searchRef = useRef(null);
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(1), 420);
    return () => clearTimeout(searchRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, department, doctor, fromDate, toDate, includeFuture]);

  // load departments
  useEffect(() => {
    api
      .get("/departments")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDepartments(list);
      })
      .catch((err) => console.error("DEPT LOAD ERROR:", err));
  }, []);

  // load doctors for a department
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

  // socket connection (keeps parent table in sync)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const s = io(import.meta.env.VITE_SOCKET_URL, { auth: { token } });
    setSocketInstance(s);

    const refresh = () => load(1);
    s.on("queueUpdatedForAllDoctors", refresh);
    s.on("queueUpdated", refresh);

    return () => s.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handle modal update: refresh table + keep selected order updated
  const handleUpdated = async () => {
    const fresh = await fetchOrders();
    const updatedRow = fresh.find((x) => x.id === selectedOrder?.id);
    if (updatedRow) setSelectedOrder(updatedRow);
  };

  // generate full queue
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

  // reset filters
  const handleResetAll = () => {
    setSearch("");
    setStatus("");
    setDepartment("");
    setDoctor("");
    resetDates();
    load(1);
  };

  // compact helper for table rows render
  const renderRows = () =>
    rows.map((r, i) => (
      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
        <td className="p-3 text-sm">{(page - 1) * limit + i + 1}</td>
        <td className="p-3 text-sm font-medium">{r.patient?.name}</td>
        <td className="p-3 text-sm">{r.patient?.phone}</td>
        <td className="p-3 text-sm">{r.doctor?.user?.name}</td>
        <td className="p-3 text-sm">{r.department?.name}</td>
        <td className="p-3 text-sm">{r.date?.split("T")[0]}</td>
        <td className="p-3 text-sm">{r.timeSlot}</td>
        <td className="p-3 text-sm">{r.status}</td>
        <td className="p-3 text-sm font-medium">
          <span
            className={`px-2 py-1 rounded-md text-xs font-semibold
      ${
        r.paymentStatus === "SUCCESS"
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}>
            ₹{" "}
            {r.paymentAmount ??
              r.payments?.[0]?.amount ??
              r.billing?.amount ??
              r.doctor?.consultationFee ??
              "-"}
          </span>
        </td>

        <td className="p-3 text-sm">
          {r.doctorId ? (
            <div className="flex gap-2">
              <a
                href={`/doctor/queue-monitor/${r.doctorId}`}
                target="_blank"
                rel="noreferrer"
                className="text-purple-600 underline">
                Monitor
              </a>
              <a
                href={`/doctor/actions/${r.doctorId}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline">
                Actions
              </a>
              {/* <a
                href={`/widgets/token/${r.doctorId}`}
                target="_blank"
                rel="noreferrer"
                className="text-green-600 underline">
                Token
              </a> */}
            </div>
          ) : (
            "-"
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
    ));

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg space-y-6">
      {/* HEADER + big CTAs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-2xl font-semibold">Appointments</h3>
          <p className="text-sm text-slate-500 mt-1">
            Manage appointments, view details, print receipts & manage queue.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            className="px-6 py-3 bg-purple-600 text-white rounded-xl shadow hover:bg-purple-700 transition"
            onClick={generateFullQueue}
            disabled={genLoading}>
            {genLoading ? "Generating..." : "Generate Today's Queue"}
          </button>

          {/* <button
            className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
            onClick={async () => {
              if (!confirm("Generate missing tokens?")) return;
              await api.post("/appointment-queue/generate-missing-tokens", {
                date: today
              });
              load(1);
            }}>
            Missing Tokens
          </button> */}

          {/* <button
            className="px-6 py-3 bg-orange-600 text-white rounded-xl shadow hover:bg-orange-700 transition"
            onClick={async () => {
              if (!confirm("Reassign queue for all doctors?")) return;
              await api.post("/appointment-queue/reassign-queue", {
                date: today
              });
              load(1);
            }}>
            Reassign Queue
          </button> */}

          <button
            className="px-4 py-2 border rounded-lg hover:bg-slate-50"
            onClick={() => load(page)}>
            Refresh
          </button>
          <button
            className="px-4 py-2 bg-red-50 text-red-700 border rounded-lg hover:bg-red-100"
            onClick={handleResetAll}>
            Reset All
          </button>
        </div>
      </div>

      {/* PREMIUM FILTER BAR */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Search */}
        <div className="xl:col-span-5">
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm h-full flex items-center">
            <div className="w-full">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search patient, phone or appointment id..."
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="xl:col-span-3">
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm h-full">
            <label className="block text-sm text-slate-600 mb-2 font-medium">
              Status
            </label>
            <StatusFilter value={status} onChange={(v) => setStatus(v)} />
          </div>
        </div>

        {/* Date Filter */}
        <div className="xl:col-span-4">
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm h-full">
            <label className="block text-sm text-slate-600 font-medium mb-3">
              Date Range
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full mt-1 border rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full mt-1 border rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={includeFuture}
                onChange={(e) => setIncludeFuture(e.target.checked)}
              />
              <span className="text-sm text-slate-600">
                Include future dates
              </span>
            </div>

            <button
              className="mt-4 px-4 py-2 border rounded-lg text-sm hover:bg-slate-50"
              onClick={() => {
                resetDates();
                load(1);
              }}>
              Reset Date Filter
            </button>
          </div>
        </div>
      </div>

      {/* SECOND ROW: Department / Doctor / Actions */}
      <div className="mt-6 grid md:grid-cols-4 gap-4 items-end">
        {/* Department */}
        <div>
          <label className="text-sm text-slate-700 font-medium">
            Department
          </label>
          <select
            className="w-full border p-3 rounded-xl mt-2 bg-white"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setDoctor("");
            }}>
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Doctor */}
        <div>
          <label className="text-sm text-slate-700 font-medium">Doctor</label>
          <select
            className="w-full border p-3 rounded-xl mt-2 bg-white"
            value={doctor}
            disabled={!department}
            onChange={(e) => setDoctor(e.target.value)}>
            <option value="">All</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.user?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Apply / Reset */}
        <div className="md:col-span-2 flex gap-3 items-center">
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition"
            onClick={() => load(1)}>
            Apply
          </button>

          <button
            className="px-5 py-3 border rounded-xl hover:bg-slate-50"
            onClick={handleResetAll}>
            Reset
          </button>

          <div className="ml-auto text-sm text-slate-500">
            Showing <strong>{rows.length}</strong> of <strong>{total}</strong>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <table className="w-full text-left divide-y">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-sm">#</th>
              <th className="p-3 text-sm">Patient</th>
              <th className="p-3 text-sm">Phone</th>
              <th className="p-3 text-sm">Doctor</th>
              <th className="p-3 text-sm">Department</th>
              <th className="p-3 text-sm">Date</th>
              <th className="p-3 text-sm">Slot</th>
              <th className="p-3 text-sm">Status</th>
              <th className="p-3 text-sm">Amount</th>
              <th className="p-3 text-sm">Queue</th>
              <th className="p-3 text-sm">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white">
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-500">
                  No records found
                </td>
              </tr>
            )}

            {renderRows()}

            {loading && (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-500">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Total: <strong>{total}</strong>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 border rounded-lg"
            disabled={page <= 1}
            onClick={() => load(page - 1)}>
            Prev
          </button>
          <span className="px-3 py-1 border rounded-lg">{page}</span>
          <button
            className="px-3 py-1 border rounded-lg"
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
