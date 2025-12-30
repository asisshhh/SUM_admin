// HomeHealthcareSpecialistDashboard.jsx — Dashboard for Home Healthcare Specialists
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useConfirm } from "../contexts/ConfirmContext";
import { useAuth } from "../contexts/AuthContext";
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
  Package,
  X,
  ChevronDown,
  Settings,
  RotateCcw,
  TrendingUp,
  Users
} from "lucide-react";

// Import shared components
import {
  OrderStatusBadge,
  PaymentBadge,
  OrderFilterCard,
  OrderPagination,
  OrderPageHeader
} from "../components/orders";
import PaymentModal from "../components/health-package/PaymentModal";
import HomeHealthcareOrderViewModal from "../components/home-healthcare/HomeHealthcareOrderViewModal";

const DEFAULT_LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "ARRIVED", label: "Arrived" },
  { value: "SAMPLE_COLLECTED", label: "Sample Collected" },
  { value: "ARRIVED_AT_HOSPITAL", label: "Arrived at Hospital" },
  { value: "PROCESSING", label: "Test in Progress" },
  { value: "COMPLETED", label: "Completed" }
];

// Valid status transitions for home healthcare package orders
const STATUS_TRANSITIONS = {
  ASSIGNED: ["IN_TRANSIT"],
  IN_TRANSIT: ["ARRIVED"],
  ARRIVED: ["SAMPLE_COLLECTED"],
  SAMPLE_COLLECTED: ["ARRIVED_AT_HOSPITAL", "PROCESSING", "COMPLETED"],
  ARRIVED_AT_HOSPITAL: ["PROCESSING", "COMPLETED"],
  PROCESSING: ["COMPLETED"],
  COMPLETED: []
};

// User-friendly status labels
const STATUS_LABELS = {
  ASSIGNED: "Assigned",
  IN_TRANSIT: "In Transit",
  ARRIVED: "Arrived",
  SAMPLE_COLLECTED: "Sample Collected",
  ARRIVED_AT_HOSPITAL: "Arrived at Hospital",
  PROCESSING: "Test in Progress",
  COMPLETED: "Completed"
};

// Map backend status to frontend display status
const mapStatusForDisplay = (status) => {
  const statusMap = {
    REQUESTED: "PENDING",
    CONFIRMED: "CONFIRMED",
    ASSIGNED: "ASSIGNED",
    DISPATCHED: "IN_TRANSIT",
    IN_TRANSIT: "IN_TRANSIT",
    ARRIVED: "ARRIVED",
    PATIENT_ONBOARD: "ARRIVED",
    SAMPLE_COLLECTED: "SAMPLE_COLLECTED",
    EN_ROUTE_TO_HOSPITAL: "ARRIVED_AT_HOSPITAL",
    ARRIVED_AT_HOSPITAL: "ARRIVED_AT_HOSPITAL",
    IN_PROGRESS: "PROCESSING",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED"
  };
  return statusMap[status] || status;
};

