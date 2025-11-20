import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function AddExceptionModal({ doctorId, onClose }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    exceptionDate: "",
    exceptionType: "UNAVAILABLE",
    startTime: "",
    endTime: "",
    reason: ""
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.post("/schedule/exception", {
          doctorId: Number(doctorId),
          ...form
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries(["doctor-exceptions", doctorId]);
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center">
      <div className="card p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">Add Exception</h2>

        <div>
          <label className="text-sm">Date</label>
          <input
            type="date"
            className="input"
            value={form.exceptionDate}
            onChange={(e) => update("exceptionDate", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Type</label>
          <select
            className="select"
            value={form.exceptionType}
            onChange={(e) => update("exceptionType", e.target.value)}>
            <option value="UNAVAILABLE">Unavailable</option>
            <option value="CUSTOM_HOURS">Custom Hours</option>
          </select>
        </div>

        {form.exceptionType === "CUSTOM_HOURS" && (
          <>
            <div>
              <label className="text-sm">Start Time</label>
              <input
                type="time"
                className="input"
                value={form.startTime}
                onChange={(e) => update("startTime", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm">End Time</label>
              <input
                type="time"
                className="input"
                value={form.endTime}
                onChange={(e) => update("endTime", e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label className="text-sm">Reason</label>
          <textarea
            className="input"
            value={form.reason}
            onChange={(e) => update("reason", e.target.value)}
          />
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
