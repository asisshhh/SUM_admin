import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function Exceptions({ doctorId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    exceptionDate: "",
    exceptionType: "",
    startTime: "",
    endTime: "",
    reason: ""
  });

  const { data: exceptions } = useQuery({
    queryKey: ["doctor-exceptions", doctorId],
    queryFn: async () => (await api.get(`/doctors/${doctorId}/exceptions`)).data
  });

  const add = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/doctors/${doctorId}/exceptions`, {
          ...form
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-exceptions", doctorId] });
      setForm({
        exceptionDate: "",
        exceptionType: "",
        startTime: "",
        endTime: "",
        reason: ""
      });
    }
  });

  const remove = useMutation({
    mutationFn: async (exId) =>
      (await api.delete(`/doctors/${doctorId}/exceptions/${exId}`)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["doctor-exceptions", doctorId] })
  });

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-xl">Exceptions</h2>

      <div className="card p-4 space-y-3">
        <label className="text-sm">Date</label>
        <input
          type="date"
          className="input"
          value={form.exceptionDate}
          onChange={(e) => setForm({ ...form, exceptionDate: e.target.value })}
        />

        <label className="text-sm">Type</label>
        <select
          className="select"
          value={form.exceptionType}
          onChange={(e) => setForm({ ...form, exceptionType: e.target.value })}>
          <option value="">Select</option>
          <option value="UNAVAILABLE">UNAVAILABLE</option>
          <option value="CUSTOM_HOURS">CUSTOM HOURS</option>
        </select>

        {form.exceptionType === "CUSTOM_HOURS" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Start</label>
              <input
                type="time"
                className="input"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm">End</label>
              <input
                type="time"
                className="input"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>
        )}

        <label className="text-sm">Reason</label>
        <input
          className="input"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />

        <button
          className="btn bg-slate-900 text-white"
          disabled={!form.exceptionDate || !form.exceptionType}
          onClick={() => add.mutate()}>
          Add Exception
        </button>
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Hours</th>
              <th className="p-3 text-left">Reason</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exceptions?.map((ex) => (
              <tr key={ex.id} className="border-t">
                <td className="p-3">
                  {new Date(ex.exceptionDate).toISOString().slice(0, 10)}
                </td>
                <td className="p-3">{ex.exceptionType}</td>
                <td className="p-3">
                  {ex.startTime || ""} {ex.endTime ? `→ ${ex.endTime}` : ""}
                </td>
                <td className="p-3">{ex.reason || "—"}</td>
                <td className="p-3">
                  <button className="btn" onClick={() => remove.mutate(ex.id)}>
                    ❌ Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
