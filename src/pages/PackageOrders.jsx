// PackageOrders.jsx — Premium Health Package Orders UI
import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useConfirm } from "../contexts/ConfirmContext";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import {
  Package,
  Calendar,
  Clock,
  Eye,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  RotateCcw
} from "lucide-react";

// Import shared components
import {
  OrderStatusBadge,
  PaymentBadge,
  OrderFilterCard,
  OrderPagination,
  OrderPageHeader,
  PackageOrderViewModal
} from "../components/orders";
import PaymentModal from "../components/health-package/PaymentModal";

const DEFAULT_LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" }
];

export default function PackageOrders() {
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
  const [paymentOrder, setPaymentOrder] = useState(null);

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
          type: "packages",
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
          console.error("Failed to load package orders", e);
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

  const onMarkPaidClick = useCallback((row) => {
    setPaymentOrder({ ...row, orderType: "HEALTH_PACKAGE" });
  }, []);

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

  const handleRefund = useCallback(
    async (order) => {
      // Find the payment with SUCCESS status and isOnline
      const payment = order.payments?.find(
        (p) =>
          p.status === "SUCCESS" &&
          p.isOnline === true &&
          p.gatewayPaymentId &&
          p.status !== "REFUNDED"
      );

      if (!payment) {
        toast.error(
          "No eligible payment found for refund. Payment must be online and successful with CCAvenue reference."
        );
        return;
      }

      const ok = await confirm({
        title: "Process Refund",
        message: `Are you sure you want to process a refund of ₹${payment.amount} for this cancelled health package order?`,
        danger: false
      });

      if (!ok) return;

      try {
        const response = await api.post(`/ccavenue/refund/${payment.id}`, {
          reason: "Health package order cancelled"
        });

        if (response.data.success) {
          toast.success("Refund processed successfully");
          await load(page);
        } else {
          toast.error(response.data.error || "Failed to process refund");
        }
      } catch (err) {
        toast.error(
          err.response?.data?.error ||
            err.response?.data?.message ||
            "Failed to process refund"
        );
      }
    },
    [confirm, load, page]
  );

  // ═══════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════

  const isShowingToday = fromDate === today && toDate === today;
  const isAllTime = !fromDate && !toDate;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <OrderPageHeader
          icon={Package}
          iconColor="emerald"
          title="Health Package Orders"
          subtitle="Manage health package bookings and payments"
          isShowingToday={isShowingToday}
          today={today}
          onRefresh={() => load(page)}
          loading={loading}
        />

        {/* Filters */}
        <OrderFilterCard
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, phone, or order number..."
          status={status}
          onStatusChange={setStatus}
          statusOptions={STATUS_OPTIONS}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          includeFuture={includeFuture}
          onIncludeFutureChange={setIncludeFuture}
          onAllTime={handleAllTime}
          onToday={handleResetFilters}
          isShowingToday={isShowingToday}
          isAllTime={isAllTime}
          rowCount={rows.length}
          total={total}
        />

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">Package Orders</h3>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <RefreshCw size={14} className="animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Package size={28} className="text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">
                          No package orders found
                        </p>
                        <p className="text-sm text-slate-400">
                          Try adjusting your filters or date range
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <PackageOrderRow
                    key={r.id}
                    order={r}
                    index={(page - 1) * limit + i + 1}
                    onMarkPaid={() => onMarkPaidClick(r)}
                    onView={() => setViewingOrder(r)}
                    onRefund={handleRefund}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {rows.length > 0 && (
          <OrderPagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={load}
          />
        )}
      </div>

      {/* View Modal */}
      {viewingOrder && (
        <PackageOrderViewModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onUpdated={() => load(page)}
        />
      )}

      {/* Payment Modal */}
      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onSuccess={() => {
            setPaymentOrder(null);
            load(page);
          }}
        />
      )}

      <ToastContainer position="top-right" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ROW COMPONENT
// ═══════════════════════════════════════════════════════════════════

function PackageOrderRow({ order, index, onMarkPaid, onView, onRefund }) {
  const r = order;

  return (
    <tr className="hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent transition-all duration-200 border-b border-slate-100 last:border-0">
      <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">#{index}</td>

      {/* Customer */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {r.user?.name?.[0] || "?"}
          </div>
          <div>
            <p className="font-medium text-slate-800">{r.user?.name || "-"}</p>
            <p className="text-xs text-slate-500">{r.user?.phone || "-"}</p>
          </div>
        </div>
      </td>

      {/* Package */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-emerald-500" />
          <div>
            <p className="font-medium text-slate-700 text-sm">
              {r.package?.name || r.packageName || "-"}
            </p>
            <p className="text-xs text-slate-500">
              {r.orderNumber || `Order #${r.id}`}
            </p>
          </div>
        </div>
      </td>

      {/* Schedule */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-sm text-slate-700">
            {r.scheduledDate?.split("T")[0] ||
              r.createdAt?.split("T")[0] ||
              "-"}
          </span>
        </div>
        {r.scheduledTime && (
          <div className="flex items-center gap-2 mt-0.5">
            <Clock size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500">{r.scheduledTime}</span>
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <OrderStatusBadge status={r.status} />
      </td>

      {/* Payment */}
      <td className="px-4 py-3.5">
        <PaymentBadge status={r.paymentStatus} amount={r.totalAmount} />
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onView();
            }}
            title="View Details">
            <Eye size={16} />
          </button>
          {r.paymentStatus !== "SUCCESS" && r.status !== "CANCELLED" && (
            <button
              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              onClick={onMarkPaid}
              title="Mark as Paid">
              <CreditCard size={16} />
            </button>
          )}
          {r.paymentStatus === "SUCCESS" && (
            <span className="p-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
            </span>
          )}
          {/* Refund button for cancelled orders with successful online payments */}
          {(() => {
            const refundablePayment = r.payments?.find(
              (p) =>
                p.status === "SUCCESS" &&
                p.isOnline === true &&
                p.gatewayPaymentId &&
                p.status !== "REFUNDED"
            );
            return (
              r.status === "CANCELLED" &&
              refundablePayment && (
                <button
                  type="button"
                  className="p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRefund?.(r);
                  }}
                  title="Process Refund">
                  <RotateCcw size={16} />
                </button>
              )
            );
          })()}
        </div>
      </td>
    </tr>
  );
}
