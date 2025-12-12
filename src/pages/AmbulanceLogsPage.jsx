import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import { FileText, Search, Calendar } from "lucide-react";
import { Pagination } from "../components/shared";

// Debounce hook
function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function AmbulanceLogsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    pageSize: 20,
    ambulanceId: "",
    bookingId: "",
    action: "",
    from: "",
    to: ""
  });

  // Fetch logs
  const { data, isLoading } = useQuery({
    queryKey: ["ambulance-logs", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "")
      );
      return (await api.get("/ambulance-logs", { params })).data;
    }
  });

  const items = data?.items || [];
  const total = data?.total || 0;

  // Handlers
  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => {
    setFilters((f) => ({ ...f, page }));
  }, []);

  const actionColors = {
    DISPATCHED: "bg-blue-100 text-blue-700",
    ARRIVED: "bg-green-100 text-green-700",
    STARTED: "bg-yellow-100 text-yellow-700",
    COMPLETED: "bg-purple-100 text-purple-700",
    MAINTENANCE: "bg-orange-100 text-orange-700",
    FUEL_REFILL: "bg-cyan-100 text-cyan-700"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            Ambulance Logs
          </h1>
          <p className="text-slate-500 mt-1">
            View ambulance activity logs and history
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            name="ambulanceId"
            placeholder="Ambulance ID"
            value={filters.ambulanceId}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            name="bookingId"
            placeholder="Booking ID"
            value={filters.bookingId}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Actions</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="ARRIVED">Arrived</option>
            <option value="STARTED">Started</option>
            <option value="COMPLETED">Completed</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="FUEL_REFILL">Fuel Refill</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              name="from"
              value={filters.from}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              name="to"
              value={filters.to}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Ambulance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Booking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                      Odometer
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-800">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">
                          {item.ambulance?.vehicleNumber || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.ambulance?.ambulanceType?.name ||
                            item.ambulance?.ambulanceType?.code ||
                            ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.bookingId ? (
                          <div className="font-medium text-blue-600">
                            #{item.bookingId}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            actionColors[item.action] ||
                            "bg-gray-100 text-gray-700"
                          }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 max-w-md">
                          {item.description || "-"}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-slate-500 mt-1 italic">
                            Note: {item.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {item.location || "-"}
                        </div>
                        {item.latitude && item.longitude && (
                          <div className="text-xs text-slate-500">
                            {item.latitude.toFixed(4)},{" "}
                            {item.longitude.toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">
                          {item.odometerReading
                            ? `${item.odometerReading.toLocaleString()} km`
                            : "-"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="border-t border-slate-200 p-4 bg-slate-50/50">
                <Pagination
                  page={filters.page}
                  total={total}
                  pageSize={filters.pageSize}
                  onPage={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
