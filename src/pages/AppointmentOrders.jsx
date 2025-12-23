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
    </div>
  );
}
