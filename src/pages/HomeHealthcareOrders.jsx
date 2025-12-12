// HomeHealthcareOrders.jsx — Home Healthcare Orders UI
import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useConfirm } from "../contexts/ConfirmContext";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import {
  Home,
  Calendar,
  Clock,
  Eye,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Package
} from "lucide-react";

// Import shared components
import {
  OrderStatusBadge,
  PaymentBadge,
  OrderFilterCard,
  OrderPagination,
  OrderPageHeader
} from "../components/orders";

const DEFAULT_LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" }
];

export default function HomeHealthcareOrders() {
  // ═══════════════════════════════════════════════════════════════════
  // HOOKS & STATE
  // ═══════════════════════════════════════════════════════════════════

  const {
    fromDate,
    toDate,
    includeFuture,
    setFromDate,
    setToDate,
    setIncludeFuture,
    buildDateParams,
    resetDates,
    clearDates,
    today
  } = useDateRange();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  const currentController = useRef(null);
  const confirm = useConfirm();

  // ═══════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════

  const load = useCallback(
    async (p = 1) => {
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
          type: "homecare",
          orderType: "packages", // Only packages
          page: p,
          limit,
          search: search || undefined,
          status: status || undefined,
          ...buildDateParams()
        };

        const res = await api.get("/orders", {
          params,
          signal: controller.signal
        });

        if (controller.signal.aborted) return;

        setRows(res.data.data || []);
        setTotal(res.data.total || 0);
        setPage(res.data.page || p);
      } catch (e) {
        if (e.name !== "CanceledError" && e.name !== "AbortError") {
          console.error("Failed to load home healthcare orders", e);
          toast.error("Failed to load orders");
        }
      } finally {
        if (currentController.current === controller) {
          setLoading(false);
          currentController.current = null;
        }
      }
    },
    [limit, search, status, buildDateParams]
  );

  // ═══════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    load(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced filter changes
  const searchRef = useRef(null);
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(1), 420);
    return () => clearTimeout(searchRef.current);
  }, [search, status, fromDate, toDate, includeFuture]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (currentController.current) {
        try {
          currentController.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  const markPaid = useCallback(
    async (row) => {
      try {
        await api.post("/payments/mark-paid", {
          orderType: "HOME_HEALTHCARE_PACKAGE",
          orderId: row.id,
          amount: row.totalAmount || 0,
          method: "CASH"
        });
        toast.success("Payment marked as PAID");
        load(page);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to mark payment");
      }
    },
    [load, page]
  );

  const onMarkPaidClick = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Confirm Payment",
        message: `Mark payment for ${row.user?.name || "this user"} as PAID?`
      });
      if (!ok) return;
      await markPaid(row);
    },
    [confirm, markPaid]
  );

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    resetDates();
    load(1);
  };

  const handleAllTime = () => {
    clearDates();
    setTimeout(() => load(1), 100);
  };

  const handleViewOrder = async (row) => {
    try {
      const res = await api.get(`/orders/${row.id}`, {
        params: { type: "homecare", orderType: "packages" }
      });
      setViewingOrder(res.data.data);
    } catch (err) {
      toast.error("Failed to load order details");
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════

  const isShowingToday = fromDate === today && toDate === today;
  const isAllTime = !fromDate && !toDate;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <OrderPageHeader
        title="Home Healthcare Orders"
        icon={Home}
        subtitle="Package orders management"
      />

      {/* Filters */}
      <OrderFilterCard
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        statusOptions={STATUS_OPTIONS}
        fromDate={fromDate}
        toDate={toDate}
        includeFuture={includeFuture}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onIncludeFutureChange={setIncludeFuture}
        onReset={handleResetFilters}
        onAllTime={handleAllTime}
        isShowingToday={isShowingToday}
        isAllTime={isAllTime}
      />

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
            <p className="text-slate-500">Loading orders...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Home className="mx-auto mb-2 text-slate-300" size={40} />
            <p>No orders found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3 text-left font-semibold">Order #</th>
                    <th className="p-3 text-left font-semibold">User</th>
                    <th className="p-3 text-left font-semibold">Package</th>
                    <th className="p-3 text-left font-semibold">Patient</th>
                    <th className="p-3 text-left font-semibold">Date</th>
                    <th className="p-3 text-left font-semibold">Time</th>
                    <th className="p-3 text-left font-semibold">Amount</th>
                    <th className="p-3 text-center font-semibold">Payment</th>
                    <th className="p-3 text-center font-semibold">Status</th>
                    <th className="p-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} className="border-b hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-mono text-xs">
                          {row.orderNumber || `HHS${row.id}`}
                        </span>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">
                            {row.user?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.user?.phone || ""}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">
                            {row.packageName || row.package?.name || "-"}
                          </div>
                          {row.serviceCount && (
                            <div className="text-xs text-slate-500">
                              {row.serviceCount} services
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">
                            {row.patient?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.patient?.relation || ""}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {row.scheduledDate
                          ? new Date(row.scheduledDate).toLocaleDateString(
                              "en-IN"
                            )
                          : "-"}
                      </td>
                      <td className="p-3">
                        {row.scheduledTime || row.timeSlot || "-"}
                      </td>
                      <td className="p-3 font-semibold">
                        ₹{row.totalAmount || 0}
                      </td>
                      <td className="p-3 text-center">
                        <PaymentBadge
                          status={row.paymentStatus || "PENDING"}
                          option={row.paymentOption}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <OrderStatusBadge status={row.status} />
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <button
                            className="p-2 hover:bg-blue-50 rounded-lg transition"
                            onClick={() => handleViewOrder(row)}
                            title="View Details">
                            <Eye size={16} className="text-blue-500" />
                          </button>
                          {row.paymentOption === "PAY_AT_HOSPITAL" &&
                            row.paymentStatus !== "SUCCESS" && (
                              <button
                                className="p-2 hover:bg-green-50 rounded-lg transition"
                                onClick={() => onMarkPaidClick(row)}
                                title="Mark Paid">
                                <CheckCircle2
                                  size={16}
                                  className="text-green-500"
                                />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <OrderPagination
              page={page}
              total={total}
              limit={limit}
              onPageChange={(p) => {
                setPage(p);
                load(p);
              }}
            />
          </>
        )}
      </div>

      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">Order Details</h3>
              <button
                onClick={() => setViewingOrder(null)}
                className="text-slate-500 hover:text-slate-700">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Order Number</p>
                  <p className="font-semibold">
                    {viewingOrder.orderNumber || `HHS${viewingOrder.id}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <OrderStatusBadge status={viewingOrder.status} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="font-semibold">
                    ₹{viewingOrder.totalAmount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Payment Status</p>
                  <PaymentBadge
                    status={viewingOrder.paymentStatus || "PENDING"}
                    option={viewingOrder.paymentOption}
                  />
                </div>
              </div>
              {viewingOrder.notes && (
                <div>
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="text-slate-700">{viewingOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