export default function HomeHealthcareSpecialistDashboard() {
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
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    position: "below" // "below" or "above"
  });

  const currentController = useRef(null);
  const confirm = useConfirm();
  const { user } = useAuth();

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
          orderType: "packages",
          page: p,
          limit,
          search: search || undefined,
          status: status || undefined,
          // Note: Backend automatically filters by assignedTo for HOME_HEALTHCARE_SPECIALIST role
          // No need to send assignedToMe - backend enforces this automatically
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

  const onMarkPaidClick = useCallback((row) => {
    setPaymentOrder({ ...row, orderType: "HOME_HEALTHCARE_PACKAGE" });
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

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.post(
        `/orders/${orderId}/update-status?type=homecare&orderType=packages`,
        {
          status: newStatus
        }
      );
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
      const payment = order.payments?.find(
        (p) =>
          p.status === "SUCCESS" &&
          p.isOnline === true &&
          !p.refundedAt &&
          p.gatewayPaymentId
      );

      if (!payment) {
        toast.error("No refundable payment found");
        return;
      }

      const ok = await confirm({
        title: "Refund Payment",
        message: `Are you sure you want to refund ₹${payment.amount} for order #${order.orderNumber}?`,
        danger: true
      });

      if (!ok) return;

      try {
        await api.post(`/orders/${order.id}/refund`, {
          type: "homecare-package",
          paymentId: payment.id
        });
        toast.success("Refund initiated successfully");
        load(page);
        setViewingOrder(null);
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to process refund");
      }
    },
    [confirm, load, page]
  );

  // ═══════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════

  const stats = {
    total: rows.length,
    assigned: rows.filter((r) => mapStatusForDisplay(r.status) === "ASSIGNED")
      .length,
    inTransit: rows.filter(
      (r) => mapStatusForDisplay(r.status) === "IN_TRANSIT"
    ).length,
    completed: rows.filter((r) => mapStatusForDisplay(r.status) === "COMPLETED")
      .length
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 p-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            My Home Healthcare Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage orders assigned to you
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Orders</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Assigned</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats.assigned}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Users className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">In Progress</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats.inTransit}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats.completed}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

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
        today={today}
      />

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw
                        className="animate-spin text-blue-600"
                        size={24}
                      />
                      <span className="ml-2 text-slate-600">
                        Loading orders...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Home size={28} className="text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">
                        No orders assigned to you
                      </p>
                      <p className="text-sm text-slate-400">
                        Orders will appear here once they are assigned to you
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const displayStatus = mapStatusForDisplay(row.status);
                  const canChangeStatus =
                    STATUS_TRANSITIONS[displayStatus]?.length > 0;
                  // Extract patient and user info from the order structure
                  const patientName =
                    row.patient?.name || row.user?.name || "N/A";
                  const customerPhone = row.user?.phone || "";
                  const packageName = row.package?.name || "N/A";
                  const totalAmount = row.totalAmount || 0;
                  const scheduledDate = row.scheduledDate;
                  const scheduledTime = row.scheduledTime;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {row.orderNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">
                          {patientName}
                        </div>
                        {customerPhone && (
                          <div className="text-xs text-slate-500">
                            {customerPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">
                          {packageName}
                        </div>
                        {totalAmount > 0 && (
                          <div className="text-xs text-slate-500">
                            ₹{totalAmount}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <OrderStatusBadge status={displayStatus} />
                          {canChangeStatus && (
                            <div className="relative inline-block ml-2">
                              <button
                                ref={buttonRef}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isOpen = statusDropdownOpen === row.id;
                                  if (isOpen) {
                                    setStatusDropdownOpen(null);
                                  } else {
                                    setStatusDropdownOpen(row.id);
                                    // Calculate initial position
                                    if (buttonRef.current) {
                                      const rect =
                                        buttonRef.current.getBoundingClientRect();
                                      setDropdownPosition({
                                        top: rect.bottom + 4,
                                        position: "below"
                                      });
                                    }
                                  }
                                }}
                                className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors flex items-center gap-1"
                                title="Change Status">
                                <Settings size={16} />
                                <ChevronDown
                                  size={12}
                                  className={`transition-transform ${
                                    statusDropdownOpen === row.id
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              </button>
                              {statusDropdownOpen === row.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-[9999]"
                                    onClick={() => setStatusDropdownOpen(null)}
                                  />
                                  <div
                                    ref={(el) => {
                                      dropdownRef.current = el;
                                      // Fine-tune position after render
                                      if (
                                        el &&
                                        buttonRef.current &&
                                        statusDropdownOpen === row.id
                                      ) {
                                        requestAnimationFrame(() => {
                                          const dropdownRect =
                                            el.getBoundingClientRect();
                                          const buttonRect =
                                            buttonRef.current?.getBoundingClientRect();

                                          if (!buttonRect) return;

                                          // Check if dropdown is positioned correctly
                                          const expectedTopBelow =
                                            buttonRect.bottom + 4;
                                          const expectedTopAbove =
                                            buttonRect.top -
                                            dropdownRect.height -
                                            4;

                                          // If positioned below but overflowing, move above
                                          if (
                                            dropdownPosition.position ===
                                              "below" &&
                                            dropdownRect.bottom >
                                              window.innerHeight - 10
                                          ) {
                                            const newTop = Math.max(
                                              10,
                                              expectedTopAbove
                                            );
                                            setDropdownPosition((prev) => ({
                                              ...prev,
                                              top: newTop,
                                              position: "above"
                                            }));
                                          }
                                          // If positioned above but too far up, adjust
                                          else if (
                                            dropdownPosition.position ===
                                              "above" &&
                                            Math.abs(
                                              dropdownRect.bottom -
                                                buttonRect.top
                                            ) > 20
                                          ) {
                                            const newTop = Math.max(
                                              10,
                                              expectedTopAbove
                                            );
                                            setDropdownPosition((prev) => ({
                                              ...prev,
                                              top: newTop
                                            }));
                                          }
                                          // If positioned below but not adjacent, adjust
                                          else if (
                                            dropdownPosition.position ===
                                              "below" &&
                                            Math.abs(
                                              dropdownRect.top -
                                                buttonRect.bottom
                                            ) > 20
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
                                      left: buttonRef.current
                                        ? `${Math.max(
                                            10,
                                            buttonRef.current.getBoundingClientRect()
                                              .right - 200
                                          )}px`
                                        : "auto"
                                    }}>
                                    {STATUS_TRANSITIONS[displayStatus].map(
                                      (nextStatus) => (
                                        <button
                                          key={nextStatus}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setStatusDropdownOpen(null);
                                            await handleStatusChange(
                                              row.id,
                                              nextStatus
                                            );
                                          }}
                                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg transition-colors">
                                          {STATUS_LABELS[nextStatus] ||
                                            nextStatus}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge
                          status={row.paymentStatus}
                          option={row.paymentOption}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">
                          {row.scheduledDate
                            ? new Date(row.scheduledDate).toLocaleDateString()
                            : "N/A"}
                        </div>
                        {row.scheduledTime && (
                          <div className="text-xs text-slate-500">
                            {row.scheduledTime}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewOrder(row)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View Details">
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-4 py-3 border-t border-slate-200">
            <OrderPagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={(newPage) => {
                setPage(newPage);
                load(newPage);
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {viewingOrder && (
        <HomeHealthcareOrderViewModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onUpdated={() => load(page)}
        />
      )}

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
    </div>
  );
}
