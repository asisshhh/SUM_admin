import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

export default function OrdersPage() {
  const [filters, setFilters] = useState({
    status: "",
    dateFrom: "",
    dateTo: "",
    doctorId: "",
    departmentId: ""
  });

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["appointments", filters],
    queryFn: async () =>
      (await api.get("/appointments", { params: filters })).data
  });

  const onChange = (e) =>
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-sm">Status</label>
          <select className="select" name="status" onChange={onChange}>
            <option value="">All</option>
            {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "SKIPPED"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              )
            )}
          </select>
        </div>
        <div>
          <label className="text-sm">From</label>
          <input
            type="date"
            className="input"
            name="dateFrom"
            onChange={onChange}
          />
        </div>
        <div>
          <label className="text-sm">To</label>
          <input
            type="date"
            className="input"
            name="dateTo"
            onChange={onChange}
          />
        </div>
        <div>
          <label className="text-sm">Doctor ID</label>
          <input className="input" name="doctorId" onChange={onChange} />
        </div>
        <div>
          <label className="text-sm">Department ID</label>
          <input className="input" name="departmentId" onChange={onChange} />
        </div>
        <button
          className="btn bg-slate-900 text-white"
          onClick={() => refetch()}>
          {isFetching ? "Loading..." : "Filter"}
        </button>
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Patient</th>
              <th className="text-left p-3">Doctor</th>
              <th className="text-left p-3">Dept</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Slot</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{new Date(a.date).toLocaleString()}</td>
                <td className="p-3">
                  {a.patient?.name} ({a.patient?.phone})
                </td>
                <td className="p-3">{a.doctor?.user?.name || "—"}</td>
                <td className="p-3">{a.department?.name}</td>
                <td className="p-3">
                  <span className="badge bg-slate-100">{a.status}</span>
                </td>
                <td className="p-3">{a.timeSlot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
