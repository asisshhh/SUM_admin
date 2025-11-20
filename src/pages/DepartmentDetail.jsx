import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import api from "../api/client";

function RangePicker({ value, onChange }) {
  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="text-sm">From</label>
        <input
          type="date"
          className="input"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </div>
      <div>
        <label className="text-sm">To</label>
        <input
          type="date"
          className="input"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  );
}

export default function DepartmentDetail() {
  const { id } = useParams();
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth(), 1);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    };
  });

  const detail = useQuery({
    queryKey: ["dept", id],
    queryFn: async () => (await api.get(`/departments/${id}`)).data
  });

  const stats = useQuery({
    queryKey: ["dept-stats", id, range],
    queryFn: async () =>
      (await api.get(`/departments/${id}/patient-stats`, { params: range }))
        .data
  });

  const series = useQuery({
    queryKey: ["dept-series", id, range],
    queryFn: async () =>
      (await api.get(`/departments/${id}/patient-series`, { params: range }))
        .data
  });

  const doctors = useQuery({
    queryKey: ["dept-doctors", id, range],
    queryFn: async () =>
      (await api.get(`/departments/${id}/doctors`, { params: range })).data
  });

  const chartData = series.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {detail.data?.name || "Department"}
        </h1>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-slate-500 text-sm">Active</div>
          <div className="text-lg font-semibold">
            {detail.data?.active ? "Yes" : "No"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-slate-500 text-sm">Doctors</div>
          <div className="text-lg font-semibold">
            {detail.data?.doctorCount ?? "—"}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-slate-500 text-sm">Lifetime Patients</div>
          <div className="text-2xl font-bold">
            {stats.data?.lifetimeTotal ?? "—"}
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="text-slate-500 text-sm">Patients in Range</div>
            <div className="text-2xl font-bold">
              {stats.data?.countInRange ?? "—"}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-slate-500 text-sm">Range</div>
            <div>
              {range.from} → {range.to}
            </div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card overflow-auto">
        <div className="p-3 font-semibold">Doctors in {detail.data?.name}</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Specialization</th>
              <th className="p-3 text-left">Patients (Range)</th>
              <th className="p-3 text-left">Patients (Total)</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.data?.map((d) => (
              <tr key={d.doctorId} className="border-t">
                <td className="p-3">
                  <Link
                    className="text-blue-600 hover:underline"
                    to={`/doctors/${d.doctorId}`}>
                    {d.name}
                  </Link>
                </td>
                <td className="p-3">{d.specialization || "—"}</td>
                <td className="p-3">{d.countInRange}</td>
                <td className="p-3">{d.lifetimeTotal}</td>
                <td className="p-3">
                  <Link className="btn" to={`/doctors/${d.doctorId}`}>
                    View Doctor
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
