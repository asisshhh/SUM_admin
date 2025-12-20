// OrdersPage.jsx — Unified Premium Orders Dashboard with Tabs
// Shows Appointments, Packages, and Lab Orders in one place
import React, { useEffect, useState, useRef, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useConfirm } from "../contexts/ConfirmContext";
import api from "../api/client";
import useDateRange from "../hooks/useDateRange";
import OrderDetailsModal from "../components/OrderDetailsModal";
import LabOrderViewModal from "../components/orders/LabOrderViewModal";
import PackageOrderViewModal from "../components/orders/PackageOrderViewModal";
import PaymentModal from "../components/health-package/PaymentModal";
import { printReceipt } from "../components/ReceiptPrint";
import Socket from "../utils/SocketManager";
import {
  Calendar,
  Stethoscope,
  Package,
  FlaskConical,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Printer,
  CreditCard,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Timer,
  XCircle,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { SearchableDropdown } from "../components/shared";

const DEFAULT_LIMIT = 20;

// Order type configuration - focused on 3 main types
const ORDER_TYPES = [
  {
    key: "appointments",
    label: "Appointments",
    icon: Stethoscope,
    color: "violet",
    gradient: "from-violet-500 to-purple-600"
  },
  {
    key: "packages",
    label: "Health Packages",
    icon: Package,
    color: "emerald",
    gradient: "from-emerald-500 to-teal-600"
  },
  {
    key: "lab",
    label: "Lab Tests",
    icon: FlaskConical,
    color: "blue",
    gradient: "from-blue-500 to-indigo-600"
  }
];

// Status options per type
const STATUS_OPTIONS = {
  appointments: [
    { value: "", label: "All Status" },
    { value: "PENDING", label: "Pending" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "IN_QUEUE", label: "In Queue" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" }
  ],
  packages: [
    { value: "", label: "All Status" },
    { value: "PENDING", label: "Pending" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" }
  ],
  lab: [
    { value: "", label: "All Status" },
    { value: "PENDING", label: "Pending" },
    { value: "PROCESSING", label: "Processing" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" }
  ]
};

// Status badge component
function StatusBadge({ status }) {
  const config = {
    PENDING: { color: "amber", icon: Timer },
    CONFIRMED: { color: "blue", icon: CheckCircle2 },
    IN_QUEUE: { color: "violet", icon: Users },
    COMPLETED: { color: "emerald", icon: CheckCircle2 },
    CANCELLED: { color: "red", icon: XCircle },
    PROCESSING: { color: "cyan", icon: Clock },
    SKIPPED: { color: "orange", icon: AlertCircle }
  }[status] || { color: "slate", icon: AlertCircle };

  const colors = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200"
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        colors[config.color]
      }`}>
      <Icon size={12} />
      {status}
    </span>
  );
}

// Payment badge component
function PaymentBadge({ status, amount }) {
  const isPaid = status === "SUCCESS" || status === "PAID";
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
        isPaid
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
      }`}>
      {isPaid ? <CheckCircle2 size={14} /> : <Clock size={14} />}₹
      {amount ?? "-"}
    </div>
  );
}

export default function OrdersPage() {
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

  const [activeType, setActiveType] = useState("appointments");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [genLoading, setGenLoading] = useState(false);

  // View modals for lab and package orders
  const [viewingLabOrder, setViewingLabOrder] = useState(null);
  const [viewingPackageOrder, setViewingPackageOrder] = useState(null);

  const [socketInstance, setSocketInstance] = useState(null);
  const searchRef = useRef(null);
  const confirm = useConfirm();

  // ═══════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════

  const load = useCallback(
    async (p = 1, type = activeType) => {
      setLoading(true);
      try {
        const params = {
          type,
          page: p,
          limit,
          search: search || undefined,
          status: status || undefined,
          ...buildDateParams()
        };

        if (type === "appointments") {
          if (doctor) params.doctorId = doctor;
          if (department) params.departmentId = department;
        }

        const res = await api.get("/orders", { params });
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const totalCount = res.data?.total ?? res.data?.count ?? data.length;
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
    [activeType, search, status, department, doctor, limit, buildDateParams]
  );

  // ═══════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    load(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(1), 420);
    return () => clearTimeout(searchRef.current);
  }, [
    search,
    status,
    department,
    doctor,
    fromDate,
    toDate,
    includeFuture,
    activeType
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api
      .get("/departments")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        setDepartments(list);
      })
      .catch((err) => console.error("DEPT LOAD ERROR:", err));
  }, []);

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

  const handleTabChange = (type) => {
    setActiveType(type);
    setStatus("");
    setPage(1);
    setSearch("");
    setDepartment("");
    setDoctor("");
  };

  const handleResetAll = () => {
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

  const handleGenerateQueue = async () => {
    if (!confirm("Generate today's queue for ALL doctors?")) return;
    setGenLoading(true);
    try {
      await api.post("/appointment-queue/generate-day-queue", { date: today });
      await load(page);
      toast.success("Queue generated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to generate queue");
    }
    setGenLoading(false);
  };

  const [paymentOrder, setPaymentOrder] = useState(null);

  const handleMarkPaid = (row, orderType) => {
    if (orderType === "packages") {
      // Use payment modal for health packages
      setPaymentOrder({
        ...row,
        orderType: "HEALTH_PACKAGE"
      });
    } else {
      // For appointments, use simple confirm (or can be updated later)
      const ok = confirm(
        `Mark payment for ${
          row.user?.name || row.patient?.name || "this user"
        } as PAID?`
      );
      if (!ok) return;

      api
        .post("/payments/mark-paid", {
          orderType: "APPOINTMENT",
          orderId: row.id,
          amount: row.totalAmount || row.paymentAmount || row.billing?.amount,
          method: "CASH"
        })
        .then(() => {
          toast.success("Payment marked as PAID");
          load(page);
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || "Failed to mark payment");
        });
    }
  };

  const handleModalUpdate = async () => {
    const fresh = await load(page);
    const updatedRow = fresh.find((x) => x.id === selectedOrder?.id);
    if (updatedRow) setSelectedOrder(updatedRow);
  };

  // ═══════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════

  const isShowingToday = fromDate === today && toDate === today;
  const isAllTime = !fromDate && !toDate;
  const activeConfig = ORDER_TYPES.find((t) => t.key === activeType);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeConfig?.gradient} flex items-center justify-center shadow-lg`}>
              {activeConfig && (
                <activeConfig.icon className="text-white" size={28} />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Orders Dashboard
              </h1>
              <p className="text-sm text-slate-500">
                {isShowingToday ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Today's orders • {today}
                  </span>
                ) : (
                  "Manage all orders across services"
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeType === "appointments" && (
              <button
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-violet-200 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                onClick={handleGenerateQueue}
                disabled={genLoading}>
                <Sparkles size={18} />
                {genLoading ? "Generating..." : "Generate Queue"}
              </button>
            )}
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all"
              onClick={() => load(page)}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TABS
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex gap-3">
          {ORDER_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = activeType === type.key;
            return (
              <button
                key={type.key}
                onClick={() => handleTabChange(type.key)}
                className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-medium transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${type.gradient} text-white shadow-lg`
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm"
                }`}>
                <Icon size={20} />
                <span>{type.label}</span>
                {isActive && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            FILTERS
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative">
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
                  <p className="text-xs text-slate-500">Refine your search</p>
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
                  onClick={handleResetAll}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
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
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, phone, or ID..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <SearchableDropdown
                label="Status"
                value={status || ""}
                options={STATUS_OPTIONS[activeType] || []}
                onChange={(value) => setStatus(value)}
                placeholder="All Status"
                className=""
              />

              {/* Department (appointments only) */}
              {activeType === "appointments" && (
                <SearchableDropdown
                  label="Department"
                  value={department || ""}
                  options={[
                    { value: "", label: "All Departments" },
                    ...departments.map((d) => ({
                      value: String(d.id),
                      label: d.name
                    }))
                  ]}
                  onChange={(value) => {
                    setDepartment(value);
                    setDoctor("");
                  }}
                  placeholder="All Departments"
                  className=""
                />
              )}

              {/* Doctor (appointments only) */}
              {activeType === "appointments" && (
                <SearchableDropdown
                  label="Doctor"
                  value={doctor || ""}
                  options={[
                    { value: "", label: "All Doctors" },
                    ...doctors.map((doc) => ({
                      value: String(doc.id),
                      label: doc.user?.name || `Doctor #${doc.id}`
                    }))
                  ]}
                  onChange={(value) => setDoctor(value)}
                  placeholder="All Doctors"
                  disabled={!department}
                  className=""
                />
              )}
            </div>

            {/* Date Range */}
            <div className="mt-6 pt-6 border-t border-slate-200/60">
              <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Calendar size={12} className="inline mr-1" />
                    Date Range
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                    />
                    <span className="text-slate-400 font-medium">to</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                    />
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
                    <span className="text-sm text-slate-600">
                      Include future
                    </span>
                  </label>

                  <div className="h-8 w-px bg-slate-200" />

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">Showing</span>
                    <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg font-semibold">
                      {rows.length}
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

        {/* ═══════════════════════════════════════════════════════════════════
            TABLE
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-100 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">
                {activeConfig?.label} Records
              </h3>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-violet-600">
                  <RefreshCw size={14} className="animate-spin" />
                  Loading...
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {rows.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeConfig?.gradient} flex items-center justify-center mb-4 opacity-50`}>
                  {activeConfig && (
                    <activeConfig.icon size={28} className="text-white" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-700">
                  No orders found
                </h3>
                <p className="text-slate-500 mt-1">
                  Try adjusting your filters or date range
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">{renderTableHeaders()}</tr>
                </thead>
                <tbody>{renderTableRows()}</tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {rows.length > 0 && (
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Page{" "}
                  <span className="font-semibold text-slate-700">{page}</span> •
                  Showing{" "}
                  <span className="font-semibold text-slate-700">
                    {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-700">{total}</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                    disabled={page <= 1}
                    onClick={() => load(page - 1)}>
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(5, Math.ceil(total / limit)) },
                      (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => load(i + 1)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                            page === i + 1
                              ? "bg-violet-600 text-white shadow-md"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}>
                          {i + 1}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
                    disabled={page * limit >= total}
                    onClick={() => load(page + 1)}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Details Modal */}
      {activeType === "appointments" && (
        <OrderDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          data={selectedOrder}
          socket={socketInstance}
          onUpdated={handleModalUpdate}
        />
      )}

      {/* Lab Order View Modal */}
      {viewingLabOrder && (
        <LabOrderViewModal
          order={viewingLabOrder}
          onClose={() => setViewingLabOrder(null)}
        />
      )}

      {/* Package Order View Modal */}
      {viewingPackageOrder && (
        <PackageOrderViewModal
          order={viewingPackageOrder}
          onClose={() => setViewingPackageOrder(null)}
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

  // ═══════════════════════════════════════════════════════════════════
  // TABLE RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════

  function renderTableHeaders() {
    const headers = {
      appointments: [
        "#",
        "Patient",
        "Doctor",
        "Schedule",
        "Status",
        "Amount",
        "Actions"
      ],
      packages: [
        "#",
        "Customer",
        "Package",
        "Schedule",
        "Status",
        "Payment",
        "Actions"
      ],
      lab: ["#", "Patient", "Test Details", "Schedule", "Status", "Actions"]
    };

    return (headers[activeType] || []).map((h) => (
      <th
        key={h}
        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {h}
      </th>
    ));
  }

  function renderTableRows() {
    return rows.map((r, i) => {
      const index = (page - 1) * limit + i + 1;
      const gradient =
        activeConfig?.gradient || "from-violet-500 to-purple-600";

      if (activeType === "appointments") {
        return (
          <tr
            key={r.id}
            className="hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-transparent transition-all border-b border-slate-100">
            <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">
              #{index}
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                  {r.patient?.name?.[0] || "?"}
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {r.patient?.name || "-"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.patient?.phone || "-"}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3.5">
              <p className="font-medium text-slate-700 text-sm">
                {r.doctor?.user?.name || "-"}
              </p>
              <p className="text-xs text-slate-500">
                {r.department?.name || "-"}
              </p>
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-sm text-slate-700">
                  {r.date?.split("T")[0] || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock size={14} className="text-slate-400" />
                <span className="text-xs text-slate-500">
                  {r.timeSlot || "-"}
                </span>
              </div>
            </td>
            <td className="px-4 py-3.5">
              <StatusBadge status={r.status} />
            </td>
            <td className="px-4 py-3.5">
              <PaymentBadge
                status={r.paymentStatus}
                amount={
                  r.paymentAmount ??
                  r.billing?.amount ??
                  r.doctor?.consultationFee
                }
              />
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                  onClick={() => {
                    setSelectedOrder(r);
                    setDetailsOpen(true);
                  }}>
                  <Eye size={16} />
                </button>
                <button
                  className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  onClick={() => printReceipt(r)}>
                  <Printer size={16} />
                </button>
                {r.doctorId && (
                  <a
                    href={`/doctor/queue-monitor/${r.doctorId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <Users size={16} />
                  </a>
                )}
              </div>
            </td>
          </tr>
        );
      }

      if (activeType === "packages") {
        return (
          <tr
            key={r.id}
            className="hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-transparent transition-all border-b border-slate-100">
            <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">
              #{index}
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {r.user?.name?.[0] || "?"}
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {r.user?.name || "-"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.user?.phone || "-"}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-emerald-500" />
                <div>
                  <p className="font-medium text-slate-700 text-sm">
                    {r.package?.name || r.packageName || "-"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.orderNumber || `#${r.id}`}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-sm text-slate-700">
                  {r.scheduledDate?.split("T")[0] ||
                    r.createdAt?.split("T")[0] ||
                    "-"}
                </span>
              </div>
            </td>
            <td className="px-4 py-3.5">
              <StatusBadge status={r.status} />
            </td>
            <td className="px-4 py-3.5">
              <PaymentBadge status={r.paymentStatus} amount={r.totalAmount} />
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                  onClick={() => setViewingPackageOrder(r)}
                  title="View Details">
                  <Eye size={16} />
                </button>
                {r.paymentStatus !== "SUCCESS" && r.status !== "CANCELLED" && (
                  <button
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    onClick={() => handleMarkPaid(r, "packages")}>
                    <CreditCard size={16} />
                  </button>
                )}
                {r.paymentStatus === "SUCCESS" && (
                  <span className="p-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </span>
                )}
              </div>
            </td>
          </tr>
        );
      }

      if (activeType === "lab") {
        const patientName = r.patient?.name || r.user?.name || "-";
        const patientPhone = r.patient?.phone || r.user?.phone || "-";
        const testName =
          r.testName || r.items?.map((i) => i.testName).join(", ") || "-";

        return (
          <tr
            key={r.id}
            className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all border-b border-slate-100">
            <td className="px-4 py-3.5 text-sm text-slate-500 font-mono">
              #{index}
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {patientName[0] || "?"}
                </div>
                <div>
                  <p className="font-medium text-slate-800">{patientName}</p>
                  <p className="text-xs text-slate-500">{patientPhone}</p>
                </div>
              </div>
            </td>
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
                </div>
              </div>
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-sm text-slate-700">
                  {r.scheduledDate?.split("T")[0] ||
                    r.createdAt?.split("T")[0] ||
                    "-"}
                </span>
              </div>
            </td>
            <td className="px-4 py-3.5">
              <StatusBadge status={r.status} />
            </td>
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                  onClick={() => setViewingLabOrder(r)}
                  title="View Details">
                  <Eye size={16} />
                </button>
                {r.reportUrl && (
                  <a
                    href={r.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <FileText size={16} />
                  </a>
                )}
                {r.status === "COMPLETED" && (
                  <span className="p-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </span>
                )}
              </div>
            </td>
          </tr>
        );
      }

      return null;
    });
  }
}
