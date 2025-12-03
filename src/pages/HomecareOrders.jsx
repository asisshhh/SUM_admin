import React, { useEffect, useState } from "react";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import DateRangeFilter from "../components/DateRangeFilter";

export default function HomecareOrders() {
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
        type: "homecare",
        page: p,
        limit,
        ...buildDateParams()
      }
    });

    setRows(res.data.data || []);
    setTotal(res.data.total || 0);
    setPage(res.data.page || p);
  };

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        await load(1);
      } catch (e) {
        console.error(e);
      }
    };

    init();

    return () => {
      active = false; // safe cleanup
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-6">
      <h3 className="text-xl font-semibold">Home Healthcare & Physiotherapy</h3>

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
              <th className="p-3">Service</th>
              <th className="p-3">Date</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
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
                <td className="p-3">{r.user?.name || "-"}</td>
                <td className="p-3">{r.service?.name || r.serviceType}</td>
                <td className="p-3">{r.scheduledDate?.split("T")[0]}</td>

                <td className="p-3">
                  ₹{r.paymentAmount || r.billing?.amount || "-"}
                </td>

                <td className="p-3">
                  <span
                    className={`font-semibold ${
                      r.paymentStatus === "PAID"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}>
                    {r.paymentStatus || "PENDING"}
                  </span>
                </td>

                <td className="p-3">{r.status}</td>

                <td className="p-3">
                  {r.paymentOption === "PAY_AT_HOSPITAL" &&
                    r.paymentStatus !== "PAID" && (
                      <button
                        className="text-emerald-600 underline"
                        onClick={() =>
                          api
                            .post("/payments/mark-paid", {
                              orderType: "HOMECARE",
                              orderId: r.id,
                              amount: r.paymentAmount || r.billing?.amount
                            })
                            .then(() => load(page))
                        }>
                        Mark Paid
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
