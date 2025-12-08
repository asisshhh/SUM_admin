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
  User
} from "lucide-react";
import { toast } from "react-toastify";
import { Pagination } from "../components/shared";
import useDateRange from "../hooks/useDateRange";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Calculate Final Price Modal
function CalculateFinalModal({ booking, onClose, onSuccess }) {
  const [form, setForm] = useState({
    paramedicCharges: "",
    attendantCharges: "",
    extraKmCharges: "",
    totalDistance: booking?.totalDistance?.toString() || ""
  });
  const [loading, setLoading] = useState(false);

  const calculateMutation = useMutation({
    mutationFn: async (data) => {
      return await api.post(`/ambulance-orders/${booking.id}/calculate-final`, data);
    },
    onSuccess: () => {
      toast.success("Final charges calculated successfully");
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Failed to calculate final charges");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    calculateMutation.mutate({
      paramedicCharges: Number(form.paramedicCharges) || 0,
      attendantCharges: Number(form.attendantCharges) || 0,
      extraKmCharges: Number(form.extraKmCharges) || 0,
      totalDistance: form.totalDistance ? Number(form.totalDistance) : undefined
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calculator className="text-blue-600" size={24} />
            Calculate Final Charges
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-2">Initial Amount:</div>
              <div className="text-2xl font-bold">₹{booking?.initialAmount || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Paramedic Charges (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.paramedicCharges}
                onChange={(e) => setForm({ ...form, paramedicCharges: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Attendant Charges (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.attendantCharges}
                onChange={(e) => setForm({ ...form, attendantCharges: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Extra KM Charges (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.extraKmCharges}
                onChange={(e) => setForm({ ...form, extraKmCharges: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Total Distance (km)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.totalDistance}
                onChange={(e) => setForm({ ...form, totalDistance: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.0"
              />
              <p className="text-xs text-slate-500 mt-1">
                Extra km charges will be auto-calculated if distance &gt; 30km
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-800">
              <div className="font-semibold mb-2">Estimated Total Amount:</div>
              <div className="text-2xl font-bold">
                ₹
                {(
                  (booking?.initialAmount || 0) +
                  (Number(form.paramedicCharges) || 0) +
                  (Number(form.attendantCharges) || 0) +
                  (Number(form.extraKmCharges) || 0)
                ).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
              {loading ? "Calculating..." : "Calculate & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Payment & Complete Modal
function PaymentCompleteModal({ booking, onClose, onSuccess }) {
  const [form, setForm] = useState({
    paymentMethod: "CASH",
    paymentStatus: "SUCCESS"
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update payment status
      await api.post("/payments/mark-paid", {
        orderType: "AMBULANCE",
        orderId: booking.id,
        amount: booking.totalAmount || booking.initialAmount || 0,
        method: form.paymentMethod,
        status: form.paymentStatus
      });

      // Update status to completed
      await api.put(`/ambulance-orders/${booking.id}/status`, {
        status: "COMPLETED"
      });

      toast.success("Payment updated and booking marked as completed");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update payment and status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-green-600" size={24} />
            Update Payment & Complete
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="text-sm text-slate-600 mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-slate-800">
              ₹{booking?.totalAmount || booking?.initialAmount || 0}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="UPI">UPI</option>
              <option value="NETBANKING">Net Banking</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Status
            </label>
            <select
              value={form.paymentStatus}
              onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="SUCCESS">Success (Paid)</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              This will mark the booking status as <strong>COMPLETED</strong> and update the payment
              status.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50">
              {loading ? "Updating..." : "Update & Complete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
    resetDates
  } = useDateRange();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 15,
    search: "",
    status: "",
    approved: "",
    emergency: "all"
  });

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fetch ambulance orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ambulance-orders", filters],
    queryFn: async () => {
      const params = {
        ...filters,
        ...buildDateParams(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "" && v !== "all")
        )
      };
      return (await api.get("/ambulance-orders", { params })).data;
    }
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
    mutationFn: ({ id, reason }) => api.post(`/ambulance-orders/${id}/decline`, { reason }),
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

  const getApprovalBadge = (approved) => {
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
  };

  const getStatusBadge = (status) => {
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Ambulance className="text-blue-600" size={32} />
            Ambulance Orders
          </h1>
          <p className="text-slate-500 mt-1">Manage ambulance bookings and payments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, phone, address..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
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
          <div className="flex gap-2">
            <button
              onClick={() => resetDates()}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              Reset Dates
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No ambulance orders found</div>
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
                        <div className="font-medium text-slate-800">#{item.id}</div>
                        {item.emergency && (
                          <span className="text-xs text-red-600 font-semibold">Emergency</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{item.user?.name || "-"}</div>
                        <div className="text-xs text-slate-500">{item.user?.phone || "-"}</div>
                        {item.patientName && (
                          <div className="text-xs text-slate-500">Patient: {item.patientName}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-start gap-2 mb-1">
                            <MapPin className="text-green-600" size={14} />
                            <span className="text-slate-600">{item.pickupAddress}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="text-red-600" size={14} />
                            <span className="text-slate-600">{item.destination}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-slate-500">Initial: </span>
                            <span className="font-medium">₹{item.initialAmount || 0}</span>
                          </div>
                          {item.extraAmount > 0 && (
                            <div>
                              <span className="text-slate-500">Extra: </span>
                              <span className="font-medium">₹{item.extraAmount}</span>
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
                      <td className="px-6 py-4 text-center">{getApprovalBadge(item.approved)}</td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
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
                          {item.status !== "COMPLETED" && item.approved === true && (
                            <>
                              {!item.totalAmount && (
                                <button
                                  onClick={() => handleCalculateFinal(item)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Calculate Final">
                                  <Calculator size={16} />
                                </button>
                              )}
                              {item.totalAmount && (
                                <button
                                  onClick={() => handlePaymentComplete(item)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                  title="Update Payment & Complete">
                                  <DollarSign size={16} />
                                </button>
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
    </div>
  );
}
