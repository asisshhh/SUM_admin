import React, { useEffect, useState } from "react";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import DateRangeFilter from "../components/DateRangeFilter";

const STATUS_OPTIONS = [
  "REQUESTED",
  "CONFIRMED",
  "ON_THE_WAY",
  "COMPLETED",
  "CANCELLED"
];

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

  useEffect(() => {
    load(1);
  }, []);

  // ✅ Update ambulance status
  const updateStatus = async (id, status) => {
    try {
      await api.post(`/orders/${id}/update-status?type=ambulance`, { status });
      load(page);
    } catch {
      alert("Failed to update status");
    }
  };

  // ✅ Mark Pay-at-Hospital payment
  const markPaid = async (row) => {
    if (!confirm("Confirm payment received at hospital?")) return;

    try {
      await api.post("/payments/mark-paid", {
        orderType: "AMBULANCE",
        orderId: row.id,
        amount: row.billing?.amount || 0,
        method: "CASH"
      });

      load(page);
      alert("Payment marked as PAID");
    } catch (e) {
      alert(e.response?.data?.message || "Payment update failed");
    }
  };

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
        onReset={() => resetDates()}
      />

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        onClick={() => load(1)}>
        Apply Filters
      </button>

      {loading && <div>Loading...</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">User</th>
              <th className="p-3">Pickup</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Status</th>
              {/* <th className="p-3">Payment</th>
              <th className="p-3">Actions</th> */}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center">
                  No records found
                </td>
              </tr>
            )}

            {rows.map((r, i) => (
              <tr key={r.id} className="border-b">
                <td className="p-3">{(page - 1) * limit + i + 1}</td>
                <td className="p-3">{r.user?.name || "-"}</td>
                <td className="p-3">{r.pickupAddress}</td>
                <td className="p-3">{r.destination}</td>

                {/* ✅ STATUS DROPDOWN */}
                <td className="p-3">
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    className="border rounded px-2 py-1">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>

                {/* ✅ PAYMENT STATUS */}
                {/* <td className="p-3">
                  <span
                    className={`font-semibold ${
                      r.billing?.status === "PAID"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}>
                    {r.billing?.status || "PENDING"}
                  </span>
                </td> */}

                {/* ✅ PAY AT HOSPITAL BUTTON */}
                {/* <td className="p-3">
                  {r.paymentOption === "PAY_AT_HOSPITAL" &&
                    r.billing?.status !== "PAID" && (
                      <button
                        className="px-3 py-1 bg-emerald-600 text-white rounded-lg"
                        onClick={() => markPaid(r)}>
                        Mark Paid
                      </button>
                    )}
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <div>Total: {total}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)}>
            Prev
          </button>
          <span>{page}</span>
          <button
            disabled={page * limit >= total}
            onClick={() => load(page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
