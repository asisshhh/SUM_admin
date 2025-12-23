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
  Truck,
  RefreshCw,
  Filter,
  RotateCcw
} from "lucide-react";
import { toast } from "react-toastify";
import { Pagination, SearchableDropdown } from "../components/shared";
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

  const handleRefund = useCallback(
    async (booking) => {
      // Find the payment with SUCCESS status and isOnline
      const payment = booking.payments?.find(
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
        message: `Are you sure you want to process a refund of ₹${payment.amount} for this cancelled ambulance booking?`,
        danger: false
      });

      if (!ok) return;

      try {
        const response = await api.post(`/ccavenue/refund/${payment.id}`, {
          reason: "Ambulance booking cancelled"
        });

        if (response.data.success) {
          toast.success("Refund processed successfully");
          refetch();
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
    [confirm, refetch]
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <Ambulance className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  Ambulance Orders
                </h1>
                <p className="text-sm text-slate-500">
                  {isShowingToday ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Showing today's orders • {today}
                    </span>
                  ) : (
                    "Manage ambulance bookings and payments"
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all"
              onClick={() => refetch()}>
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="relative">
          {/* Glass Card Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 rounded-3xl" />
          <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-slate-200/50 p-6">
            {/* Filter Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border border-slate-200">
                  <Filter size={18} className="text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Smart Filters
                  </h3>
                  <p className="text-xs text-slate-500">
                    Refine your ambulance order search
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAllTime}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isAllTime
                      ? "bg-violet-100 text-violet-700 border-2 border-violet-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  All Time
                </button>
                <button
                  onClick={handleToday}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isShowingToday
                      ? "bg-violet-100 text-violet-700 border-2 border-violet-300"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  Today
                </button>
              </div>
            </div>

            {/* Filter Grid */}
            <div className="flex flex-wrap gap-4">
              {/* Search Input */}
              <div className="flex-1 min-w-[200px] max-w-[280px]">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Patient name, phone, or ID..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  />
                </div>
              </div>

              {/* Ambulance Type Select */}
              <div className="flex-1 min-w-[180px]">
                <SearchableDropdown
                  label="Ambulance Type"
                  value={filters.ambulanceTypeId || ""}
                  options={[
                    { value: "", label: "All Ambulance Types" },
                    ...ambulanceTypes.map((type) => ({
                      value: String(type.id),
                      label: `${type.name} (${type.code})`
                    }))
                  ]}
                  onChange={(value) =>
                    setFilters((f) => ({
                      ...f,
                      ambulanceTypeId: value,
                      page: 1
                    }))
                  }
                  placeholder="All Ambulance Types"
                  className=""
                />
              </div>

              {/* Status Select */}
              <div className="flex-1 min-w-[150px]">
                <SearchableDropdown
                  label="Status"
                  value={filters.status || ""}
                  options={[
                    { value: "", label: "All Status" },
                    { value: "REQUESTED", label: "Requested" },
                    { value: "CONFIRMED", label: "Confirmed" },
                    { value: "ASSIGNED", label: "Assigned" },
                    { value: "DISPATCHED", label: "Dispatched" },
                    { value: "ARRIVED", label: "Arrived" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "COMPLETED", label: "Completed" },
                    { value: "CANCELLED", label: "Cancelled" }
                  ]}
                  onChange={(value) =>
                    setFilters((f) => ({ ...f, status: value, page: 1 }))
                  }
                  placeholder="All Status"
                  className=""
                />
              </div>

              {/* Approval Select */}
              <div className="flex-1 min-w-[150px]">
                <SearchableDropdown
                  label="Approval"
                  value={filters.approved || ""}
                  options={[
                    { value: "", label: "All Approval" },
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "declined", label: "Declined" }
                  ]}
                  onChange={(value) =>
                    setFilters((f) => ({ ...f, approved: value, page: 1 }))
                  }
                  placeholder="All Approval"
                  className=""
                />
              </div>

              {/* Emergency Type Select */}
              <div className="flex-1 min-w-[150px]">
                <SearchableDropdown
                  label="Type"
                  value={filters.emergency || "all"}
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "true", label: "Emergency" },
                    { value: "false", label: "Non-Emergency" }
                  ]}
                  onChange={(value) =>
                    setFilters((f) => ({ ...f, emergency: value, page: 1 }))
                  }
                  placeholder="All Types"
                  className=""
                />
              </div>
            </div>

            {/* Date Range Section */}
            <div className="mt-6 pt-6 border-t border-slate-200/60">
              <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Calendar size={12} className="inline mr-1" />
                    Date Range
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                      />
                    </div>
                    <span className="text-slate-400 font-medium">to</span>
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        disabled={includeFuture}
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={includeFuture}
                      onChange={(e) => setIncludeFuture(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                      Include future
                    </span>
                  </label>

                  <div className="h-8 w-px bg-slate-200" />

                  {/* Results Count */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">Showing</span>
                    <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg font-semibold">
                      {items.length}
                    </span>
                    <span className="text-slate-500">of</span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                      {total}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden">
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
                            {/* Refund button for cancelled bookings with successful online payments */}
                            {(() => {
                              const refundablePayment = item.payments?.find(
                                (p) =>
                                  p.status === "SUCCESS" &&
                                  p.isOnline === true &&
                                  p.gatewayPaymentId &&
                                  p.status !== "REFUNDED"
                              );
                              return (
                                item.status === "CANCELLED" &&
                                refundablePayment && (
                                  <button
                                    onClick={() => handleRefund(item)}
                                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                    title="Process Refund">
                                    <RotateCcw size={16} />
                                  </button>
                                )
                              );
                            })()}
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
    </div>
  );
}
