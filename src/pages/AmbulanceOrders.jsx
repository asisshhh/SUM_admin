import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import { useConfirm } from "../contexts/ConfirmContext";
import {
  Ambulance,
  Search,
  CheckCircle,
  XCircle,
  Calculator,
  DollarSign,
  Eye,
  Calendar,
  MapPin,
  Phone,
  User,
  Truck
} from "lucide-react";
import { toast } from "react-toastify";
import { Pagination } from "../components/shared";
import useDateRange from "../hooks/useDateRange";
import useDebounce from "../hooks/useDebounce";
import AmbulanceOrderDetailsModal from "../components/ambulance/AmbulanceOrderDetailsModal";
import AssignAmbulanceModal from "../components/ambulance/AssignAmbulanceModal";
import CalculateFinalModal from "../components/ambulance/CalculateFinalModal";
import PaymentCompleteModal from "../components/ambulance/PaymentCompleteModal";

export default function AmbulanceOrders() {
  const qc = useQueryClient();
  const confirm = useConfirm();
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

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: "",
    status: "",
    approved: "",
    emergency: "all",
    ambulanceTypeId: ""
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [assigningAmbulance, setAssigningAmbulance] = useState(null);

  // Fetch ambulance types for filter
  const { data: ambulanceTypesData } = useQuery({
    queryKey: ["ambulance-types-all"],
    queryFn: async () => {
      return (
        await api.get("/ambulance-types", {
          params: { pageSize: 100, active: "true" }
        })
      ).data;
    },
    staleTime: 5 * 60 * 1000
  });

  const ambulanceTypes = useMemo(
    () => ambulanceTypesData?.items || [],
    [ambulanceTypesData]
  );

  // Memoize filter params to prevent unnecessary query recalculations
  const filterParams = useMemo(() => {
    const dateParams = buildDateParams();
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
    );
    return { ...filters, ...dateParams, ...cleanFilters };
  }, [filters, buildDateParams]);

  // Fetch ambulance orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ambulance-orders", filterParams],
    queryFn: async () => {
      return (await api.get("/ambulance-orders", { params: filterParams }))
        .data;
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
    refetchOnWindowFocus: false
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  // Approve booking
  const approveMutation = useMutation({
    mutationFn: (id) => api.post(`/ambulance-orders/${id}/approve`),
    onSuccess: () => {
      toast.success("Booking approved successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to approve booking");
    }
  });

  // Decline booking
  const declineMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      api.post(`/ambulance-orders/${id}/decline`, { reason }),
    onSuccess: () => {
      toast.success("Booking declined");
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to decline booking");
    }
  });

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const handleApprove = useCallback(
    async (booking) => {
      const ok = await confirm({
        title: "Approve Booking",
        message: `Approve ambulance booking #${booking.id}?`
      });
      if (ok) approveMutation.mutate(booking.id);
    },
    [confirm, approveMutation]
  );

  const handleDecline = useCallback(
    async (booking) => {
      const reason = prompt("Enter decline reason (optional):");
      const ok = await confirm({
        title: "Decline Booking",
        message: `Decline ambulance booking #${booking.id}?`,
        danger: true
      });
      if (ok) declineMutation.mutate({ id: booking.id, reason });
    },
    [confirm, declineMutation]
  );

  const handleCalculateFinal = useCallback((booking) => {
    setSelectedBooking(booking);
    setShowCalculateModal(true);
  }, []);

  const handlePaymentComplete = useCallback((booking) => {
    setSelectedBooking(booking);
    setShowPaymentModal(true);
  }, []);

  const handleView = useCallback(async (booking) => {
    try {
      // Fetch full booking details with logs
      const response = await api.get(`/ambulance-orders/${booking.id}`);
      setViewingBooking(response.data);
    } catch (err) {
      toast.error("Failed to fetch booking details");
    }
  }, []);

  const handleAssignAmbulance = useCallback((booking) => {
    setAssigningAmbulance(booking);
  }, []);

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      api.post(`/ambulance-orders/${id}/cancel`, {
        cancellationReason: reason
      }),
    onSuccess: () => {
      toast.success("Booking cancelled successfully");
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to cancel booking");
    }
  });

  const handleCancel = useCallback(
    async (booking) => {
      if (booking.status === "COMPLETED") {
        toast.error("Cannot cancel a completed booking");
        return;
      }
      if (booking.status === "CANCELLED") {
        toast.error("Booking is already cancelled");
        return;
      }
      const reason = prompt("Enter cancellation reason (optional):");
      const ok = await confirm({
        title: "Cancel Booking",
        message: `Cancel ambulance booking #${booking.id}?`,
        danger: true
      });
      if (ok) cancelMutation.mutate({ id: booking.id, reason });
    },
    [confirm, cancelMutation]
  );

  // Memoize badge functions to prevent recreation on every render
  const getApprovalBadge = useCallback((approved) => {
    if (approved === null) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full">
          Pending
        </span>
      );
    }
    if (approved === true) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
          Approved
        </span>
      );
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
        Declined
      </span>
    );
  }, []);

  const getStatusBadge = useCallback((status) => {
    const colors = {
      REQUESTED: "bg-yellow-100 text-yellow-700",
      CONFIRMED: "bg-blue-100 text-blue-700",
      ASSIGNED: "bg-purple-100 text-purple-700",
      DISPATCHED: "bg-indigo-100 text-indigo-700",
      ARRIVED: "bg-cyan-100 text-cyan-700",
      IN_PROGRESS: "bg-orange-100 text-orange-700",
      COMPLETED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700"
    };
    return (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          colors[status] || "bg-gray-100 text-gray-700"
        }`}>
        {status}
      </span>
    );
  }, []);

  const isShowingToday = fromDate === today && toDate === today;
  const isAllTime = !fromDate && !toDate;

  const handleAllTime = useCallback(() => {
    clearDates();
  }, [clearDates]);

  const handleToday = useCallback(() => {
    resetDates();
  }, [resetDates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Ambulance className="text-blue-600" size={32} />
            Ambulance Orders
          </h1>
          <p className="text-slate-500 mt-1">
            Manage ambulance bookings and payments
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Filter Header with Today/All Time buttons */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isShowingToday && (
              <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                Showing Today's Orders
              </span>
            )}
            {isAllTime && (
              <span className="px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                Showing All Time Orders
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                isShowingToday
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}>
              Today
            </button>
            <button
              onClick={handleAllTime}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                isAllTime
                  ? "bg-purple-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}>
              All Time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name, phone, address..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            name="ambulanceTypeId"
            value={filters.ambulanceTypeId}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Ambulance Types</option>
            {ambulanceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} ({type.code})
              </option>
            ))}
          </select>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Status</option>
            <option value="REQUESTED">Requested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="ARRIVED">Arrived</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select
            name="approved"
            value={filters.approved}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Approval</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </select>
          <select
            name="emergency"
            value={filters.emergency}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">All Types</option>
            <option value="true">Emergency</option>
            <option value="false">Non-Emergency</option>
          </select>
        </div>

        {/* Date Range Section */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <Calendar className="inline mr-1" size={12} />
                Date Range
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <span className="text-slate-400 font-medium">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={includeFuture}
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFuture}
                  onChange={(e) => setIncludeFuture(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Include Future</span>
              </label>
              <button
                onClick={resetDates}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition text-sm">
                Reset Dates
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No ambulance orders found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Booking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Ambulance Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Amounts
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Approval
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">
                          #{item.id}
                        </div>
                        {item.emergency && (
                          <span className="text-xs text-red-600 font-semibold">
                            Emergency
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">
                          {item.user?.name || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.user?.phone || "-"}
                        </div>
                        {item.patientName && (
                          <div className="text-xs text-slate-500">
                            Patient: {item.patientName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.ambulanceType ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {item.ambulanceType.name || "-"}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.ambulanceType.code || ""}
                            </div>
                            {item.ambulance && (
                              <div className="text-xs text-green-600 mt-1 font-medium">
                                🚑 {item.ambulance.vehicleNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-start gap-2 mb-1">
                            <MapPin className="text-green-600" size={14} />
                            <span className="text-slate-600">
                              {item.pickupAddress}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="text-red-600" size={14} />
                            <span className="text-slate-600">
                              {item.destination}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-slate-500">Initial: </span>
                            <span className="font-medium">
                              ₹{item.initialAmount || 0}
                            </span>
                          </div>
                          {item.extraAmount > 0 && (
                            <div>
                              <span className="text-slate-500">Extra: </span>
                              <span className="font-medium">
                                ₹{item.extraAmount}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">Total: </span>
                            <span className="font-bold text-green-600">
                              ₹{item.totalAmount || item.initialAmount || 0}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getApprovalBadge(item.approved)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleView(item)}
                            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition"
                            title="View Details">
                            <Eye size={16} />
                          </button>
                          {item.status !== "CANCELLED" && (
                            <>
                              {item.approved === null && (
                                <>
                                  <button
                                    onClick={() => handleApprove(item)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                    title="Approve">
                                    <CheckCircle size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDecline(item)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="Decline">
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}
                              {item.approved === true && (
                                <>
                                  {item.status !== "COMPLETED" && (
                                    <button
                                      onClick={() =>
                                        handleAssignAmbulance(item)
                                      }
                                      className={`p-2 rounded-lg transition ${
                                        item.ambulanceId
                                          ? "text-purple-600 hover:bg-purple-50"
                                          : "text-purple-600 hover:bg-purple-50"
                                      }`}
                                      title={
                                        item.ambulanceId
                                          ? "Reassign Ambulance"
                                          : "Assign Ambulance"
                                      }>
                                      <Truck size={16} />
                                    </button>
                                  )}
                                  {item.status !== "COMPLETED" && (
                                    <>
                                      {!item.totalAmount && (
                                        <button
                                          onClick={() =>
                                            handleCalculateFinal(item)
                                          }
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                          title="Calculate Final">
                                          <Calculator size={16} />
                                        </button>
                                      )}
                                      {item.totalAmount && (
                                        <button
                                          onClick={() =>
                                            handlePaymentComplete(item)
                                          }
                                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                          title="Update Payment & Complete">
                                          <DollarSign size={16} />
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {item.status !== "COMPLETED" && (
                                    <button
                                      onClick={() => handleCancel(item)}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                      title="Cancel Order">
                                      <XCircle size={16} />
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > filters.pageSize && (
              <div className="border-t border-slate-200 p-4">
                <Pagination
                  currentPage={filters.page}
                  totalPages={Math.ceil(total / filters.pageSize)}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCalculateModal && selectedBooking && (
        <CalculateFinalModal
          booking={selectedBooking}
          onClose={() => {
            setShowCalculateModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={() => {
            refetch();
            setShowCalculateModal(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {showPaymentModal && selectedBooking && (
        <PaymentCompleteModal
          booking={selectedBooking}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={() => {
            refetch();
            setShowPaymentModal(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* View Order Modal with Editing */}
      {viewingBooking && (
        <AmbulanceOrderDetailsModal
          booking={viewingBooking}
          onClose={() => setViewingBooking(null)}
          onUpdated={() => {
            refetch();
            setViewingBooking(null);
          }}
        />
      )}

      {/* Assign Ambulance Modal */}
      {assigningAmbulance && (
        <AssignAmbulanceModal
          booking={assigningAmbulance}
          onClose={() => setAssigningAmbulance(null)}
          onSuccess={() => {
            refetch();
            setAssigningAmbulance(null);
          }}
        />
      )}
    </div>
  );
}
