import React, { useEffect, useState, useRef } from "react";
import api from "../api/client";

// shared helpers / components (from earlier steps)
import useDateRange from "../hooks/useDateRange";
import DateRangeFilter from "../components/DateRangeFilter";
import SearchBar from "../components/SearchBar";
import StatusFilter from "../components/StatusFilter";
import OrderDetailsModal from "../components/OrderDetailsModal";
import { printReceipt } from "../components/ReceiptPrint";
import io from "socket.io-client";

/**
 * AppointmentOrders.jsx
 * Full featured appointments page:
 * - date range (with includeFuture)
 * - reset -> default to today
 * - department -> doctors interlinked
 * - search (debounced)
 * - status filter
 * - view details modal
 * - print receipt
 * - pagination
 */

const DEFAULT_LIMIT = 20;

export default function AppointmentOrders() {
  // date range hook (default today)
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

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");

  // lists
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [socketInstance, setSocketInstance] = useState(null);

  // data + paging
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  const generateFullQueue = async () => {
    if (!confirm("Generate full-day queue & tokens for all doctors?")) return;

    setGenLoading(true);

    try {
      await api.post("/appointment-queue/generate-day-queue", {
        date: filters.date
      });

      await fetchOrders();
      alert("Queue generated successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate queue");
    }

    setGenLoading(false);
  };

  // debounce refs
  const searchRef = useRef(null);

  // load departments (on mount)
  useEffect(() => {
    let mounted = true;
    api
      .get("/departments")
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setDepartments(list);
      })
      .catch((err) => {
        console.error("Failed to load departments:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // load doctors when department changes (interlinked dropdown)
  useEffect(() => {
    let mounted = true;
    if (!department) {
      setDoctors([]);
      setDoctor("");
      return;
    }
    api
      .get("/doctors", { params: { departmentId: department } })
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setDoctors(list);
      })
      .catch((err) => {
        console.error("Failed to load doctors:", err);
        setDoctors([]);
      });
    return () => {
      mounted = false;
    };
  }, [department]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const s = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token }
    });

    setSocketInstance(s);

    // Join all doctor rooms for real-time updates
    doctors?.forEach((d) => {
      const dateStr = filters.date || new Date().toISOString().split("T")[0];
      s.emit("joinDoctorRoom", { doctorId: d.id, date: dateStr });
    });

    // When queue updates anywhere, refresh orders list
    s.on("queueUpdated", () => {
      fetchOrders();
    });

    return () => s.disconnect();
  }, [doctors]);

  const handleUpdated = async () => {
    const fresh = await fetchOrders();
    const updatedRow = fresh.find((x) => x.id === selectedOrder?.id);
    if (updatedRow) setSelectedOrder(updatedRow);
  };

  // core loader
  const load = async (p = 1) => {
    setLoading(true);
    setError("");
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

      // support different response shapes: { data: [...], total, page } OR { success: true, data: {...} } OR pure array
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const totalCount =
        res.data?.total ??
        res.data?.count ??
        (Array.isArray(res.data) ? res.data.length : 0);
      const currentPage = res.data?.page ?? p;

      setRows(data);
      setTotal(totalCount);
      setPage(currentPage);
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setError(err?.response?.data?.error || err.message || "Failed to load");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search: trigger load when search changes after 500ms
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      load(1);
    }, 500);

    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // optional: auto load when status or date range or department or doctor changed?
  // We keep Apply Filters button as main trigger, but it's useful to auto-load when includeFuture toggled or dates changed:
  useEffect(() => {
    // when includeFuture toggled or date changed, do NOT auto-fire if user is editing values actively.
    // Keep it simple: auto reload when includeFuture toggles.
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeFuture]);

  // reset all filters to defaults (today)
  const handleResetAll = () => {
    setSearch("");
    setStatus("");
    setDepartment("");
    setDoctor("");
    resetDates(); // resets date filters to today + includeFuture=false
    load(1);
  };

  // view details action
  const handleView = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  // print action
  const handlePrint = (order) => {
    // optionally transform order into receipt-friendly object
    printReceipt(order);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">Appointments</h3>
          <p className="text-sm text-slate-500 mt-1">
            Manage appointment bookings — search, filter, view details & print
            receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow"
            onClick={generateFullQueue}
            disabled={genLoading}>
            {genLoading ? "Generating..." : "Generate Today's Queue"}
          </button>

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            onClick={async () => {
              if (!confirm("Generate missing tokens for the day?")) return;
              await api.post("/admin/generate-missing-tokens", {
                date: filters.date
              });
              await fetchOrders();
              alert("Missing tokens generated!");
            }}>
            Generate Missing Tokens
          </button>
          <button
            className="px-4 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700"
            onClick={async () => {
              if (!confirm("Reassign queue for all doctors?")) return;
              await api.post("/admin/reassign-queue", { date: filters.date });
              await fetchOrders();
              alert("Queue reassigned successfully!");
            }}>
            Reassign Queue
          </button>

          <button
            className="px-3 py-1 border rounded hover:bg-slate-50"
            onClick={() => load(1)}
            disabled={loading}>
            Refresh
          </button>

          <button
            className="px-3 py-1 bg-red-50 text-red-600 border rounded hover:bg-red-100"
            onClick={handleResetAll}>
            Reset All
          </button>
        </div>
      </div>

      {/* Filters Row: Search + Status + Date range */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="col-span-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search patient name / phone / order id"
          />
        </div>

        <div className="col-span-1">
          <StatusFilter value={status} onChange={setStatus} />
        </div>

        <div className="col-span-1">
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            includeFuture={includeFuture}
            setFromDate={setFromDate}
            setToDate={setToDate}
            setIncludeFuture={setIncludeFuture}
            onReset={() => {
              resetDates();
              // optionally reload immediately after resetting dates
              // load(1);
            }}
          />
        </div>
      </div>

      {/* Secondary Filters (Dept + Doctor + Apply) */}
      <div className="grid md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-sm text-slate-600">Department</label>
          <select
            className="w-full border p-2 rounded-lg"
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
          <label className="text-sm text-slate-600">Doctor</label>
          <select
            className="w-full border p-2 rounded-lg"
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            disabled={!department}>
            <option value="">All</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.user?.name || doc.id}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex gap-3">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            onClick={() => load(1)}
            disabled={loading}>
            Apply Filters
          </button>

          <button
            className="px-4 py-2 border rounded-lg"
            onClick={handleResetAll}>
            Reset All Filters
          </button>

          <div className="ml-auto text-sm text-slate-500 flex items-center gap-3">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>
                Showing {rows.length} of {total}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
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
              <th className="p-3 text-sm">Actions</th>
            </tr>
          </thead>

          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-4" colSpan={9}>
                  No records found
                </td>
              </tr>
            )}

            {rows.map((r, i) => (
              <tr key={r.id} className="border-b hover:bg-slate-50">
                <td className="p-3 text-sm">{(page - 1) * limit + i + 1}</td>
                <td className="p-3 text-sm">
                  {r.patient?.name || r.user?.name || "-"}
                </td>
                <td className="p-3 text-sm">
                  {r.patient?.phone || r.user?.phone || r.contactNumber || "-"}
                </td>
                <td className="p-3 text-sm">{r.doctor?.user?.name || "-"}</td>
                <td className="p-3 text-sm">{r.department?.name || "-"}</td>
                <td className="p-3 text-sm">
                  {r.date ? r.date.split("T")[0] : "-"}
                </td>
                <td className="p-3 text-sm">
                  {r.timeSlot || r.tokenNumber || "-"}
                </td>
                <td className="p-3 text-sm">{r.status}</td>
                <td className="p-3 text-sm">
                  <div className="flex gap-3 items-center">
                    <button
                      className="text-blue-600 underline"
                      onClick={() => handleView(r)}>
                      View
                    </button>

                    <button
                      className="text-green-600 underline"
                      onClick={() => handlePrint(r)}>
                      Print
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {loading && (
              <tr>
                <td className="p-4" colSpan={9}>
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-600">Total: {total}</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => {
              if (page > 1) load(page - 1);
            }}
            disabled={page <= 1}>
            Prev
          </button>

          <div className="px-3 py-1 border rounded">{page}</div>

          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => {
              if (page * limit < total) load(page + 1);
            }}
            disabled={page * limit >= total}>
            Next
          </button>
        </div>
      </div>

      {/* Details Modal */}
      <OrderDetailsModal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        data={selectedOrder}
        socket={socketInstance}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
