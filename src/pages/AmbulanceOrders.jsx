import React, { useEffect, useState } from "react";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import DateRangeFilter from "../components/DateRangeFilter";

export default function AmbulanceOrders() {
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

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/orders", {
        params: {
          type: "ambulance",
          page: p,
          limit,
          ...buildDateParams()
        }
      });
      setRows(res.data.data || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => load(1), []);

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-6">
      <h3 className="text-xl font-semibold">Ambulance Bookings</h3>

      <DateRangeFilter
        fromDate={fromDate}
        toDate={toDate}
        includeFuture={includeFuture}
        setFromDate={setFromDate}
        setToDate={setToDate}
        setIncludeFuture={setIncludeFuture}
        onReset={resetDates}
      />

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        onClick={() => load(1)}>
        Apply Filters
      </button>

      {loading ? <div>Loading...</div> : null}

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3">#</th>
              <th className="p-3">User</th>
              <th className="p-3">Pickup</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-4" colSpan={5}>
                  No records found
                </td>
              </tr>
            )}

            {rows.map((r, i) => (
              <tr key={r.id} className="border-b hover:bg-slate-50">
                <td className="p-3">{(page - 1) * limit + i + 1}</td>
                <td className="p-3">{r.user?.name || r.patientName || "-"}</td>
                <td className="p-3">{r.pickupAddress}</td>
                <td className="p-3">{r.destination}</td>
                <td className="p-3">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <div>Total: {total}</div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            className="border px-3 py-1 rounded"
            onClick={() => load(page - 1)}>
            Prev
          </button>
          <div className="px-3 py-1 border rounded">{page}</div>
          <button
            disabled={page * limit >= total}
            className="border px-3 py-1 rounded"
            onClick={() => load(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
