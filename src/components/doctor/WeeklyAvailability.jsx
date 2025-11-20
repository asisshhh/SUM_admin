import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeeklyAvailability({ doctorId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ dayOfWeek: "", templateId: "" });

  const { data: templates } = useQuery({
    queryKey: ["slot-templates"],
    queryFn: async () => (await api.get("/time-slot-templates")).data
  });

  const { data: schedules } = useQuery({
    queryKey: ["doctor-schedules", doctorId],
    queryFn: async () => (await api.get(`/doctors/${doctorId}/schedules`)).data
  });

  const add = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/doctors/${doctorId}/schedules`, {
          dayOfWeek: Number(form.dayOfWeek),
          templateId: Number(form.templateId),
          active: true
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-schedules", doctorId] });
      setForm({ dayOfWeek: "", templateId: "" });
    }
  });

  const remove = useMutation({
    mutationFn: async (scheduleId) =>
      (await api.delete(`/doctors/${doctorId}/schedules/${scheduleId}`)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["doctor-schedules", doctorId] })
  });

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">Weekly Availability</h2>

      {/* ADD */}
      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-sm">Day</label>
          <select
            className="select"
            value={form.dayOfWeek}
            onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
            <option value="">Select</option>
            {days.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Template</label>
          <select
            className="select"
            value={form.templateId}
            onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
            <option value="">Select</option>
            {templates?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.startTime} - {t.endTime})
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn bg-slate-900 text-white"
          disabled={!form.templateId || form.dayOfWeek === ""}
          onClick={() => add.mutate()}>
          Add
        </button>
      </div>

      {/* TABLE */}
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Day</th>
              <th className="p-3 text-left">Template</th>
              <th className="p-3 text-left">Slot Duration</th>
              <th className="p-3 text-left">Buffer</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules?.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{days[s.dayOfWeek]}</td>
                <td className="p-3">
                  {s.template?.name} ({s.template?.startTime} -{" "}
                  {s.template?.endTime})
                </td>
                <td className="p-3">{s.template?.slotDuration} min</td>
                <td className="p-3">{s.template?.bufferTime} min</td>
                <td className="p-3">
                  <button className="btn" onClick={() => remove.mutate(s.id)}>
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
