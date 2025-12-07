import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useConfirm } from "../contexts/ConfirmContext";
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
  // track in-flight requests so we can cancel stale ones
  const currentController = useRef(null);

  const load = useCallback(
    async (p = 1) => {
      // cancel previous request if any
      if (currentController.current) {
        try {
          currentController.current.abort();
        } catch (_) {}
      }

      const controller = new AbortController();
      currentController.current = controller;

      setLoading(true);
      try {
        const params = {
          type: "packages",
          page: p,
          limit,
          from: fromDate || undefined,
          to: toDate || undefined,
          includeFuture: includeFuture || undefined
        };

        const res = await api.get("/orders", {
          params,
          signal: controller.signal
        });

        // Ensure the response is from the latest request
        if (controller.signal.aborted) return;

        setRows(res.data.data || []);
        setTotal(res.data.total || 0);
        setPage(res.data.page || p);
      } catch (e) {
        if (e.name === "CanceledError" || e.name === "AbortError") {
          // request was cancelled; ignore
        } else {
          console.error("Failed to load package orders", e);
        }
      } finally {
        // only clear loading if this controller is still current
        if (currentController.current === controller) {
          setLoading(false);
          currentController.current = null;
        }
      }
    },
    [limit, fromDate, toDate, includeFuture]
  );

  useEffect(() => {
    load(1);
  }, []);

  // ✅ ADMIN: mark pay-at-hospital payment
  const markPaid = useCallback(
    async (row) => {
      try {
        await api.post("/payments/mark-paid", {
          orderType: "HEALTH_PACKAGE",
          orderId: row.id,
          amount: row.totalAmount,
          method: "CASH"
        });

        toast.success("Payment marked as PAID");
        // reload current page
        load(page);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to mark payment");
      }
    },
    [load, page]
  );

  const confirm = useConfirm();

  const onMarkPaidClick = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Confirm action",
        message: `Mark payment for ${row.user?.name || "this user"} as PAID?`
      });
      if (!ok) return;
      await markPaid(row);
    },
    [confirm, markPaid]
  );

  // cleanup on unmount: cancel any pending request
  useEffect(() => {
    return () => {
      if (currentController.current) {
        try {
          currentController.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // memoized Row to avoid re-renders when unrelated state changes
  const Row = memo(function Row({ r, index, page, limit, onMarkPaid }) {
    return (
      <tr className="border-b hover:bg-slate-50">
        <td className="p-3">{(page - 1) * limit + index + 1}</td>
        <td className="p-3">{r.user?.name}</td>
        <td className="p-3">{r.package?.name}</td>
        <td className="p-3">₹ {r.totalAmount}</td>

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

        <td className="p-3">
          {r.paymentStatus !== "SUCCESS" && (
            <button
              className="px-3 py-1 bg-emerald-600 text-white rounded"
              onClick={() => onMarkPaid(r)}>
              Mark Paid
            </button>
          )}
        </td>
      </tr>
    );
  });

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
              <Row
                key={r.id}
                r={r}
                index={i}
                page={page}
                limit={limit}
                onMarkPaid={onMarkPaidClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Toasts */}
      <ToastContainer position="top-right" />

      {/* Confirm handled by ConfirmProvider via useConfirm() */}

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
