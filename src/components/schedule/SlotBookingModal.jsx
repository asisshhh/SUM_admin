// frontend/src/components/schedule/SlotBookingModal.jsx
import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";

export default function SlotBookingModal({ defaultData, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    doctorId: defaultData?.doctorId || "",
    date: defaultData?.date || "",
    time: defaultData?.time || "",
    patientId: "",
    departmentId: "",
    notes: ""
  });
  useEffect(() => setForm((f) => ({ ...f, ...defaultData })), [defaultData]);

  const book = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/schedule/${form.doctorId}/book-slot`, {
          date: form.date,
          time: form.time,
          patientId: Number(form.patientId),
          departmentId: form.departmentId
            ? Number(form.departmentId)
            : undefined,
          notes: form.notes
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doctor-schedules"] });
      qc.invalidateQueries({ queryKey: ["doctor", form.doctorId] });
      qc.invalidateQueries({ queryKey: ["ambulance-bookings"] });
      onClose();
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || "Booking failed";
      alert(msg);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
      <div className="card p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Book Slot</h2>

        <div>
          <div className="text-sm">Doctor</div>
          <div className="font-medium">{form.doctorId}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Date</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            {form.date && (
              <div className="text-xs text-slate-500 mt-1">
                {new Date(form.date + "T00:00:00").toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric"
                })}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm">Time</label>
            <input
              type="time"
              className="input"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
            {form.time && (
              <div className="text-xs text-slate-500 mt-1">
                {new Date(`2000-01-01T${form.time}:00`).toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                  }
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm">Patient ID</label>
          <input
            className="input"
            value={form.patientId}
            onChange={(e) => setForm({ ...form, patientId: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm">Notes</label>
          <textarea
            className="input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn bg-blue-600 text-white"
            onClick={() => book.mutate()}
            disabled={book.isLoading}>
            {book.isLoading ? "Booking..." : "Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
