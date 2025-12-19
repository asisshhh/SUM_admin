// HomeHealthcareOrders.jsx — Home Healthcare Orders UI
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Package,
  UserPlus,
  X,
  ChevronDown,
  Settings
} from "lucide-react";

// Import shared components
import {
  OrderStatusBadge,
  PaymentBadge,
  OrderFilterCard,
  OrderPageHeader
} from "../components/orders";
import Pagination from "../components/appointments/Pagination";
import PaymentModal from "../components/health-package/PaymentModal";

const DEFAULT_LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "REQUESTED", label: "Requested" },
  { value: "PENDING", label: "Pending" }, // Legacy support
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Transit" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" }
];

// Valid status transitions for homecare packages
// Note: HomeHealthcarePackageOrder uses BookingStatus enum
// Valid values: REQUESTED, CONFIRMED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED
// Workflow: REQUESTED → CONFIRMED → ASSIGNED → IN_PROGRESS → COMPLETED
// CANCELLED can be set from any status except COMPLETED
const STATUS_TRANSITIONS = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

// User-friendly status labels
const STATUS_LABELS = {
  REQUESTED: "Requested",
  PENDING: "Pending", // Legacy support
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Transit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

// Assign Modal Component
const AssignModal = ({ order, assignableUsers, onClose, onAssign }) => {
  const [selectedUserId, setSelectedUserId] = useState(
    order?.assignedTo?.toString() || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onAssign(order.id, selectedUserId || null);
      onClose();
    } catch (err) {
      // Error handled in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Assign Order</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-2">
              Order: <span className="font-semibold">{order?.orderNumber}</span>
            </p>
            <p className="text-sm text-slate-600 mb-4">
              Package:{" "}
              <span className="font-semibold">
                {order?.packageName || order?.package?.name}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assign To
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="">-- Unassigned --</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role}) - {user.phone || user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            {isSubmitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                {selectedUserId ? "Assign" : "Remove Assignment"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);

  const currentController = useRef(null);
  const confirm = useConfirm();

  // Fetch assignable users
  const { data: assignableUsersData } = useQuery({
    queryKey: ["assignable-users"],
    queryFn: async () => (await api.get("/users/assignable")).data,
    staleTime: 5 * 60 * 1000
  });

  const assignableUsers = assignableUsersData?.users || [];

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

  const handleAssignOrder = (row) => {
    setAssigningOrder(row);
  };

  const handleAssign = async (orderId, assignedTo) => {
    try {
      const res = await api.post(`/orders/${orderId}/assign`, {
        type: "homecare-package",
        assignedTo: assignedTo ? parseInt(assignedTo) : null
      });
      toast.success(
        assignedTo
          ? "Order assigned successfully. Status updated to ASSIGNED."
          : "Assignment removed. Status reverted to CONFIRMED."
      );
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to assign order");
      throw err;
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
        onToday={handleResetFilters}
        isShowingToday={isShowingToday}
        isAllTime={isAllTime}
        rowCount={rows.length}
        total={total}
      />

      {/* Table */}
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 w-full"
        style={{ overflow: "visible", position: "relative" }}>
        {/* Table Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">
              Home Healthcare Package Orders
            </h3>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-purple-600">
                <RefreshCw size={14} className="animate-spin" />
                Loading...
              </div>
            )}
          </div>
        </div>

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
            <div
              style={{ overflow: "visible", position: "relative", zIndex: 1 }}>
              <table
                className="w-full text-xs"
                style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs text-slate-500 truncate block">
                          {row.orderNumber || `HHP0${row.id}`}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 text-xs truncate">
                            {row.user?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {row.user?.phone || ""}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-700 text-xs truncate">
                            {row.packageName || row.package?.name || "-"}
                          </div>
                          {row.serviceCount && (
                            <div className="text-xs text-slate-500">
                              {row.serviceCount} services
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800 text-xs truncate">
                            {row.patient?.name || "-"}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {row.patient?.relation || ""}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {row.scheduledDate
                          ? new Date(row.scheduledDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit"
                              }
                            )
                          : "-"}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {row.scheduledTime || row.timeSlot || "-"}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800 text-xs">
                        ₹{row.totalAmount || 0}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <PaymentBadge
                            status={row.paymentStatus || "PENDING"}
                            amount={row.paymentAmount || row.totalAmount || 0}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <OrderStatusBadge status={row.status} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {row.assignee ? (
                          <div className="min-w-0">
                            <div className="font-medium text-xs text-slate-800 truncate">
                              {row.assignee.name}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {row.assignee.role}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td
                        className="px-3 py-3"
                        style={{ position: "relative", zIndex: "auto" }}>
                        <div
                          className="flex justify-center gap-1 flex-wrap items-center"
                          style={{ position: "relative" }}>
                          <button
                            className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                            onClick={() => handleViewOrder(row)}
                            title="View Details">
                            <Eye size={14} />
                          </button>
                          <button
                            className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                            onClick={() => handleAssignOrder(row)}
                            title="Assign">
                            <UserPlus size={14} />
                          </button>
                          {row.paymentStatus !== "SUCCESS" &&
                            row.status !== "CANCELLED" && (
                              <button
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                onClick={() => onMarkPaidClick(row)}
                                title="Mark as Paid">
                                <CreditCard size={14} />
                              </button>
                            )}
                          {/* Show checkmark if already paid */}
                          {row.paymentStatus === "SUCCESS" && (
                            <span className="p-1.5">
                              <CheckCircle2
                                size={14}
                                className="text-emerald-500"
                              />
                            </span>
                          )}
                          {/* Status Change Dropdown */}
                          {(() => {
                            const allowedStatuses =
                              STATUS_TRANSITIONS[row.status] || [];
                            // CANCELLED is always available except from COMPLETED or if already CANCELLED
                            // Don't show cancel option if status is already CANCELLED
                            const canCancel =
                              row.status !== "COMPLETED" &&
                              row.status !== "CANCELLED";
                            const hasOptions =
                              allowedStatuses.length > 0 || canCancel;
                            // Don't show dropdown at all if no options available
                            if (!hasOptions) return null;
                            // Don't show dropdown if status is CANCELLED and has no other transitions
                            if (
                              row.status === "CANCELLED" &&
                              allowedStatuses.length === 0
                            )
                              return null;

                            const isOpen = statusDropdownOpen === row.id;

                            return (
                              <div
                                className="relative"
                                style={{ zIndex: isOpen ? 1000 : "auto" }}>
                                <button
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStatusDropdownOpen(
                                      isOpen ? null : row.id
                                    );
                                  }}
                                  title="Change Status">
                                  <Settings size={14} />
                                  <ChevronDown
                                    size={10}
                                    className={`transition-transform ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                                {isOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-[999]"
                                      onClick={() =>
                                        setStatusDropdownOpen(null)
                                      }
                                    />
                                    <div
                                      className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[1000] min-w-[150px]"
                                      style={{
                                        position: "absolute",
                                        zIndex: 1000
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
                                                STATUS_LABELS[row.status] ||
                                                row.status
                                              } to ${
                                                STATUS_LABELS[status] || status
                                              }?`
                                            });
                                            if (ok) {
                                              handleStatusChange(
                                                row.id,
                                                status
                                              );
                                            }
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                          {STATUS_LABELS[status] || status}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination - Match appointment orders design */}
            {rows.length > 0 && (
              <Pagination
                page={page}
                limit={limit}
                total={total}
                onPageChange={(p) => {
                  setPage(p);
                  load(p);
                }}
              />
            )}
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
                    amount={
                      viewingOrder.paymentAmount ||
                      viewingOrder.totalAmount ||
                      0
                    }
                  />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Assigned To</p>
                  <p className="font-semibold">
                    {viewingOrder.assignee?.name || "Unassigned"}
                  </p>
                  {viewingOrder.assignee?.role && (
                    <p className="text-xs text-slate-500">
                      {viewingOrder.assignee.role}
                    </p>
                  )}
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

      {/* Assign Modal */}
      {assigningOrder && (
        <AssignModal
          order={assigningOrder}
          assignableUsers={assignableUsers}
          onClose={() => setAssigningOrder(null)}
          onAssign={handleAssign}
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
    </div>
  );
}
