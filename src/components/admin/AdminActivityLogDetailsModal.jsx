import React from "react";
import {
  X,
  User,
  Calendar,
  Globe,
  Monitor,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function AdminActivityLogDetailsModal({ log, onClose }) {
  const formatJson = (data) => {
    if (!data) return "N/A";
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Activity Log Details</h2>
            <p className="text-sm text-slate-500">ID: {log.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* User Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User size={18} />
                User Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600">Name</label>
                  <div className="font-medium">
                    {log.user?.name || "Unknown"}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Email</label>
                  <div className="font-medium">{log.user?.email || "N/A"}</div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Phone</label>
                  <div className="font-medium">{log.user?.phone || "N/A"}</div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Role</label>
                  <div className="font-medium">{log.user?.role || "N/A"}</div>
                </div>
              </div>
            </div>

            {/* Request Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Monitor size={18} />
                Request Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600">Action</label>
                  <div className="font-medium">{log.action}</div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">HTTP Method</label>
                  <div className="font-medium">{log.method}</div>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-slate-600">Path</label>
                  <div className="font-mono text-sm bg-slate-50 p-2 rounded">
                    {log.path}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Entity</label>
                  <div className="font-medium">{log.entity || "N/A"}</div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Entity ID</label>
                  <div className="font-medium">{log.entityId || "N/A"}</div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Status Code</label>
                  <div className="font-medium">{log.statusCode}</div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Success</label>
                  <div className="flex items-center gap-2">
                    {log.success ? (
                      <>
                        <CheckCircle size={16} className="text-green-600" />
                        <span className="text-green-600 font-medium">
                          Success
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} className="text-red-600" />
                        <span className="text-red-600 font-medium">Failed</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Request Body */}
            {log.requestBody && (
              <div>
                <h3 className="font-semibold mb-3">Request Body</h3>
                <pre className="bg-slate-50 p-4 rounded text-xs overflow-x-auto">
                  {formatJson(log.requestBody)}
                </pre>
              </div>
            )}

            {/* Query Parameters */}
            {log.queryParams && Object.keys(log.queryParams).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Query Parameters</h3>
                <pre className="bg-slate-50 p-4 rounded text-xs overflow-x-auto">
                  {formatJson(log.queryParams)}
                </pre>
              </div>
            )}

            {/* Response Data */}
            {log.responseData && (
              <div>
                <h3 className="font-semibold mb-3">Response Data</h3>
                <pre className="bg-slate-50 p-4 rounded text-xs overflow-x-auto max-h-64">
                  {formatJson(log.responseData)}
                </pre>
              </div>
            )}

            {/* Network Information */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Globe size={18} />
                Network Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600">IP Address</label>
                  <div className="font-mono text-sm">
                    {log.ipAddress || "N/A"}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600">User Agent</label>
                  <div className="text-sm break-words">
                    {log.userAgent || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar size={18} />
                Timestamp
              </h3>
              <div>
                <div className="text-sm text-slate-600">Date & Time</div>
                <div className="font-medium">
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end">
          <button onClick={onClose} className="btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
