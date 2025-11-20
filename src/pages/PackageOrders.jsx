import React, { useEffect, useState } from "react";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import DateRangeFilter from "../components/DateRangeFilter";

export default function PackageOrders() {
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

  const load = async (p = 1) => {
    const res = await api.get("/orders", {
      params: {
        type: "packages",
        page: p,
        limit,
        ...buildDateParams()
      }
    });

    setRows(res.data.data || []);
    setTotal(res.data.total || 0);
    setPage(res.data.page || p);
  };

  useEffect(() => load(1), []);

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-6">
      <h3 className="text-xl font-semibold">Health Package Orders</h3>

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

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3">#</th>
              <th className="p-3">User</th>
              <th className="p-3">Package</th>
              <th className="p-3">Amount</th>
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
                <td className="p-3">{r.user?.name}</td>
                <td className="p-3">{r.package?.name}</td>
                <td className="p-3">₹{r.totalAmount}</td>
                <td className="p-3">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
