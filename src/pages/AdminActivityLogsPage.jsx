import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Download,
  BarChart3
} from "lucide-react";
import { Pagination } from "../components/shared";
import { toast } from "react-toastify";
import AdminActivityLogDetailsModal from "../components/admin/AdminActivityLogDetailsModal";

export default function AdminActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    method: "",
    entity: "",
    success: "",
    startDate: "",
    endDate: "",
    search: ""
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Fetch activity logs
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-activity-logs", page, pageSize, filters],
    queryFn: async () => {
      const params = {
        page,
        pageSize,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== "")
        )
      };
      return (await api.get("/activity-logs", { params })).data;
    }
  });

  // Fetch statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-activity-logs-stats"],
    queryFn: async () => (await api.get("/activity-logs/stats")).data,
    enabled: showStats
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      userId: "",
      action: "",
      method: "",
      entity: "",
      success: "",
      startDate: "",
      endDate: "",
      search: ""
    });
    setPage(1);
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800",
      VIEW: "bg-gray-100 text-gray-800"
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: "bg-blue-100 text-blue-800",
      POST: "bg-green-100 text-green-800",
      PUT: "bg-yellow-100 text-yellow-800",
      PATCH: "bg-orange-100 text-orange-800",
      DELETE: "bg-red-100 text-red-800"
    };
    return colors[method] || "bg-gray-100 text-gray-800";
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-6 text-center">
          <p className="text-red-600">Error loading activity logs</p>
          <button onClick={() => refetch()} className="btn mt-4">
            <RefreshCw size={16} className="mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="text-indigo-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold">Admin Activity Logs</h1>
            <p className="text-slate-500 text-sm">
              Track all admin user activities and actions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="btn btn-outline">
            <BarChart3 size={16} className="mr-2" />
            {showStats ? "Hide" : "Show"} Stats
          </button>
          <button onClick={() => refetch()} className="btn btn-outline">
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStats && stats && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Statistics</h2>
          {statsLoading ? (
            <p>Loading stats...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-slate-600">Total Logs</div>
                <div className="text-2xl font-bold">
                  {stats.stats?.totalLogs || 0}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-slate-600">Last 24 Hours</div>
                <div className="text-2xl font-bold">
                  {stats.stats?.logsLast24Hours || 0}
                </div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-slate-600">Last 7 Days</div>
                <div className="text-2xl font-bold">
                  {stats.stats?.logsLast7Days || 0}
                </div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-slate-600">Success Rate</div>
                <div className="text-2xl font-bold">
                  {stats.stats?.successRate || 0}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} />
          <span className="font-semibold">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-slate-600">Search Path</label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search path..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="input !pl-11"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
              className="input">
              <option value="">All Actions</option>
              <option value="VIEW">View</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Method</label>
            <select
              value={filters.method}
              onChange={(e) => handleFilterChange("method", e.target.value)}
              className="input">
              <option value="">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Status</label>
            <select
              value={filters.success}
              onChange={(e) => handleFilterChange("success", e.target.value)}
              className="input">
              <option value="">All Status</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">Entity</label>
            <input
              type="text"
              placeholder="Entity type..."
              value={filters.entity}
              onChange={(e) => handleFilterChange("entity", e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-end">
            <button onClick={clearFilters} className="btn btn-outline w-full">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left text-sm font-semibold">User</th>
                <th className="p-3 text-left text-sm font-semibold">Action</th>
                <th className="p-3 text-left text-sm font-semibold">Method</th>
                <th className="p-3 text-left text-sm font-semibold">Path</th>
                <th className="p-3 text-left text-sm font-semibold">Entity</th>
                <th className="p-3 text-left text-sm font-semibold">Status</th>
                <th className="p-3 text-left text-sm font-semibold">Date</th>
                <th className="p-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                data?.items?.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-slate-50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">
                          {log.user?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {log.user?.email || log.user?.phone || "N/A"}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(
                          log.action
                        )}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getMethodColor(
                          log.method
                        )}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-mono text-slate-700 max-w-xs truncate">
                        {log.path}
                      </div>
                    </td>
                    <td className="p-3">
                      {log.entity ? (
                        <div>
                          <div className="text-sm">{log.entity}</div>
                          {log.entityId && (
                            <div className="text-xs text-slate-500">
                              ID: {log.entityId}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {log.success ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} />
                          <span className="text-sm">{log.statusCode}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle size={16} />
                          <span className="text-sm">{log.statusCode}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {(() => {
                        if (!log.createdAt) {
                          return (
                            <span className="text-slate-400 text-sm">-</span>
                          );
                        }
                        try {
                          const date = new Date(log.createdAt);
                          if (isNaN(date.getTime())) {
                            return (
                              <span className="text-slate-400 text-sm">
                                Invalid Date
                              </span>
                            );
                          }
                          return (
                            <>
                              <div className="text-sm font-medium">
                                {date.toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric"
                                })}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {date.toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true
                                })}
                              </div>
                            </>
                          );
                        } catch (error) {
                          console.error(
                            "Date parsing error:",
                            error,
                            log.createdAt
                          );
                          return (
                            <span className="text-slate-400 text-sm">
                              {String(log.createdAt)}
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="btn btn-sm btn-outline">
                        <Eye size={14} className="mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="p-4 border-t">
            <Pagination
              page={page}
              total={data.total}
              pageSize={pageSize}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedLog && (
        <AdminActivityLogDetailsModal
          log={selectedLog}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLog(null);
          }}
        />
      )}
    </div>
  );
}
