// LabOrders.jsx — Premium Lab Test Orders UI
import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useConfirm } from "../contexts/ConfirmContext";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import {
  FlaskConical,
  Calendar,
  Clock,
  Eye,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  FileText,
  Settings,
  ChevronDown,
  RotateCcw
} from "lucide-react";

// Import shared components
import {
  OrderStatusBadge,
  PaymentBadge,
  OrderFilterCard,
  OrderPageHeader,
  LabOrderViewModal
} from "../components/orders";
import Pagination from "../components/appointments/Pagination";
import PaymentModal from "../components/health-package/PaymentModal";

const DEFAULT_LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Order Confirmed" },
  { value: "SAMPLE_COLLECTED", label: "Sample Collected" },
  { value: "PROCESSING", label: "Test in Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" }
];

// Valid status transitions for lab test orders
// Note: LabTestOrder uses OrderStatus enum
// Valid values: PENDING, CONFIRMED, SAMPLE_COLLECTED, PROCESSING, PAYMENT_COMPLETED, PAY_AT_HOSPITAL, COMPLETED, CANCELLED
// User-friendly workflow: PENDING → CONFIRMED → SAMPLE_COLLECTED → PROCESSING → COMPLETED
// CANCELLED can only be set from PENDING or CONFIRMED (before sample is collected)
const STATUS_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SAMPLE_COLLECTED", "COMPLETED", "CANCELLED"],
  SAMPLE_COLLECTED: ["PROCESSING", "COMPLETED"],
  PROCESSING: ["COMPLETED"],
  PAYMENT_COMPLETED: [
    "CONFIRMED",
    "SAMPLE_COLLECTED",
    "PROCESSING",
    "COMPLETED"
  ],
  PAY_AT_HOSPITAL: ["CONFIRMED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED"],
  COMPLETED: [], // No transitions from COMPLETED
  CANCELLED: [] // No transitions from CANCELLED
};

// User-friendly status labels
const STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Order Confirmed",
  SAMPLE_COLLECTED: "Sample Collected",
  PROCESSING: "Test in Progress",
  PAYMENT_COMPLETED: "Payment Completed",
  PAY_AT_HOSPITAL: "Pay at Hospital",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

