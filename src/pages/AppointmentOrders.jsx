// AppointmentOrders.jsx — Clean, Optimized with Small Components
// Shows TODAY's appointments by default
import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import OrderDetailsModal from "../components/OrderDetailsModal";
import { printReceipt } from "../components/ReceiptPrint";
import Socket from "../utils/SocketManager";
import { useConfirm } from "../contexts/ConfirmContext";
import { toast } from "react-toastify";
import { useMutation } from "@tanstack/react-query";
import { X, Loader2, Calendar, Clock, Stethoscope, Building2 } from "lucide-react";
import { SearchableDropdown } from "../components/shared";

// Import modular components
import {
  PageHeader,
  FilterCard,
  AppointmentTable,
  Pagination
} from "../components/appointments";

const DEFAULT_LIMIT = 20;

export default function AppointmentOrders() {
  // ═══════════════════════════════════════════════════════════════════
  // HOOKS & STATE
  // ═══════════════════════════════════════════════════════════════════

  // Date range hook - defaults to today
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

  // Filter states
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");

  // Dropdown data
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Table data & pagination
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Loading states
  const [genLoading, setGenLoading] = useState(false);

  // Socket
  const [socketInstance, setSocketInstance] = useState(null);

  // Debounce ref
  const searchRef = useRef(null);

  // Confirm hook
  const confirm = useConfirm();

  // ═══════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params = {
          type: "appointments",
          page: p,
          limit,
          search: search || undefined,
          status: status || undefined,
          doctorId: doctor || undefined,
          departmentId: department || undefined,
          ...buildDateParams()
        };

        const res = await api.get("/orders", { params });
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const totalCount =
          res.data?.total ??
          res.data?.count ??
          (Array.isArray(res.data) ? res.data.length : 0);
        const currentPage = res.data?.page ?? p;

        setRows(data);
        setTotal(totalCount);
        setPage(currentPage);

        return data;
      } catch (err) {
        console.error("LOAD ERROR:", err);
        setRows([]);
        setTotal(0);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [search, status, doctor, department, limit, buildDateParams]
  );

  // ═══════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════

  // Initial load
  useEffect(() => {
    load(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced filter changes
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(1), 420);
    return () => clearTimeout(searchRef.current);
  }, [search, status, department, doctor, fromDate, toDate, includeFuture]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load departments
  useEffect(() => {
    api
      .get("/departments")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDepartments(list);
      })
      .catch((err) => console.error("DEPT LOAD ERROR:", err));
  }, []);

  // Load doctors when department changes
  useEffect(() => {
    if (!department) {
      setDoctors([]);
      setDoctor("");
      return;
    }
    api
      .get("/doctors", { params: { departmentId: department } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDoctors(list);
      })
      .catch(() => setDoctors([]));
  }, [department]);

  // Socket connection
  useEffect(() => {
    const refresh = () => load(1);
    const offQueueUpdatedForAll = Socket.on(
      "queueUpdatedForAllDoctors",
      refresh
    );
    const offQueueUpdated = Socket.on("queueUpdated", refresh);

    setSocketInstance(Socket.getSocket());

    return () => {
      offQueueUpdatedForAll();
      offQueueUpdated();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  const handleGenerateQueue = async () => {
    if (!confirm("Generate today's queue for ALL doctors?")) return;
    setGenLoading(true);
    try {
      await api.post("/appointment-queue/generate-day-queue", { date: today });
      await load(page);
      alert("Queue generated successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to generate queue");
    }
    setGenLoading(false);
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setDepartment("");
    setDoctor("");
    resetDates();
    load(1);
  };

  const handleAllTime = () => {
    clearDates();
    setTimeout(() => load(1), 100);
  };

  const handleModalUpdate = async () => {
    const fresh = await load(page);
    const updatedRow = fresh.find((x) => x.id === selectedOrder?.id);
    if (updatedRow) setSelectedOrder(updatedRow);
  };

  const handleViewDetails = (appointment) => {
    setSelectedOrder(appointment);
    setDetailsOpen(true);
  };

  const handleDepartmentChange = (value) => {
    setDepartment(value);
    setDoctor("");
  };

  const handleReschedule = useCallback((appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleModalOpen(true);
  }, []);

  const handleRefund = useCallback(
    async (appointment) => {
      // Find the payment with SUCCESS status and isOnline
      const payment = appointment.payments?.find(
        (p) =>
          p.status === "SUCCESS" &&
          p.isOnline === true &&
          p.gatewayPaymentId &&
          p.status !== "REFUNDED"
      );

      if (!payment) {
        console.error("Refund failed - payment details:", {
          payments: appointment.payments,
          paymentStatus: appointment.paymentStatus,
          billing: appointment.billing
        });
        toast.error(
          "No eligible payment found for refund. Payment must be online and successful with CCAvenue reference."
        );
        return;
      }

      const ok = await confirm({
        title: "Process Refund",
        message: `Are you sure you want to process a refund of ₹${payment.amount} for this cancelled appointment?`,
        danger: false
      });

      if (!ok) return;

      try {
        const response = await api.post(`/ccavenue/refund/${payment.id}`, {
          reason: "Appointment cancelled"
        });

        if (response.data.success) {
          toast.success("Refund processed successfully");
          // Refresh the table to show updated payment status
          await load(page);
          // Also update selected order if it's the refunded one
          if (selectedOrder?.id === appointment.id) {
            const freshData = await api.get(`/orders/${appointment.id}`, {
              params: { type: "appointments" }
            });
            if (freshData.data?.data) {
              setSelectedOrder(freshData.data.data);
            }
          }
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
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════

  const isShowingToday = fromDate === today && toDate === today;
  const isAllTime = !fromDate && !toDate;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header Section */}
        <PageHeader
          isShowingToday={isShowingToday}
          today={today}
          onGenerateQueue={handleGenerateQueue}
          onRefresh={() => load(page)}
          genLoading={genLoading}
          loading={loading}
        />

        {/* Filter Section */}
        <FilterCard
          // Search
          search={search}
          onSearchChange={setSearch}
          // Status
          status={status}
          onStatusChange={setStatus}
          // Department
          department={department}
          departments={departments}
          onDepartmentChange={handleDepartmentChange}
          // Doctor
          doctor={doctor}
          doctors={doctors}
          onDoctorChange={setDoctor}
          // Dates
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          includeFuture={includeFuture}
          onIncludeFutureChange={setIncludeFuture}
          // Actions
          onAllTime={handleAllTime}
          onToday={handleResetFilters}
          isShowingToday={isShowingToday}
          isAllTime={isAllTime}
          // Results
          rowCount={rows.length}
          total={total}
        />

        {/* Table Section */}
        <AppointmentTable
          rows={rows}
          loading={loading}
          page={page}
          limit={limit}
          onViewDetails={handleViewDetails}
          onPrintReceipt={printReceipt}
          onRefund={handleRefund}
          onReschedule={handleReschedule}
        />

        {/* Pagination */}
        {rows.length > 0 && (
          <Pagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={load}
          />
        )}
      </div>

      {/* Details Modal */}
      <OrderDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        data={selectedOrder}
        socket={socketInstance}
        onUpdated={handleModalUpdate}
      />

      {/* Reschedule Modal */}
      {rescheduleModalOpen && selectedAppointment && (
        <RescheduleAppointmentModal
          appointment={selectedAppointment}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedAppointment(null);
          }}
          onSuccess={() => {
            load(page);
            setRescheduleModalOpen(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </div>
  );
}

// Reschedule Appointment Modal Component
function RescheduleAppointmentModal({ appointment, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    date: "",
    timeSlot: "",
    notes: ""
  });
  const [errors, setErrors] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment?.id) {
      setFormData({
        date: "",
        timeSlot: "",
        notes: ""
      });
      setErrors({});
      setAvailableSlots([]);
    }
  }, [appointment?.id]);

  // Fetch available slots when date is selected (using original appointment's doctor)
  useEffect(() => {
    if (!appointment?.doctorId || !formData.date) {
      setAvailableSlots([]);
      setFormData((prev) => ({ ...prev, timeSlot: "" }));
      return;
    }

    setLoadingSlots(true);
    const doctorId = appointment.doctorId;
    console.log("Fetching slots for doctor:", doctorId, "date:", formData.date);
    api
      .get(`/schedule/${doctorId}/slots`, {
        params: { date: formData.date }
      })
      .then((res) => {
        console.log("Slots API response:", res.data);
        const slots = res.data?.slots || res.data?.items || (Array.isArray(res.data) ? res.data : []);
        // Filter only AVAILABLE slots from the database
        const available = Array.isArray(slots) 
          ? slots.filter((slot) => slot.status === "AVAILABLE" || slot.available === true)
          : [];
        console.log("Available slots:", available);
        setAvailableSlots(available);
      })
      .catch((err) => {
        console.error("Failed to load slots:", err);
        console.error("Error details:", {
          doctorId: appointment?.doctorId,
          date: formData.date,
          error: err.response?.data || err.message
        });
        toast.error("Failed to load available slots. Please check doctor's schedule.");
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [appointment?.doctorId, formData.date]);

  const validate = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.timeSlot) newErrors.timeSlot = "Time slot is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!appointment?.id) {
        throw new Error("Appointment ID is missing");
      }
      
      // Build payload - API doesn't accept doctorId in reschedule endpoint
      // Only date, timeSlot, and notes are allowed
      const payload = {
        date: formData.date,
        timeSlot: formData.timeSlot,
        notes: formData.notes || undefined
      };
      
      const url = `/appointments/${appointment.id}/reschedule`;
      console.log("Rescheduling appointment:", { 
        url, 
        payload, 
        appointmentId: appointment.id,
        appointment: appointment
      });
      try {
        const response = await api.put(url, payload);
        console.log("Reschedule success:", response.data);
        return response.data;
      } catch (error) {
        const errorDetails = {
          url,
          payload,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          error: error.message
        };
        console.error("Reschedule error:", errorDetails);
        // Show detailed error to user
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to reschedule appointment";
        console.error("Error message:", errorMsg);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Appointment rescheduled successfully");
      onSuccess();
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to reschedule appointment";
      toast.error(errorMsg);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    rescheduleMutation.mutate();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const currentDate = appointment?.date ? new Date(appointment.date).toLocaleDateString("en-IN") : "N/A";
  const currentTime = appointment?.timeSlot || "N/A";
  const currentDoctor = appointment?.doctor?.user?.name || "N/A";
  const currentDepartment = appointment?.department?.name || "N/A";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-orange-600 to-amber-600">
          <h2 className="text-lg font-semibold text-white">Reschedule Appointment</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition">
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Current Appointment Info */}
          {appointment && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-sm font-medium text-slate-700 mb-2">
                Current Appointment
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span>Date: {currentDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span>Time: {currentTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-slate-400" />
                  <span>Dept: {currentDepartment}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope size={14} className="text-slate-400" />
                  <span>Doctor: {currentDoctor}</span>
                </div>
              </div>
            </div>
          )}

          {/* New Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                errors.date ? "border-red-500" : "border-slate-300"
              }`}
            />
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date}</p>
            )}
          </div>

          {/* New Time Slot */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Time Slot *
            </label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg">
                <Loader2 className="animate-spin text-orange-600" size={16} />
                <span className="text-sm text-slate-600">Loading available slots...</span>
              </div>
            ) : availableSlots.length === 0 && formData.date ? (
              <div className="px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                No available slots for this date. Please select another date.
              </div>
            ) : (
              <SearchableDropdown
                value={formData.timeSlot || ""}
                options={[
                  { value: "", label: "Select Time Slot" },
                  ...availableSlots.map((slot) => ({
                    value: slot.time,
                    label: slot.time
                  }))
                ]}
                onChange={(value) => handleChange("timeSlot", value)}
                placeholder="Select Time Slot"
                disabled={!formData.date || availableSlots.length === 0}
              />
            )}
            {errors.timeSlot && (
              <p className="text-red-500 text-xs mt-1">{errors.timeSlot}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              placeholder="Add any additional notes (e.g., doctor unavailability, patient request)..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={rescheduleMutation.isPending}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {rescheduleMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Rescheduling...
                </>
              ) : (
                "Reschedule"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
