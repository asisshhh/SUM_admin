import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function AddWeeklyScheduleModal({ doctorId, onClose }) {
  const qc = useQueryClient();

  const [dayOfWeek, setDayOfWeek] = useState("");
  const [templateId, setTemplateId] = useState("");

  const { data: templates } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await api.get("/templates")).data
  });

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.post("/schedule", {
          doctorId: Number(doctorId),
          dayOfWeek: Number(dayOfWeek),
          templateId: Number(templateId)
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries(["doctor-schedules", doctorId]);
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center">
      <div className="card p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">Add Weekly Schedule</h2>

        <div>
          <label className="text-sm">Day of Week</label>
          <select
            className="select"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}>
            <option value="">Choose</option>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Time Slot Template</label>
          <select
            className="select"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Choose</option>
            {templates?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.startTime}–{t.endTime}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-blue-600 text-white"
            onClick={() => save.mutate()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
