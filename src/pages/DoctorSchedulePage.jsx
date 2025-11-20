import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";

import AddWeeklyScheduleModal from "../components/schedule/AddWeeklyScheduleModal";
import AddExceptionModal from "../components/schedule/AddExceptionModal";
import SlotPreview from "../components/schedule/SlotPreview";

export default function DoctorSchedulePage() {
  const qc = useQueryClient();

  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [showAddWeeklyModal, setShowAddWeeklyModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ["doctors-list"],
    queryFn: async () =>
      (await api.get("/doctors", { params: { pageSize: 500 } })).data.items
  });

  // Fetch weekly schedules
  const { data: schedules } = useQuery({
    queryKey: ["doctor-schedules", selectedDoctor],
    enabled: !!selectedDoctor,
    queryFn: async () => (await api.get(`/schedule/${selectedDoctor}`)).data
  });

  // Fetch exceptions
  const { data: exceptions } = useQuery({
    queryKey: ["doctor-exceptions", selectedDoctor],
    enabled: !!selectedDoctor,
    queryFn: async () =>
      (await api.get(`/schedule/${selectedDoctor}/exceptions`)).data
  });

  // Delete schedule
  const deleteSchedule = useMutation({
    mutationFn: async (id) => await api.delete(`/schedule/${id}`),
    onSuccess: () => qc.invalidateQueries(["doctor-schedules", selectedDoctor])
  });

  // Delete exception
  const deleteException = useMutation({
    mutationFn: async (id) => await api.delete(`/schedule/exception/${id}`),
    onSuccess: () => qc.invalidateQueries(["doctor-exceptions", selectedDoctor])
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Doctor Schedule Management</h1>

      {/* Select doctor */}
      <div className="card p-4">
        <label className="text-sm">Select Doctor</label>
        <select
          className="select mt-1"
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}>
          <option value="">Choose</option>
          {doctors?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.user.name} — {d.specialization}
            </option>
          ))}
        </select>
      </div>

      {selectedDoctor && (
        <>
          {/* Weekly schedule list */}
          <div className="card p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Weekly Availability</h2>
              <button
                className="btn bg-blue-600 text-white"
                onClick={() => setShowAddWeeklyModal(true)}>
                + Add Weekly Schedule
              </button>
            </div>

            {schedules?.length === 0 && (
              <p className="text-slate-500 mt-3">No schedules added.</p>
            )}

            <ul className="mt-3 space-y-3">
              {schedules?.map((s) => (
                <li
                  key={s.id}
                  className="border p-3 rounded flex justify-between">
                  <div>
                    <div className="font-medium">
                      {
                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                          s.dayOfWeek
                        ]
                      }
                    </div>
                    <div className="text-sm text-slate-600">
                      {s.template.startTime} - {s.template.endTime}
                      (Slot: {s.template.slotDuration} mins)
                    </div>
                  </div>

                  <button
                    className="btn bg-red-600 text-white"
                    onClick={() => deleteSchedule.mutate(s.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Exceptions */}
          <div className="card p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Schedule Exceptions</h2>
              <button
                className="btn bg-blue-600 text-white"
                onClick={() => setShowExceptionModal(true)}>
                + Add Exception
              </button>
            </div>

            {exceptions?.length === 0 && (
              <p className="text-slate-500 mt-3">No exceptions added.</p>
            )}

            <ul className="mt-3 space-y-3">
              {exceptions?.map((e) => (
                <li
                  key={e.id}
                  className="border p-3 rounded flex justify-between">
                  <div>
                    <div className="font-medium">
                      {new Date(e.exceptionDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm">
                      Type: {e.exceptionType}
                      {e.startTime && ` • ${e.startTime} - ${e.endTime}`}
                    </div>
                    <div className="text-xs text-slate-600">{e.reason}</div>
                  </div>

                  <button
                    className="btn bg-red-600 text-white"
                    onClick={() => deleteException.mutate(e.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Slot Preview */}
          <SlotPreview doctorId={selectedDoctor} />
        </>
      )}

      {showAddWeeklyModal && (
        <AddWeeklyScheduleModal
          doctorId={selectedDoctor}
          onClose={() => setShowAddWeeklyModal(false)}
        />
      )}

      {showExceptionModal && (
        <AddExceptionModal
          doctorId={selectedDoctor}
          onClose={() => setShowExceptionModal(false)}
        />
      )}
    </div>
  );
}
