// OrdersPage.jsx — Unified Orders Dashboard with Tabs (Shows Today's Orders by Default)
import React, { useEffect, useState, useRef } from "react";
import api from "../api/client";
import SearchBar from "../components/SearchBar";
import OrderDetailsModal from "../components/OrderDetailsModal";
import { printReceipt } from "../components/ReceiptPrint";
import io from "socket.io-client";
import {
  Calendar,
  Stethoscope,
  Ambulance,
  Package,
  FlaskConical,
  Home,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer
} from "lucide-react";

const DEFAULT_LIMIT = 20;

// Order type configuration
const ORDER_TYPES = [
  {
    key: "appointments",
    label: "Appointments",
    icon: Stethoscope,
    color: "purple"
  },
  { key: "ambulance", label: "Ambulance", icon: Ambulance, color: "red" },
  { key: "packages", label: "Health Packages", icon: Package, color: "emerald" },
  { key: "lab", label: "Lab Tests", icon: FlaskConical, color: "blue" },
  { key: "homecare", label: "Home Healthcare", icon: Home, color: "orange" }
];

// Status options per type
const STATUS_OPTIONS = {
  appointments: [
    "PENDING",
    "CONFIRMED",
    "IN_QUEUE",
    "COMPLETED",
    "CANCELLED",
    "SKIPPED"
  ],
  ambulance: ["REQUESTED", "ASSIGNED", "EN_ROUTE", "COMPLETED", "CANCELLED"],
  packages: ["PENDING", "CONFIRMED", "SAMPLE_COLLECTED", "COMPLETED", "CANCELLED"],
  lab: ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"],
  homecare: ["REQUESTED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
};

export default function OrdersPage() {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Active tab
  const [activeType, setActiveType] = useState("appointments");

  // Date filters - default to today
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // Other filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [doctor, setDoctor] = useState("");

  // Dropdown data
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Table data + pagination
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Socket instance
  const [socketInstance, setSocketInstance] = useState(null);

  // Load orders
  const load = async (p = 1, type = activeType) => {
    setLoading(true);
    try {
      const params = {
        type,
        page: p,
        limit,
        search: search || undefined,
        status: status || undefined,
        from: fromDate || undefined,
        to: toDate || undefined
      };

      // Add department and doctor filters only for appointments
      if (type === "appointments") {
        if (doctor) params.doctorId = doctor;
        if (department) params.departmentId = department;
      }

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
  };

  // Initial load
  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search + filter changes
  const searchRef = useRef(null);
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => load(1), 420);
    return () => clearTimeout(searchRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, department, doctor, fromDate, toDate, activeType]);

  // Load departments (for appointments filter)
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
    const token = localStorage.getItem("token");
    const s = io(import.meta.env.VITE_SOCKET_URL, { auth: { token } });
    setSocketInstance(s);

    const refresh = () => load(1);
    s.on("queueUpdatedForAllDoctors", refresh);
    s.on("queueUpdated", refresh);

    return () => s.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle tab change
  const handleTabChange = (type) => {
    setActiveType(type);
    setStatus("");
    setPage(1);
    // Keep date filters but reset other filters
    setSearch("");
    setDepartment("");
    setDoctor("");
  };

  // Reset all filters
  const handleResetAll = () => {
    setSearch("");
    setStatus("");
    setDepartment("");
    setDoctor("");
    setFromDate(today);
    setToDate(today);
    setPage(1);
    load(1);
  };

  // Handle modal update
  const handleUpdated = async () => {
    const fresh = await load(page);
    const updatedRow = fresh.find((x) => x.id === selectedOrder?.id);
    if (updatedRow) setSelectedOrder(updatedRow);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      IN_QUEUE: "bg-purple-100 text-purple-800",
      COMPLETED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
      SKIPPED: "bg-orange-100 text-orange-800",
      REQUESTED: "bg-yellow-100 text-yellow-800",
      ASSIGNED: "bg-blue-100 text-blue-800",
      EN_ROUTE: "bg-indigo-100 text-indigo-800",
      IN_PROGRESS: "bg-purple-100 text-purple-800",
      SAMPLE_COLLECTED: "bg-cyan-100 text-cyan-800",
      PROCESSING: "bg-amber-100 text-amber-800"
    };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  // Render table based on order type
  const renderTable = () => {
    switch (activeType) {
      case "appointments":
        return (
          <table className="w-full text-left divide-y">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-sm font-semibold text-slate-600">#</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Patient</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Phone</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Doctor</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Department</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Date</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Slot</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Amount</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm">{(page - 1) * limit + i + 1}</td>
                  <td className="p-3 text-sm font-medium">{r.patient?.name || "-"}</td>
                  <td className="p-3 text-sm">{r.patient?.phone || "-"}</td>
                  <td className="p-3 text-sm">{r.doctor?.user?.name || "-"}</td>
                  <td className="p-3 text-sm">{r.department?.name || "-"}</td>
                  <td className="p-3 text-sm">{r.date?.split("T")[0] || "-"}</td>
                  <td className="p-3 text-sm">{r.timeSlot || "-"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm font-medium">
                    ₹{r.paymentAmount ?? r.billing?.amount ?? r.doctor?.consultationFee ?? "-"}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        onClick={() => {
                          setSelectedOrder(r);
                          setDetailsOpen(true);
                        }}
                        title="View Details">
                        <Eye size={16} />
                      </button>
                      <button
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                        onClick={() => printReceipt(r)}
                        title="Print Receipt">
                        <Printer size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "ambulance":
        return (
          <table className="w-full text-left divide-y">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-sm font-semibold text-slate-600">#</th>
                <th className="p-3 text-sm font-semibold text-slate-600">User</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Phone</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Pickup</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Destination</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Emergency</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Date</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm">{(page - 1) * limit + i + 1}</td>
                  <td className="p-3 text-sm font-medium">{r.user?.name || "-"}</td>
                  <td className="p-3 text-sm">{r.user?.phone || "-"}</td>
                  <td className="p-3 text-sm max-w-[150px] truncate" title={r.pickupAddress}>
                    {r.pickupAddress || "-"}
                  </td>
                  <td className="p-3 text-sm max-w-[150px] truncate" title={r.destination}>
                    {r.destination || "-"}
                  </td>
                  <td className="p-3">
                    {r.emergency ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Yes</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">No</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{r.createdAt?.split("T")[0] || "-"}</td>
                  <td className="p-3">
                    <button
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      onClick={() => {
                        setSelectedOrder({ ...r, orderType: "ambulance" });
                        setDetailsOpen(true);
                      }}
                      title="View Details">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "packages":
        return (
          <table className="w-full text-left divide-y">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-sm font-semibold text-slate-600">#</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Order No</th>
                <th className="p-3 text-sm font-semibold text-slate-600">User</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Phone</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Package</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Amount</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Date</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm">{(page - 1) * limit + i + 1}</td>
                  <td className="p-3 text-sm font-mono">{r.orderNumber || "-"}</td>
                  <td className="p-3 text-sm font-medium">{r.user?.name || "-"}</td>
                  <td className="p-3 text-sm">{r.user?.phone || "-"}</td>
                  <td className="p-3 text-sm">{r.package?.name || "-"}</td>
                  <td className="p-3 text-sm font-medium">₹{r.totalAmount || r.paymentAmount || "-"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{r.createdAt?.split("T")[0] || "-"}</td>
                  <td className="p-3">
                    <button
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      onClick={() => {
                        setSelectedOrder({ ...r, orderType: "packages" });
                        setDetailsOpen(true);
                      }}
                      title="View Details">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "lab":
        return (
          <table className="w-full text-left divide-y">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-sm font-semibold text-slate-600">#</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Patient</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Phone</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Test Name</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Doctor</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Date</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm">{(page - 1) * limit + i + 1}</td>
                  <td className="p-3 text-sm font-medium">{r.patient?.name || "-"}</td>
                  <td className="p-3 text-sm">{r.patient?.phone || "-"}</td>
                  <td className="p-3 text-sm">{r.testName || "-"}</td>
                  <td className="p-3 text-sm">{r.appointment?.doctor?.user?.name || "-"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{r.createdAt?.split("T")[0] || "-"}</td>
                  <td className="p-3">
                    <button
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      onClick={() => {
                        setSelectedOrder({ ...r, orderType: "lab" });
                        setDetailsOpen(true);
                      }}
                      title="View Details">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case "homecare":
        return (
          <table className="w-full text-left divide-y">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-sm font-semibold text-slate-600">#</th>
                <th className="p-3 text-sm font-semibold text-slate-600">User</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Phone</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Service</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Scheduled Date</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Time Slot</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-3 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm">{(page - 1) * limit + i + 1}</td>
                  <td className="p-3 text-sm font-medium">{r.user?.name || "-"}</td>
                  <td className="p-3 text-sm">{r.user?.phone || "-"}</td>
                  <td className="p-3 text-sm">{r.service?.name || "-"}</td>
                  <td className="p-3 text-sm">{r.scheduledDate?.split("T")[0] || "-"}</td>
                  <td className="p-3 text-sm">{r.timeSlot || "-"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      onClick={() => {
                        setSelectedOrder({ ...r, orderType: "homecare" });
                        setDetailsOpen(true);
                      }}
                      title="View Details">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  const activeConfig = ORDER_TYPES.find((t) => t.key === activeType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Orders Management</h1>
            <p className="text-slate-500 mt-1">
              View and manage all orders across different services
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
              <Calendar size={18} className="text-slate-500" />
              <span className="text-sm text-slate-600">
                {fromDate === today && toDate === today
                  ? "Today's Orders"
                  : `${fromDate || "All"} - ${toDate || "All"}`}
              </span>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 rounded-xl shadow-sm border border-slate-200 transition"
              onClick={() => load(page)}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {ORDER_TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = activeType === type.key;
            return (
              <button
                key={type.key}
                onClick={() => handleTabChange(type.key)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? `bg-${type.color}-600 text-white shadow-lg shadow-${type.color}-200`
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor:
                          type.color === "purple"
                            ? "#9333ea"
                            : type.color === "red"
                            ? "#dc2626"
                            : type.color === "emerald"
                            ? "#059669"
                            : type.color === "blue"
                            ? "#2563eb"
                            : "#ea580c"
                      }
                    : {}
                }>
                <Icon size={18} />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-slate-500" />
            <h3 className="font-semibold text-slate-800">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm text-slate-600 mb-1.5 font-medium">
                Search
              </label>
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by name, phone or ID..."
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm text-slate-600 mb-1.5 font-medium">
                Status
              </label>
              <select
                className="w-full border border-slate-200 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={status}
                onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Status</option>
                {(STATUS_OPTIONS[activeType] || []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm text-slate-600 mb-1.5 font-medium">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm text-slate-600 mb-1.5 font-medium">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                className="w-full px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition font-medium"
                onClick={handleResetAll}>
                Reset All
              </button>
            </div>
          </div>

          {/* Department & Doctor filters (only for appointments) */}
          {activeType === "appointments" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block text-sm text-slate-600 mb-1.5 font-medium">
                  Department
                </label>
                <select
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setDoctor("");
                  }}>
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1.5 font-medium">
                  Doctor
                </label>
                <select
                  className="w-full border border-slate-200 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  value={doctor}
                  disabled={!department}
                  onChange={(e) => setDoctor(e.target.value)}>
                  <option value="">All Doctors</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.user?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <div className="text-sm text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{rows.length}</span> of{" "}
                  <span className="font-semibold text-slate-700">{total}</span> orders
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw size={32} className="animate-spin text-blue-600" />
                  <span className="text-slate-500">Loading orders...</span>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  {activeConfig && <activeConfig.icon size={28} className="text-slate-400" />}
                </div>
                <h3 className="text-lg font-semibold text-slate-700">No orders found</h3>
                <p className="text-slate-500 mt-1">
                  Try adjusting your filters or date range
                </p>
              </div>
            ) : (
              renderTable()
            )}
          </div>

          {/* Pagination */}
          {rows.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold">
                  {(page - 1) * limit + 1} - {Math.min(page * limit, total)}
                </span>{" "}
                of <span className="font-semibold">{total}</span> orders
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}>
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(total / limit)) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        className={`w-9 h-9 rounded-lg font-medium transition ${
                          page === pageNum
                            ? "bg-blue-600 text-white"
                            : "hover:bg-slate-100 text-slate-600"
                        }`}
                        onClick={() => load(pageNum)}>
                        {pageNum}
                      </button>
                    );
                  })}
                  {Math.ceil(total / limit) > 5 && (
                    <span className="px-2 text-slate-400">...</span>
                  )}
                </div>

                <button
                  className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={page * limit >= total}
                  onClick={() => load(page + 1)}>
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {activeType === "appointments" && (
        <OrderDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          data={selectedOrder}
          socket={socketInstance}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
