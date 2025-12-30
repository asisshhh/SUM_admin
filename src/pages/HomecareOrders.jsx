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
  User,
  ChevronDown,
  X,
  MessageSquare,
  Settings
} from "lucide-react";
import {
  OrderStatusBadge,
  PaymentBadge,
  OrderFilterCard,
  OrderPagination,
  OrderPageHeader
} from "../components/orders";
import CompletionModal from "../components/home-healthcare/CompletionModal";

const DEFAULT_LIMIT = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "REQUESTED", label: "Requested" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" }
];

const STATUS_LABELS = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

const STATUS_TRANSITIONS = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export default function HomecareOrders() {
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
  const [completingOrder, setCompletingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    position: "below" // "above" or "below"
  });

  const currentController = useRef(null);
  const confirm = useConfirm();

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
          orderType: "services",
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
          console.error("Failed to load home healthcare service orders", e);
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

  useEffect(() => {
    load(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        params: { type: "homecare", orderType: "services" }
      });
      setViewingOrder(res.data.data);
    } catch (err) {
      toast.error("Failed to load order details");
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.post(
        `/orders/${orderId}/update-status?type=homecare&orderType=services`,
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

  const handleComplete = async (orderId, comment) => {
    await api.post(
      `/orders/${orderId}/update-status?type=homecare&orderType=services`,
      {
        status: "COMPLETED",
        completionComment: comment
      }
    );
    load(page);
  };

  const handleMarkPaid = async (row) => {
    const ok = await confirm({
      title: "Mark Payment as Paid",
      message: `Mark payment of ₹${
        row.paymentAmount || row.service?.price || 0
      } as paid?`
    });
    if (!ok) return;

    try {
      await api.post("/payments/mark-paid", {
        orderType: "HOMECARE",
        orderId: row.id,
        amount: row.paymentAmount || row.service?.price || 0
      });
      toast.success("Payment marked as paid");
      load(page);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to mark payment");
    }
  };

  const isShowingToday = fromDate === today && toDate === today;
  const isAllTime = !fromDate && !toDate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <OrderPageHeader
          icon={Home}
          iconColor="purple"
          title="Home Healthcare Services"
          subtitle="Manage home healthcare service bookings"
          isShowingToday={isShowingToday}
          today={today}
          onRefresh={() => load(page)}
          loading={loading}
        />

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

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">
                Home Healthcare Service Orders
              </h3>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
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
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Service
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
                          <Home size={28} className="text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">
                          No home healthcare service orders found
                        </p>
                        <p className="text-sm text-slate-400">
                          Try adjusting your filters or date range
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const currentStatus = r.status || "REQUESTED";
                  const canChangeStatus =
                    STATUS_TRANSITIONS[currentStatus]?.length > 0;
                  const canComplete = currentStatus === "IN_PROGRESS";

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent transition-all duration-200 border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">
                        #{r.id}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {(r.user?.name || r.patient?.name || "?")[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {r.patient?.name || r.user?.name || "-"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {r.user?.phone || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2">
                          <Home size={16} className="text-purple-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-slate-700 text-sm max-w-[200px] truncate">
                              {r.service?.name || "-"}
                            </p>
                            {r.service?.price && (
                              <p className="text-xs text-slate-500">
                                ₹{r.service.price}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {r.scheduledDate
                              ? new Date(r.scheduledDate).toLocaleDateString()
                              : "-"}
                          </span>
                        </div>
                        {r.timeSlot && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock size={14} className="text-slate-400" />
                            <span className="text-xs text-slate-500">
                              {r.timeSlot}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex justify-center">
                          <PaymentBadge
                            status={r.paymentStatus || "PENDING"}
                            amount={r.paymentAmount || r.service?.price || 0}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <OrderStatusBadge status={currentStatus} />
                          {canChangeStatus && (
                            <div className="relative inline-block">
                              <button
                                ref={buttonRef}
                                className="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isOpen = statusDropdownOpen === r.id;
                                  if (isOpen) {
                                    setStatusDropdownOpen(null);
                                  } else {
                                    setStatusDropdownOpen(r.id);
                                    // Calculate initial position
                                    if (buttonRef.current) {
                                      const rect =
                                        buttonRef.current.getBoundingClientRect();
                                      setDropdownPosition({
                                        top: rect.bottom + 4,
                                        left: rect.left,
                                        position: "below"
                                      });
                                    }
                                  }
                                }}
                                title="Change Status">
                                <Settings size={16} />
                                <ChevronDown
                                  size={12}
                                  className={`transition-transform ${
                                    statusDropdownOpen === r.id
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              </button>
                              {statusDropdownOpen === r.id && (
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
                                        statusDropdownOpen === r.id
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

                                          // Calculate left position
                                          const dropdownWidth = 200;
                                          let left = buttonRect.left;
                                          if (
                                            left + dropdownWidth >
                                            window.innerWidth - 10
                                          ) {
                                            left =
                                              buttonRect.right - dropdownWidth;
                                          }
                                          if (left < 10) left = 10;

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
                                              left: left,
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
                                              top: newTop,
                                              left: left
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
                                              top: newTop,
                                              left: left
                                            }));
                                          } else {
                                            // Update left position
                                            setDropdownPosition((prev) => ({
                                              ...prev,
                                              left: left
                                            }));
                                          }
                                        });
                                      }
                                    }}
                                    className="fixed bg-white rounded-lg shadow-2xl border-2 border-slate-200 py-1 min-w-[180px] max-w-[200px]"
                                    style={{
                                      zIndex: 10000,
                                      top: `${dropdownPosition.top}px`,
                                      left: `${dropdownPosition.left}px`
                                    }}
                                    onClick={(e) => e.stopPropagation()}>
                                    {STATUS_TRANSITIONS[currentStatus].map(
                                      (nextStatus) => (
                                        <button
                                          key={nextStatus}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            setStatusDropdownOpen(null);
                                            if (nextStatus === "COMPLETED") {
                                              setCompletingOrder(r);
                                            } else {
                                              await handleStatusChange(
                                                r.id,
                                                nextStatus
                                              );
                                            }
                                          }}
                                          className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-600 transition-colors border-b border-slate-100 last:border-0">
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

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            type="button"
                            className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                            onClick={() => handleViewOrder(r)}
                            title="View Details">
                            <Eye size={16} />
                          </button>
                          {r.paymentStatus !== "SUCCESS" &&
                            r.paymentOption === "PAY_AT_HOSPITAL" &&
                            currentStatus !== "CANCELLED" && (
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                onClick={() => handleMarkPaid(r)}
                                title="Mark as Paid">
                                <CreditCard size={16} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
      </div>

      {/* Completion Modal */}
      {completingOrder && (
        <CompletionModal
          order={completingOrder}
          onClose={() => setCompletingOrder(null)}
          onComplete={handleComplete}
        />
      )}

      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-800">
                Order Details
              </h3>
              <button
                onClick={() => setViewingOrder(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-500">Order ID</p>
                <p className="font-medium">#{viewingOrder.id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Patient</p>
                <p className="font-medium">
                  {viewingOrder.patient?.name || viewingOrder.user?.name || "-"}
                </p>
                <p className="text-xs text-slate-500">
                  {viewingOrder.user?.phone || viewingOrder.user?.email || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Service</p>
                <p className="font-medium">
                  {viewingOrder.service?.name || "-"}
                </p>
                {viewingOrder.service?.price && (
                  <p className="text-xs text-slate-500">
                    ₹{viewingOrder.service.price}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Scheduled Date & Time</p>
                <p className="font-medium">
                  {viewingOrder.scheduledDate
                    ? new Date(viewingOrder.scheduledDate).toLocaleString()
                    : "-"}
                </p>
                {viewingOrder.timeSlot && (
                  <p className="text-xs text-slate-500">
                    Time Slot: {viewingOrder.timeSlot}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <OrderStatusBadge status={viewingOrder.status} />
              </div>
              {viewingOrder.completionComment && (
                <div>
                  <p className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Completion Comment
                  </p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-slate-700">
                      {viewingOrder.completionComment}
                    </p>
                    {viewingOrder.completedAt && (
                      <p className="text-xs text-slate-500 mt-2">
                        Completed on:{" "}
                        {new Date(viewingOrder.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {viewingOrder.notes && (
                <div>
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="text-sm text-slate-700">{viewingOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" />
    </div>
  );
}