export default function LabOrders() {
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
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);

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
          type: "lab",
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
          console.error("Failed to load lab orders", e);
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

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.post(`/orders/${orderId}/update-status?type=lab`, {
        status: newStatus
      });
      toast.success(
        `Status updated to ${STATUS_LABELS[newStatus] || newStatus}`
      );
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    }
  };

  const handleRefund = useCallback(
    async (order) => {
      // Find the payment with SUCCESS status and isOnline
      const payment = order.payments?.find(
        (p) =>
          p.status === "SUCCESS" &&
          (p.isOnline === true || p.isOnline === "true" || p.isOnline === 1) &&
          p.gatewayPaymentId &&
          !p.refundedAt
      );

      if (!payment) {
        toast.error(
          "No eligible payment found for refund. Payment must be online and successful with CCAvenue reference."
        );
        return;
      }

      const ok = await confirm({
        title: "Process Refund",
        message: `Are you sure you want to process a refund of ₹${payment.amount} for this cancelled lab test order?`,
        danger: false
      });

      if (!ok) return;

      try {
        const response = await api.post(`/ccavenue/refund/${payment.id}`, {
          reason: "Lab test order cancelled"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <OrderPageHeader
          icon={FlaskConical}
          iconColor="blue"
          title="Lab Test Orders"
          subtitle="Manage lab test bookings and reports"
          isShowingToday={isShowingToday}
          today={today}
          onRefresh={() => load(page)}
          loading={loading}
        />

        {/* Filters */}
        <OrderFilterCard
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by patient name, phone, or test..."
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
              <h3 className="font-semibold text-slate-700">Lab Test Records</h3>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <RefreshCw size={14} className="animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto" style={{ position: "relative" }}>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Test Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
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
                          <FlaskConical size={28} className="text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">
                          No lab test orders found
                        </p>
                        <p className="text-sm text-slate-400">
                          Try adjusting your filters or date range
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <LabOrderRow
                    key={r.id}
                    order={r}
                    onView={() => setViewingOrder(r)}
                    onMarkPaid={() =>
                      setPaymentOrder({ ...r, orderType: "LAB_TEST" })
                    }
                    onRefund={handleRefund}
                    onStatusChange={handleStatusChange}
                    statusDropdownOpen={statusDropdownOpen}
                    setStatusDropdownOpen={setStatusDropdownOpen}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination - Match appointment orders design */}
        {rows.length > 0 && (
          <Pagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={load}
          />
        )}
      </div>

      {/* View Modal */}
      {viewingOrder && (
        <LabOrderViewModal
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

function LabOrderRow({
  order,
  onView,
  onMarkPaid,
  onRefund,
  onStatusChange,
  statusDropdownOpen,
  setStatusDropdownOpen
}) {
  const r = order;
  const confirm = useConfirm();
  const dropdownRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const [dropdownPosition, setDropdownPosition] = React.useState({
    top: 0,
    left: 0,
    position: "below" // "above" or "below"
  });

  // Calculate and update dropdown position
  const updateDropdownPosition = React.useCallback(() => {
    if (!buttonRef.current || statusDropdownOpen !== r.id) return;

    requestAnimationFrame(() => {
      if (!buttonRef.current) return;

      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 180;
      // Use a more conservative height estimate - actual height will be adjusted after render
      const estimatedHeight = 150;
      const gap = 4;

      // Calculate space
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // Decide position: above if not enough space below AND more space above
      const positionAbove =
        spaceBelow < estimatedHeight + gap && spaceAbove > spaceBelow;

      // Horizontal: position dropdown slightly to the right of button
      // Align left edge of dropdown with left edge of button, then shift right a bit
      let left = buttonRect.left + 8; // Shift 8px to the right from button's left edge

      // If would overflow on right, align right edge of dropdown with right edge of button
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = buttonRect.right - dropdownWidth;
      }

      // If still not enough space, position to the left of button
      if (left < 10) {
        left = buttonRect.left - dropdownWidth - gap;
      }

      // Ensure it stays within viewport
      if (left < 10) left = 10;
      if (left + dropdownWidth > window.innerWidth - 10) {
        left = window.innerWidth - dropdownWidth - 10;
      }

      // Vertical position - ensure dropdown is directly adjacent to button
      let top;
      if (positionAbove) {
        // Position directly above the button
        // We'll calculate actual height after render, but use a reasonable estimate
        top = buttonRect.top - estimatedHeight - gap;
        // Don't let it go above viewport, but keep it close to button
        if (top < 10) {
          // If not enough space above, position below instead
          top = buttonRect.bottom + gap;
          setDropdownPosition({ top, left, position: "below" });
          return;
        }
      } else {
        // Position directly below the button
        top = buttonRect.bottom + gap;
        // If would overflow below, try above
        if (top + estimatedHeight > window.innerHeight - 10) {
          const aboveTop = buttonRect.top - estimatedHeight - gap;
          if (aboveTop >= 10) {
            top = aboveTop;
            setDropdownPosition({ top, left, position: "above" });
            return;
          } else {
            // If can't fit above either, position as close as possible
            top = Math.max(10, window.innerHeight - estimatedHeight - 10);
          }
        }
      }

      setDropdownPosition({
        top,
        left,
        position: positionAbove ? "above" : "below"
      });
    });
  }, [statusDropdownOpen, r.id]);

  // Update position when dropdown opens
  React.useEffect(() => {
    if (statusDropdownOpen === r.id) {
      updateDropdownPosition();
    }
  }, [statusDropdownOpen, r.id, updateDropdownPosition]);

  // Recalculate on scroll/resize
  React.useEffect(() => {
    if (statusDropdownOpen === r.id) {
      window.addEventListener("resize", updateDropdownPosition);
      window.addEventListener("scroll", updateDropdownPosition, true);
      return () => {
        window.removeEventListener("resize", updateDropdownPosition);
        window.removeEventListener("scroll", updateDropdownPosition, true);
      };
    }
  }, [statusDropdownOpen, r.id, updateDropdownPosition]);

  // Show both patient (relative) name and user (account owner) name
  const patientName = r.patient?.name || "-"; // Patient/Relative name
  const userName = r.user?.name || "-"; // Account owner (parent user) name
  // For avatar, use patient name if available, otherwise user name
  const displayName = patientName !== "-" ? patientName : userName;
  const testName =
    r.testName || r.items?.map((i) => i.testName).join(", ") || "-";

  return (
    <tr className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all duration-200 border-b border-slate-100 last:border-0">
      <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">#{r.id}</td>

      {/* Patient */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {displayName && displayName !== "-" ? displayName[0] : "?"}
          </div>
          <div>
            <p className="font-medium text-slate-800">{patientName}</p>
            <p className="text-xs text-slate-500">{userName}</p>
          </div>
        </div>
      </td>

      {/* Test Details */}
      <td className="px-4 py-3.5">
        <div className="flex items-start gap-2">
          <FlaskConical size={16} className="text-blue-500 mt-0.5" />
          <div>
            <p className="font-medium text-slate-700 text-sm max-w-[200px] truncate">
              {testName}
            </p>
            {r.orderNumber && (
              <p className="text-xs text-slate-500">{r.orderNumber}</p>
            )}
            {r.appointment?.doctor?.user?.name && (
              <p className="text-xs text-slate-500">
                Dr. {r.appointment.doctor.user.name}
              </p>
            )}
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

      {/* Payment */}
      <td className="px-4 py-3.5 text-center">
        <div className="flex justify-center">
          <PaymentBadge
            status={r.paymentStatus || "PENDING"}
            amount={r.paymentAmount || r.totalAmount || 0}
          />
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5 text-center">
        <div className="flex justify-center">
          <OrderStatusBadge status={r.status} />
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 justify-center">
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
          {/* Mark as Paid button - only show for orders that can be marked as paid and not cancelled */}
          {r.paymentStatus !== "SUCCESS" && r.status !== "CANCELLED" && (
            <button
              type="button"
              className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkPaid();
              }}
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
            // Ensure payments is an array
            const payments = Array.isArray(r.payments) ? r.payments : [];

            const refundablePayment = payments.find(
              (p) =>
                p &&
                p.status === "SUCCESS" &&
                (p.isOnline === true ||
                  p.isOnline === "true" ||
                  p.isOnline === 1 ||
                  String(p.isOnline).toLowerCase() === "true") &&
                p.gatewayPaymentId &&
                !p.refundedAt
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
          {r.reportUrl && (
            <a
              href={r.reportUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title="View Report">
              <FileText size={16} />
            </a>
          )}
          {/* Status Change Dropdown */}
          {(() => {
            const allowedStatuses = STATUS_TRANSITIONS[r.status] || [];
            // CANCELLED can only be done from PENDING or CONFIRMED (before sample collected)
            const canCancel =
              (r.status === "PENDING" || r.status === "CONFIRMED") &&
              r.status !== "CANCELLED";
            const hasOptions = allowedStatuses.length > 0 || canCancel;
            // Don't show dropdown if status is CANCELLED and has no other transitions
            if (
              !hasOptions ||
              (r.status === "CANCELLED" && allowedStatuses.length === 0)
            )
              return null;

            const isOpen = statusDropdownOpen === r.id;

            return (
              <div className="relative" ref={dropdownRef}>
                <button
                  ref={buttonRef}
                  className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusDropdownOpen(isOpen ? null : r.id);
                  }}
                  title="Change Status">
                  <Settings size={16} />
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[9999]"
                      onClick={() => setStatusDropdownOpen(null)}
                    />
                    <div
                      ref={(el) => {
                        dropdownRef.current = el;
                        // Fine-tune position after render to ensure it's correctly positioned relative to button
                        if (
                          el &&
                          buttonRef.current &&
                          statusDropdownOpen === r.id
                        ) {
                          requestAnimationFrame(() => {
                            const dropdownRect = el.getBoundingClientRect();
                            const buttonRect =
                              buttonRef.current?.getBoundingClientRect();

                            if (!buttonRect) return;

                            // Check if dropdown is positioned correctly relative to button
                            const expectedTopBelow = buttonRect.bottom + 4;
                            const expectedTopAbove =
                              buttonRect.top - dropdownRect.height - 4;

                            // If positioned below but overflowing, move above
                            if (
                              dropdownPosition.position === "below" &&
                              dropdownRect.bottom > window.innerHeight - 10
                            ) {
                              const newTop = Math.max(10, expectedTopAbove);
                              setDropdownPosition((prev) => ({
                                ...prev,
                                top: newTop,
                                position: "above"
                              }));
                            }
                            // If positioned above but too far up (not adjacent to button), adjust
                            else if (
                              dropdownPosition.position === "above" &&
                              Math.abs(dropdownRect.bottom - buttonRect.top) >
                                20
                            ) {
                              const newTop = Math.max(10, expectedTopAbove);
                              setDropdownPosition((prev) => ({
                                ...prev,
                                top: newTop
                              }));
                            }
                            // If positioned below but not adjacent to button, adjust
                            else if (
                              dropdownPosition.position === "below" &&
                              Math.abs(dropdownRect.top - buttonRect.bottom) >
                                20
                            ) {
                              const newTop = expectedTopBelow;
                              setDropdownPosition((prev) => ({
                                ...prev,
                                top: newTop
                              }));
                            }
                          });
                        }
                      }}
                      className="fixed bg-white rounded-lg shadow-2xl border-2 border-slate-200 py-1 min-w-[180px] max-w-[200px]"
                      style={{
                        zIndex: 10000,
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        maxHeight:
                          dropdownPosition.position === "above"
                            ? `${Math.min(
                                250,
                                Math.max(100, dropdownPosition.top - 10)
                              )}px`
                            : `${Math.min(
                                250,
                                Math.max(
                                  100,
                                  window.innerHeight - dropdownPosition.top - 10
                                )
                              )}px`,
                        overflowY: "auto"
                      }}
                      onClick={(e) => e.stopPropagation()}>
                      {allowedStatuses.map((status) => (
                        <button
                          key={status}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setStatusDropdownOpen(null);
                            const ok = await confirm({
                              title: "Change Status",
                              message: `Change status from ${
                                STATUS_LABELS[r.status] || r.status
                              } to ${STATUS_LABELS[status] || status}?`
                            });
                            if (ok) {
                              onStatusChange(r.id, status);
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors border-b border-slate-100 last:border-0">
                          {STATUS_LABELS[status] || status}
                        </button>
                      ))}
                      {canCancel && !allowedStatuses.includes("CANCELLED") && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setStatusDropdownOpen(null);
                            const ok = await confirm({
                              title: "Cancel Order",
                              message: `Are you sure you want to cancel this order? This action cannot be undone.`
                            });
                            if (ok) {
                              onStatusChange(r.id, "CANCELLED");
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors border-t border-slate-200 mt-1">
                          {STATUS_LABELS["CANCELLED"] || "Cancelled"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </td>
    </tr>
  );
}
