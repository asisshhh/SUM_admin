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
  const [loading, setLoading] = useState(false);

  const load = async (p = 1) => {
    setLoading(true);
    try {
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
    } catch (e) {
      console.error("Failed to load package orders", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  // ✅ ADMIN: mark pay-at-hospital payment
  const markPaid = async (row) => {
    if (!window.confirm("Mark payment as PAID?")) return;

    try {
      await api.post("/payments/mark-paid", {
        orderType: "HEALTH_PACKAGE",
        orderId: row.id,
        amount: row.totalAmount,
        method: "CASH"
      });

      alert("Payment marked as PAID");
      load(page);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark payment");
    }
  };

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
        onReset={() => {
          resetDates();
          load(1);
        }}
      />

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        onClick={() => load(1)}>
        Apply Filters
      </button>

      {loading && <div>Loading...</div>}

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3">#</th>
              <th className="p-3">User</th>
              <th className="p-3">Package</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="p-4 text-center" colSpan={7}>
                  No records found
                </td>
              </tr>
            )}

            {rows.map((r, i) => (
              <tr key={r.id} className="border-b hover:bg-slate-50">
                <td className="p-3">{(page - 1) * limit + i + 1}</td>
                <td className="p-3">{r.user?.name}</td>
                <td className="p-3">{r.package?.name}</td>
                <td className="p-3">₹ {r.totalAmount}</td>

                {/* ✅ Payment Status */}
                <td className="p-3">
                  <span
                    className={`font-semibold ${
                      r.paymentStatus === "SUCCESS"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}>
                    {r.paymentStatus || "PENDING"}
                  </span>
                </td>

                <td className="p-3">{r.status}</td>

                {/* ✅ Action */}
                <td className="p-3">
                  {r.paymentOption === "PAY_AT_HOSPITAL" &&
                    r.paymentStatus !== "SUCCESS" && (
                      <button
                        className="px-3 py-1 bg-emerald-600 text-white rounded"
                        onClick={() => markPaid(r)}>
                        Mark Paid
                      </button>
                    )}
                </td>
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
